import { describe, it, expect, vi, beforeEach } from 'vitest';

// Regression coverage for a critical bug found in production: a scheduled
// publication (Publication.status = 'SCHEDULED') had NO executor at all —
// nothing ever transitioned it forward, so it sat there forever and was
// never actually delivered to any real network. Compounded by a UX bug
// (a stray click on the datetime-local picker silently armed "schedule"
// mode), EVERY publish attempt from the Studio was silently going through
// this dead end. executeDueSchedules() is the fix: the actual worker,
// invoked by the Vercel Cron route.

interface FakeSchedule {
  id: string;
  runAt: Date;
  publicationId: string;
}
interface FakePublication {
  id: string;
  status: string;
  draftId: string;
  idempotencyKey: string;
}
interface FakeTarget {
  id: string;
  publicationId: string;
  socialAccountId: string;
  status: string;
  externalPostId: string | null;
  errorMessage: string | null;
}
interface FakeAccount {
  id: string;
  network: string;
  externalId: string;
  accessTokenEnc: string;
  organizationId: string;
}
interface FakeDraft {
  id: string;
  currentContent: string;
  status: string;
}

let schedules: FakeSchedule[] = [];
let publications: FakePublication[] = [];
let targets: FakeTarget[] = [];
let accounts: FakeAccount[] = [];
let drafts: FakeDraft[] = [];

const connectorPublish = vi.fn();
vi.mock('@/server/adapters/social', () => ({
  getSocialConnector: vi.fn(() => ({ publish: connectorPublish })),
}));
vi.mock('@/lib/crypto', () => ({
  decryptSecret: vi.fn((enc: string) => `plaintext(${enc})`),
}));

vi.mock('@/lib/db', () => ({
  db: {
    schedule: {
      findMany: vi.fn(async () => {
        const now = new Date();
        return schedules
          .filter((s) => s.runAt <= now)
          .map((s) => {
            const pub = publications.find((p) => p.id === s.publicationId)!;
            const draft = drafts.find((d) => d.id === pub.draftId)!;
            const pubTargets = targets
              .filter((t) => t.publicationId === pub.id)
              .map((t) => ({ ...t, socialAccount: accounts.find((a) => a.id === t.socialAccountId)! }));
            return { ...s, publication: { ...pub, draft, targets: pubTargets } };
          })
          // only rows whose Publication is still SCHEDULED, mirroring the real `where` clause
          .filter((s) => s.publication.status === 'SCHEDULED');
      }),
    },
    publication: {
      updateMany: vi.fn(async ({ where, data }: { where: { id: string; status: string }; data: { status: string } }) => {
        const pub = publications.find((p) => p.id === where.id && p.status === where.status);
        if (!pub) return { count: 0 };
        pub.status = data.status;
        return { count: 1 };
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: { status: string } }) => {
        const pub = publications.find((p) => p.id === where.id);
        if (pub) pub.status = data.status;
        return pub;
      }),
    },
    publicationTarget: {
      upsert: vi.fn(
        async ({
          where,
          create,
          update,
        }: {
          where: { publicationId_socialAccountId: { publicationId: string; socialAccountId: string } };
          create: Partial<FakeTarget> & { publicationId: string; socialAccountId: string; status: string };
          update: Partial<FakeTarget>;
        }) => {
          const { publicationId, socialAccountId } = where.publicationId_socialAccountId;
          const existing = targets.find((t) => t.publicationId === publicationId && t.socialAccountId === socialAccountId);
          if (existing) {
            Object.assign(existing, update);
            return existing;
          }
          const t: FakeTarget = { id: `target-${Math.random()}`, externalPostId: null, errorMessage: null, ...create };
          targets.push(t);
          return t;
        },
      ),
    },
    draft: {
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: { status: string } }) => {
        const d = drafts.find((x) => x.id === where.id);
        if (d) d.status = data.status;
        return d;
      }),
    },
  },
}));

const { EditorialService } = await import('@/server/services/editorial.service');

function pastDate(ms: number) {
  return new Date(Date.now() - ms);
}
function futureDate(ms: number) {
  return new Date(Date.now() + ms);
}

