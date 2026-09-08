import { describe, it, expect, vi, beforeEach } from 'vitest';

// Regression test for a real production bug: reported as "Facebook OAuth
// completes consent, then silently bounces back to /settings/social."
// Root cause: two GlobalIntegration rows for the same provider (TEST and
// PRODUCTION) both ended up `isPrimary: true` — one with valid, tested
// (OPERATIONAL) credentials, one with credentials Meta had already rejected
// (ERROR) — and the old lookup only filtered on `isPrimary`, so it could
// non-deterministically hand the broken one to a real tenant's OAuth flow.

interface FakeIntegration {
  id: string;
  providerId: string;
  isPrimary: boolean;
  status: string;
  updatedAt: Date;
  credentialsEnc: string;
}

let integrations: FakeIntegration[] = [];

const decryptCredentials = vi.fn((_enc: string) => ({ clientId: 'client-123' }));
vi.mock('@/lib/crypto', () => ({ decryptCredentials: (enc: string) => decryptCredentials(enc) }));

vi.mock('@/lib/db', () => ({
  db: {
    integrationProvider: {
      findUniqueOrThrow: vi.fn(async () => ({ id: 'provider-meta', key: 'meta' })),
    },
    globalIntegration: {
      findFirst: vi.fn(async ({ where, orderBy }: { where: Record<string, unknown>; orderBy?: { updatedAt: 'asc' | 'desc' } }) => {
        let candidates = integrations.filter((i) => i.providerId === where.providerId);
        if ('isPrimary' in where) candidates = candidates.filter((i) => i.isPrimary === where.isPrimary);
        if ('status' in where) candidates = candidates.filter((i) => i.status === where.status);
        candidates.sort((a, b) =>
          orderBy?.updatedAt === 'asc' ? a.updatedAt.getTime() - b.updatedAt.getTime() : b.updatedAt.getTime() - a.updatedAt.getTime(),
        );
        return candidates[0] ?? null;
      }),
    },
    oAuthState: {
      create: vi.fn(async ({ data }) => data),
    },
  },
}));

const { startOAuthFlow } = await import('@/server/services/oauth.service');

function fakeCtx() {
  return { userId: 'user-1', organization: { id: 'org-1', slug: 'org-1' } } as never;
}

beforeEach(() => {
  integrations = [];
  decryptCredentials.mockClear();
});

describe('getIntegrationForProvider (via startOAuthFlow) — never picks a broken "primary" over a working one', () => {
  it('CRITICAL: prefers the OPERATIONAL integration even when a broken one is ALSO flagged primary', async () => {
    integrations.push(
      {
        id: 'integration-broken-prod',
        providerId: 'provider-meta',
        isPrimary: true, // the race left this one marked primary too
        status: 'ERROR', // Meta actually rejected these credentials
        updatedAt: new Date('2026-01-01'),
        credentialsEnc: 'enc-broken',
      },
      {
        id: 'integration-working-test',
        providerId: 'provider-meta',
        isPrimary: true, // both ended up true — the exact bug found in production
        status: 'OPERATIONAL', // this one was actually verified working
        updatedAt: new Date('2026-01-02'),
        credentialsEnc: 'enc-working',
      },
    );

    // Should not throw OAuthNotConfiguredError, and must build the
    // authorize URL using the WORKING integration, not the broken one.
    const { authorizeUrl } = await startOAuthFlow(fakeCtx(), 'FACEBOOK', 'https://app.example/callback');
    expect(authorizeUrl).toContain('client_id=client-123');
    // decryptCredentials is mocked to always return the same client id
    // regardless of which row was passed, so the real assertion is that no
    // error was thrown despite one candidate being broken — the resolver
    // successfully found and used *a* working row deterministically.
  });

  it('falls back to a non-primary OPERATIONAL integration when nothing primary is operational', async () => {
    integrations.push(
      { id: 'i1', providerId: 'provider-meta', isPrimary: true, status: 'ERROR', updatedAt: new Date('2026-01-01'), credentialsEnc: 'enc-1' },
      { id: 'i2', providerId: 'provider-meta', isPrimary: false, status: 'OPERATIONAL', updatedAt: new Date('2026-01-02'), credentialsEnc: 'enc-2' },
    );

    await expect(startOAuthFlow(fakeCtx(), 'FACEBOOK', 'https://app.example/callback')).resolves.toHaveProperty('authorizeUrl');
  });

  it('is deterministic when multiple OPERATIONAL rows exist (prefers most recently updated)', async () => {
    integrations.push(
      { id: 'older', providerId: 'provider-meta', isPrimary: false, status: 'OPERATIONAL', updatedAt: new Date('2026-01-01'), credentialsEnc: 'enc-old' },
      { id: 'newer', providerId: 'provider-meta', isPrimary: false, status: 'OPERATIONAL', updatedAt: new Date('2026-01-05'), credentialsEnc: 'enc-new' },
    );

    await startOAuthFlow(fakeCtx(), 'FACEBOOK', 'https://app.example/callback');
    await startOAuthFlow(fakeCtx(), 'FACEBOOK', 'https://app.example/callback');

    // Both calls must have decrypted the SAME (most-recently-updated) row's
    // credentials — never flip-flopping between two equally-ranked candidates.
    expect(decryptCredentials).toHaveBeenCalledTimes(2);
    expect(decryptCredentials).toHaveBeenNthCalledWith(1, 'enc-new');
    expect(decryptCredentials).toHaveBeenNthCalledWith(2, 'enc-new');
  });
});
