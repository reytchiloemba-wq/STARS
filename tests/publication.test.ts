import { describe, it, expect, vi, beforeEach } from 'vitest';

// Regression coverage for a real bug found during audit: EditorialService.
// publishOrSchedule used to mark every Publication/PublicationTarget as
// PUBLISHED with a fabricated externalPostId (`post-${Date.now()}-...`)
// without ever calling a social connector. These tests pin the fixed
// behavior: PUBLISHED is only ever set after a connector genuinely reports
// success, and a real failure is recorded honestly (FAILED + real message),
// never silently upgraded to success.

interface FakeDraft {
  id: string;
  organizationId: string;
  currentContent: string;
  status: string;
  network: string;
}
interface FakeAccount {
  id: string;
  organizationId: string;
  network: string;
  externalId: string;
  accessTokenEnc: string;
  status: string;
}
interface FakeTarget {
  id: string;
  publicationId: string;
  socialAccountId: string;
  status: string;
  externalPostId: string | null;
  errorMessage: string | null;
  publishedAt: Date | null;
}
// Mirrors Prisma's generated create-input shape: nullable columns are
// optional on create (they default to null at the DB level), unlike the
// full row type above where they're always present once read back.
type FakeTargetCreateInput = Omit<FakeTarget, 'id' | 'externalPostId' | 'errorMessage' | 'publishedAt'> &
  Partial<Pick<FakeTarget, 'externalPostId' | 'errorMessage' | 'publishedAt'>>;
interface FakePublication {
  id: string;
  organizationId: string;
  draftId: string;
  idempotencyKey: string;
  status: string;
}

let drafts: FakeDraft[] = [];
let accounts: FakeAccount[] = [];
let publications: FakePublication[] = [];
let targets: FakeTarget[] = [];
let schedules: Array<Record<string, unknown>> = [];
let nextId = 1;

const connectorPublish = vi.fn();

vi.mock('@/server/adapters/social', () => ({
  getSocialConnector: vi.fn(() => ({ publish: connectorPublish })),
}));

vi.mock('@/lib/crypto', () => ({
  decryptSecret: vi.fn((enc: string) => {
    if (enc === 'undecryptable') throw new Error('bad key');
    return `plaintext(${enc})`;
  }),
}));

vi.mock('@/lib/db', () => ({
  db: {
    draft: {
      findFirst: vi.fn(async ({ where }: { where: { id: string; organizationId: string } }) =>
        drafts.find((d) => d.id === where.id && d.organizationId === where.organizationId) ?? null,
      ),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<FakeDraft> }) => {
        const d = drafts.find((x) => x.id === where.id);
        if (d) Object.assign(d, data);
        return d;
      }),
    },
    socialAccount: {
      findMany: vi.fn(
        async ({ where }: { where: { id: { in: string[] }; organizationId: string; status: string; network: string } }) =>
          accounts.filter(
            (a) =>
              where.id.in.includes(a.id) &&
              a.organizationId === where.organizationId &&
              a.status === where.status &&
              a.network === where.network,
          ),
      ),
    },
    publication: {
      create: vi.fn(async ({ data }: { data: Omit<FakePublication, 'id'> }) => {
        const pub: FakePublication = { id: `pub-${nextId++}`, ...data };
        publications.push(pub);
        return pub;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Partial<FakePublication> }) => {
        const p = publications.find((x) => x.id === where.id);
        if (p) Object.assign(p, data);
        return p;
      }),
      findUniqueOrThrow: vi.fn(async ({ where }: { where: { id: string } }) => {
        const p = publications.find((x) => x.id === where.id);
        if (!p) throw new Error('not found');
        return p;
      }),
    },
    publicationTarget: {
      create: vi.fn(async ({ data }: { data: FakeTargetCreateInput }) => {
        const t: FakeTarget = {
          id: `target-${nextId++}`,
          externalPostId: null,
          errorMessage: null,
          publishedAt: null,
          ...data,
        };
        targets.push(t);
        return t;
      }),
      upsert: vi.fn(
        async ({
          where,
          create,
          update,
        }: {
          where: { publicationId_socialAccountId: { publicationId: string; socialAccountId: string } };
          create: FakeTargetCreateInput;
          update: Partial<FakeTarget>;
        }) => {
          const { publicationId, socialAccountId } = where.publicationId_socialAccountId;
          const existing = targets.find((t) => t.publicationId === publicationId && t.socialAccountId === socialAccountId);
          if (existing) {
            Object.assign(existing, update);
            return existing;
          }
          const t: FakeTarget = {
            id: `target-${nextId++}`,
            externalPostId: null,
            errorMessage: null,
            publishedAt: null,
            ...create,
          };
          targets.push(t);
          return t;
        },
      ),
      findMany: vi.fn(async ({ where }: { where: { publicationId: string } }) =>
        targets.filter((t) => t.publicationId === where.publicationId),
      ),
    },
    schedule: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        schedules.push(data);
        return data;
      }),
    },
  },
}));

const { EditorialService } = await import('@/server/services/editorial.service');

beforeEach(() => {
  drafts = [{ id: 'draft-1', organizationId: 'org-a', currentContent: 'Hello world', status: 'DRAFT', network: 'X' }];
  accounts = [
    { id: 'acc-1', organizationId: 'org-a', network: 'X', externalId: 'ext-1', accessTokenEnc: 'enc-1', status: 'ACTIVE' },
  ];
  publications = [];
  targets = [];
  schedules = [];
  connectorPublish.mockReset();
});