beforeEach(() => {
  schedules = [];
  publications = [];
  targets = [];
  accounts = [];
  drafts = [];
  connectorPublish.mockReset();
});

describe('executeDueSchedules — the previously-missing scheduled-publication worker', () => {
  it('CRITICAL: delivers a due, still-SCHEDULED publication for real and flips it to PUBLISHED', async () => {
    drafts.push({ id: 'draft-1', currentContent: 'Hello', status: 'SCHEDULED' });
    publications.push({ id: 'pub-1', status: 'SCHEDULED', draftId: 'draft-1', idempotencyKey: 'key-1' });
    accounts.push({ id: 'acc-1', network: 'X', externalId: 'ext-1', accessTokenEnc: 'enc-1', organizationId: 'org-1' });
    targets.push({ id: 't-1', publicationId: 'pub-1', socialAccountId: 'acc-1', status: 'SCHEDULED', externalPostId: null, errorMessage: null });
    schedules.push({ id: 's-1', runAt: pastDate(60_000), publicationId: 'pub-1' });

    connectorPublish.mockResolvedValue({ success: true, externalPostId: 'real-post-id' });

    const result = await EditorialService.executeDueSchedules();

    expect(result).toEqual({ processed: 1, published: 1, failed: 0 });
    expect(publications[0]?.status).toBe('PUBLISHED');
    expect(targets[0]?.status).toBe('PUBLISHED');
    expect(targets[0]?.externalPostId).toBe('real-post-id');
    expect(drafts[0]?.status).toBe('PUBLISHED');
  });

  it('ignores schedules whose runAt has not arrived yet', async () => {
    drafts.push({ id: 'draft-2', currentContent: 'Later', status: 'SCHEDULED' });
    publications.push({ id: 'pub-2', status: 'SCHEDULED', draftId: 'draft-2', idempotencyKey: 'key-2' });
    schedules.push({ id: 's-2', runAt: futureDate(60_000), publicationId: 'pub-2' });

    const result = await EditorialService.executeDueSchedules();

    expect(result).toEqual({ processed: 0, published: 0, failed: 0 });
    expect(connectorPublish).not.toHaveBeenCalled();
  });

  it('never re-delivers a publication that is no longer SCHEDULED (already processed by an earlier run)', async () => {
    drafts.push({ id: 'draft-3', currentContent: 'Done', status: 'PUBLISHED' });
    publications.push({ id: 'pub-3', status: 'PUBLISHED', draftId: 'draft-3', idempotencyKey: 'key-3' });
    schedules.push({ id: 's-3', runAt: pastDate(60_000), publicationId: 'pub-3' });

    const result = await EditorialService.executeDueSchedules();

    expect(result).toEqual({ processed: 0, published: 0, failed: 0 });
    expect(connectorPublish).not.toHaveBeenCalled();
  });

  it('records a genuine connector failure as FAILED, not as a fabricated success', async () => {
    drafts.push({ id: 'draft-4', currentContent: 'Will fail', status: 'SCHEDULED' });
    publications.push({ id: 'pub-4', status: 'SCHEDULED', draftId: 'draft-4', idempotencyKey: 'key-4' });
    accounts.push({ id: 'acc-4', network: 'X', externalId: 'ext-4', accessTokenEnc: 'enc-4', organizationId: 'org-1' });
    targets.push({ id: 't-4', publicationId: 'pub-4', socialAccountId: 'acc-4', status: 'SCHEDULED', externalPostId: null, errorMessage: null });
    schedules.push({ id: 's-4', runAt: pastDate(1000), publicationId: 'pub-4' });

    connectorPublish.mockResolvedValue({ success: false, errorMessage: 'Provider rejected the token.' });

    const result = await EditorialService.executeDueSchedules();

    expect(result).toEqual({ processed: 1, published: 0, failed: 1 });
    expect(publications[0]?.status).toBe('FAILED');
    expect(targets[0]?.externalPostId).toBeNull();
    expect(targets[0]?.errorMessage).toBe('Provider rejected the token.');
  });
});
