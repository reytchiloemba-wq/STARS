import { describe, it, expect, vi, beforeEach } from 'vitest';

interface FakeOAuthState {
  state: string;
  organizationId: string;
  userId: string;
  network: string;
  codeVerifier: string;
  redirectUri: string;
  expiresAt: Date;
  consumedAt: Date | null;
}

let oauthStates: FakeOAuthState[] = [];
let socialAccounts: Array<Record<string, unknown>> = [];

const FAKE_PROVIDER = { id: 'provider-linkedin', key: 'linkedin' };
const FAKE_INTEGRATION = {
  id: 'integration-1',
  providerId: 'provider-linkedin',
  isPrimary: true,
  credentialsEnc: 'encrypted-blob',
};

vi.mock('@/lib/crypto', () => ({
  decryptCredentials: vi.fn(() => ({ clientId: 'client-123', clientSecret: 'secret-456' })),
  encryptSecret: vi.fn((s: string) => `enc(${s})`),
  fingerprint: vi.fn((s: string) => `fp(${s.slice(-4)})`),
}));

vi.mock('@/lib/db', () => ({
  db: {
    oAuthState: {
      findUnique: vi.fn(async ({ where }: { where: { state: string } }) =>
        oauthStates.find((s) => s.state === where.state) ?? null,
      ),
      update: vi.fn(async ({ where, data }: { where: { state: string }; data: { consumedAt: Date } }) => {
        const s = oauthStates.find((x) => x.state === where.state);
        if (s) s.consumedAt = data.consumedAt;
        return s;
      }),
      create: vi.fn(async ({ data }: { data: FakeOAuthState }) => {
        oauthStates.push(data);
        return data;
      }),
    },
    integrationProvider: {
      findUniqueOrThrow: vi.fn(async () => FAKE_PROVIDER),
    },
    globalIntegration: {
      findFirst: vi.fn(async () => FAKE_INTEGRATION),
    },
    socialAccount: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        socialAccounts.push(data);
        return data;
      }),
      upsert: vi.fn(async ({ create }: { create: Record<string, unknown> }) => {
        socialAccounts.push(create);
        return create;
      }),
    },
  },
}));

const { completeOAuthFlow, OAuthCallbackError } = await import('@/server/services/oauth.service');

function futureDate(ms: number) {
  return new Date(Date.now() + ms);
}
function pastDate(ms: number) {
  return new Date(Date.now() - ms);
}

beforeEach(() => {
  oauthStates = [];
  socialAccounts = [];
  vi.restoreAllMocks();
});

describe('completeOAuthFlow — CSRF, replay, and expiry protection (spec §25 test #5, #7)', () => {
  it('CRITICAL: rejects a callback with an unknown/falsified state', async () => {
    await expect(completeOAuthFlow('LINKEDIN', 'some-code', 'never-issued-state')).rejects.toThrow(OAuthCallbackError);
  });

  it('CRITICAL: rejects a replayed (already-consumed) state', async () => {
    oauthStates.push({
      state: 'used-state',
      organizationId: 'org-a',
      userId: 'user-a',
      network: 'LINKEDIN',
      codeVerifier: 'verifier',
      redirectUri: 'https://app.example/callback',
      expiresAt: futureDate(60_000),
      consumedAt: new Date(), // already consumed
    });
    await expect(completeOAuthFlow('LINKEDIN', 'code', 'used-state')).rejects.toThrow(/rejeu/i);
  });

  it('rejects an expired state', async () => {
    oauthStates.push({
      state: 'expired-state',
      organizationId: 'org-a',
      userId: 'user-a',
      network: 'LINKEDIN',
      codeVerifier: 'verifier',
      redirectUri: 'https://app.example/callback',
      expiresAt: pastDate(1000),
      consumedAt: null,
    });
    await expect(completeOAuthFlow('LINKEDIN', 'code', 'expired-state')).rejects.toThrow(/expiré/i);
  });

  it('rejects when the state was issued for a different network', async () => {
    oauthStates.push({
      state: 'wrong-network-state',
      organizationId: 'org-a',
      userId: 'user-a',
      network: 'X',
      codeVerifier: 'verifier',
      redirectUri: 'https://app.example/callback',
      expiresAt: futureDate(60_000),
      consumedAt: null,
    });
    await expect(completeOAuthFlow('LINKEDIN', 'code', 'wrong-network-state')).rejects.toThrow(OAuthCallbackError);
  });

  it('completes successfully on a valid, unexpired, unused state and a successful token exchange', async () => {
    oauthStates.push({
      state: 'valid-state',
      organizationId: 'org-a',
      userId: 'user-a',
      network: 'LINKEDIN',
      codeVerifier: 'verifier',
      redirectUri: 'https://app.example/callback',
      expiresAt: futureDate(60_000),
      consumedAt: null,
    });

    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ access_token: 'real-access-token', expires_in: 3600 }),
    })) as unknown as typeof fetch;

    const result = await completeOAuthFlow('LINKEDIN', 'valid-code', 'valid-state');
    expect(result.organizationId).toBe('org-a');
    expect(socialAccounts).toHaveLength(1);
    expect(socialAccounts[0]!.accessTokenEnc).toBe('enc(real-access-token)');

    // Single-use: the state is now consumed and cannot be replayed.
    await expect(completeOAuthFlow('LINKEDIN', 'valid-code', 'valid-state')).rejects.toThrow(/rejeu/i);
  });

  it('surfaces a clear error when the provider rejects the token exchange', async () => {
    oauthStates.push({
      state: 'valid-state-2',
      organizationId: 'org-b',
      userId: 'user-b',
      network: 'LINKEDIN',
      codeVerifier: 'verifier',
      redirectUri: 'https://app.example/callback',
      expiresAt: futureDate(60_000),
      consumedAt: null,
    });

    global.fetch = vi.fn(async () => ({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ error: { message: 'invalid_grant' } }),
    })) as unknown as typeof fetch;

    await expect(completeOAuthFlow('LINKEDIN', 'bad-code', 'valid-state-2')).rejects.toThrow(OAuthCallbackError);
    expect(socialAccounts).toHaveLength(0);
  });
});