describe('EditorialService.publishOrSchedule — no fabricated success (audit regression)', () => {
  it('CRITICAL: marks PUBLISHED with a REAL externalPostId only when the connector genuinely succeeds', async () => {
    connectorPublish.mockResolvedValue({ success: true, externalPostId: 'real-post-id-123' });

    const pub = await EditorialService.publishOrSchedule({
      organizationId: 'org-a',
      userId: 'user-1',
      draftId: 'draft-1',
      socialAccountIds: ['acc-1'],
    });

    expect(pub.status).toBe('PUBLISHED');
    expect(connectorPublish).toHaveBeenCalledTimes(1);
    expect(targets[0]?.externalPostId).toBe('real-post-id-123');
    expect(targets[0]?.status).toBe('PUBLISHED');
  });

  it('CRITICAL: marks FAILED (not PUBLISHED) when the connector reports failure — no fake post id', async () => {
    connectorPublish.mockResolvedValue({ success: false, errorMessage: 'X a refusé la publication : HTTP 401' });

    const pub = await EditorialService.publishOrSchedule({
      organizationId: 'org-a',
      userId: 'user-1',
      draftId: 'draft-1',
      socialAccountIds: ['acc-1'],
    });

    expect(pub.status).toBe('FAILED');
    expect(targets[0]?.status).toBe('FAILED');
    expect(targets[0]?.externalPostId).toBeNull();
    expect(targets[0]?.errorMessage).toBe('X a refusé la publication : HTTP 401');
    expect(drafts[0]?.status).toBe('FAILED');
  });

  it('never calls the connector for a token that fails to decrypt, and records an honest failure', async () => {
    accounts[0]!.accessTokenEnc = 'undecryptable';

    const pub = await EditorialService.publishOrSchedule({
      organizationId: 'org-a',
      userId: 'user-1',
      draftId: 'draft-1',
      socialAccountIds: ['acc-1'],
    });

    expect(connectorPublish).not.toHaveBeenCalled();
    expect(pub.status).toBe('FAILED');
    expect(targets[0]?.errorMessage).toMatch(/déchiffrer/);
  });

  it('rejects publishing with no active social account selected, rather than fabricating a published state', async () => {
    await expect(
      EditorialService.publishOrSchedule({
        organizationId: 'org-a',
        userId: 'user-1',
        draftId: 'draft-1',
        socialAccountIds: ['does-not-exist'],
      }),
    ).rejects.toThrow(/Aucun compte social actif/);
    expect(publications).toHaveLength(0);
  });

  it('never calls a connector for a future-scheduled publication — it only records the schedule', async () => {
    const pub = await EditorialService.publishOrSchedule({
      organizationId: 'org-a',
      userId: 'user-1',
      draftId: 'draft-1',
      socialAccountIds: ['acc-1'],
      scheduledAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    expect(connectorPublish).not.toHaveBeenCalled();
    expect(pub.status).toBe('SCHEDULED');
    expect(targets[0]?.status).toBe('SCHEDULED');
    expect(targets[0]?.externalPostId).toBeNull();
    expect(schedules).toHaveLength(1);
  });

  it('CRITICAL: a tenant cannot target another tenant\'s social account by id', async () => {
    accounts.push({ id: 'acc-b', organizationId: 'org-b', network: 'X', externalId: 'ext-b', accessTokenEnc: 'enc-b', status: 'ACTIVE' });

    await expect(
      EditorialService.publishOrSchedule({
        organizationId: 'org-a',
        userId: 'user-1',
        draftId: 'draft-1',
        socialAccountIds: ['acc-b'],
      }),
    ).rejects.toThrow(/Aucun compte social actif/);
    expect(connectorPublish).not.toHaveBeenCalled();
  });

  it("CRITICAL: never delivers to an account on a different network than the draft's own — a tenant choosing a LinkedIn-formatted post must not be able to accidentally target a connected Facebook account", async () => {
    // draft-1 is 'X' (see beforeEach); acc-fb is a real, ACTIVE, same-org
    // account, just on the wrong network for this content.
    accounts.push({ id: 'acc-fb', organizationId: 'org-a', network: 'FACEBOOK', externalId: 'fb-1', accessTokenEnc: 'enc-fb', status: 'ACTIVE' });

    await expect(
      EditorialService.publishOrSchedule({
        organizationId: 'org-a',
        userId: 'user-1',
        draftId: 'draft-1',
        socialAccountIds: ['acc-fb'],
      }),
    ).rejects.toThrow(/Aucun compte social actif/);
    expect(connectorPublish).not.toHaveBeenCalled();
  });

  it('delivers only to the matching-network account when both matching and mismatched accounts are requested together', async () => {
    accounts.push(
      { id: 'acc-x-2', organizationId: 'org-a', network: 'X', externalId: 'ext-x2', accessTokenEnc: 'enc-x2', status: 'ACTIVE' },
      { id: 'acc-fb-2', organizationId: 'org-a', network: 'FACEBOOK', externalId: 'fb-2', accessTokenEnc: 'enc-fb2', status: 'ACTIVE' },
    );
    connectorPublish.mockResolvedValue({ success: true, externalPostId: 'post-x' });

    const pub = await EditorialService.publishOrSchedule({
      organizationId: 'org-a',
      userId: 'user-1',
      draftId: 'draft-1', // network: X
      socialAccountIds: ['acc-x-2', 'acc-fb-2'],
    });

    expect(pub.status).toBe('PUBLISHED');
    expect(connectorPublish).toHaveBeenCalledTimes(1); // only the X account, never the Facebook one
    expect(targets).toHaveLength(1);
    expect(targets[0]?.socialAccountId).toBe('acc-x-2');
  });
});
