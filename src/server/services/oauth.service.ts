import { randomBytes, createHash } from 'node:crypto';
import { db } from '@/lib/db';
import { decryptCredentials, encryptSecret, fingerprint } from '@/lib/crypto';
import type { SocialNetwork } from '@prisma/client';
import type { TenantContext } from '@/lib/tenant';

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function base64url(input: Buffer): string {
  return input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

interface ProviderOAuthConfig {
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string[];
}

const NETWORK_CONFIG: Record<SocialNetwork, ProviderOAuthConfig> = {
  LINKEDIN: {
    authorizeUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    scopes: ['openid', 'profile', 'w_member_social'],
  },
  FACEBOOK: {
    authorizeUrl: 'https://www.facebook.com/v21.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v21.0/oauth/access_token',
    scopes: ['pages_show_list', 'pages_manage_posts'],
  },
  INSTAGRAM: {
    authorizeUrl: 'https://www.facebook.com/v21.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v21.0/oauth/access_token',
    scopes: ['instagram_basic', 'instagram_content_publish'],
  },
  X: {
    authorizeUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
  },
};

// Meta (Facebook/Instagram) OAuth apps share one provider row keyed 'meta'.
function providerKeyFor(network: SocialNetwork): string {
  return network === 'X' ? 'x' : network === 'LINKEDIN' ? 'linkedin' : 'meta';
}

export class OAuthNotConfiguredError extends Error {
  constructor(network: SocialNetwork) {
    super(
      `${network} n'est pas configuré par l'administrateur de la plateforme. Contactez votre administrateur STARS.`,
    );
    this.name = 'OAuthNotConfiguredError';
  }
}

/**
 * Bug found in production (reported: Facebook OAuth consent completes, then
 * silently bounces back to /settings/social): `setPrimary` in
 * infrastructure.service.ts isn't transactional, so two racing "set as
 * primary" clicks (e.g. one for TEST, one for PRODUCTION) could each demote
 * the *other* row before setting their own, leaving BOTH marked
 * `isPrimary: true` — one with valid credentials (OPERATIONAL) and one with
 * rejected credentials (ERROR). The old lookup here only checked
 * `isPrimary`, so `findFirst` could non-deterministically return the broken
 * one, causing the real Meta token exchange to fail with rejected
 * credentials — completeOAuthFlow would then redirect back to
 * /settings/social?error=... (which read, from the user's side, exactly
 * like "click Continue on Facebook -> land back on the social page").
 *
 * Fix: always prefer a genuinely OPERATIONAL integration — confirmed
 * working by a real test — over any integration merely flagged primary,
 * and use a deterministic order so two equally-ranked rows never depend on
 * unspecified DB row order.
 */
async function getIntegrationForProvider(providerId: string) {
  return (
    (await db.globalIntegration.findFirst({
      where: { providerId, isPrimary: true, status: 'OPERATIONAL' },
      orderBy: { updatedAt: 'desc' },
    })) ??
    (await db.globalIntegration.findFirst({
      where: { providerId, status: 'OPERATIONAL' },
      orderBy: { updatedAt: 'desc' },
    })) ??
    (await db.globalIntegration.findFirst({
      where: { providerId, isPrimary: true },
      orderBy: { updatedAt: 'desc' },
    })) ??
    (await db.globalIntegration.findFirst({
      where: { providerId },
      orderBy: { updatedAt: 'desc' },
    }))
  );
}

/**
 * Step 1 of the tenant OAuth flow (spec §10). Reads the Super-Admin-configured
 * global app for this network, generates CSRF `state` + PKCE verifier, stores
 * them tenant-scoped in OAuthState, and returns the real provider
 * authorization URL to redirect the browser to.
 */
export async function startOAuthFlow(
  ctx: TenantContext,
  network: SocialNetwork,
  redirectUri: string,
): Promise<{ authorizeUrl: string }> {
  const providerKey = providerKeyFor(network);
  const provider = await db.integrationProvider.findUniqueOrThrow({ where: { key: providerKey } });
  const integration = await getIntegrationForProvider(provider.id);

  if (!integration?.credentialsEnc) {
    throw new OAuthNotConfiguredError(network);
  }

  const creds = decryptCredentials<{ clientId?: string; appId?: string }>(integration.credentialsEnc);
  const clientId = creds.clientId ?? creds.appId;
  if (!clientId) throw new OAuthNotConfiguredError(network);

  const config = NETWORK_CONFIG[network];
  const state = base64url(randomBytes(24));
  const codeVerifier = base64url(randomBytes(32));
  const codeChallenge = base64url(createHash('sha256').update(codeVerifier).digest());

  await db.oAuthState.create({
    data: {
      state,
      organizationId: ctx.organization.id,
      userId: ctx.userId,
      network,
      codeVerifier,
      redirectUri,
      expiresAt: new Date(Date.now() + STATE_TTL_MS),
    },
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    state,
    scope: config.scopes.join(' '),
  });

  if (network !== 'FACEBOOK' && network !== 'INSTAGRAM') {
    params.set('code_challenge', codeChallenge);
    params.set('code_challenge_method', 'S256');
  }

  return { authorizeUrl: `${config.authorizeUrl}?${params.toString()}` };
}

export class OAuthCallbackError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OAuthCallbackError';
  }
}

/**
 * Step 2 — the callback. Every failure mode here maps to a spec §25/§9
 * requirement: an unknown/expired/reused `state` is rejected (CSRF/replay
 * protection), and a real token exchange is performed against the provider —
 * this never fabricates a successful connection.
 */
export async function completeOAuthFlow(
  network: SocialNetwork,
  code: string,
  state: string,
): Promise<{ organizationId: string }> {
  const stateRow = await db.oAuthState.findUnique({ where: { state } });

  if (!stateRow || stateRow.network !== network) {
    throw new OAuthCallbackError('État OAuth invalide ou introuvable — tentative de falsification possible.');
  }
  if (stateRow.consumedAt) {
    throw new OAuthCallbackError('Ce lien de connexion a déjà été utilisé (rejeu détecté).');
  }
  if (stateRow.expiresAt < new Date()) {
    throw new OAuthCallbackError('Le lien de connexion a expiré. Relancez la connexion.');
  }

  // Mark consumed immediately (single-use) before doing any external I/O.
  await db.oAuthState.update({ where: { state }, data: { consumedAt: new Date() } });

  const providerKey = providerKeyFor(network);
  const provider = await db.integrationProvider.findUniqueOrThrow({ where: { key: providerKey } });
  const integration = await getIntegrationForProvider(provider.id);
  if (!integration?.credentialsEnc) throw new OAuthNotConfiguredError(network);

  const creds = decryptCredentials<{ clientId?: string; appId?: string; clientSecret?: string; appSecret?: string }>(
    integration.credentialsEnc,
  );
  const clientId = creds.clientId ?? creds.appId ?? '';
  const clientSecret = creds.clientSecret ?? creds.appSecret ?? '';
  const config = NETWORK_CONFIG[network];

  const tokenParams: Record<string, string> = {
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: stateRow.redirectUri,
  };

  if (network !== 'FACEBOOK' && network !== 'INSTAGRAM') {
    tokenParams.grant_type = 'authorization_code';
    if (stateRow.codeVerifier) {
      tokenParams.code_verifier = stateRow.codeVerifier;
    }
  }

  const tokenRes = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(tokenParams),
    signal: AbortSignal.timeout(10000),
  }).catch((fetchErr) => {
    console.error(`[OAuth] Network fetch error for ${network}:`, fetchErr);
    return null;
  });

  if (!tokenRes || !tokenRes.ok) {
    const errorBody = tokenRes ? await tokenRes.text().catch(() => '') : '';
    console.error(`[OAuth] Token exchange failed for ${network}: status=${tokenRes?.status}, body=${errorBody}`);
    let detailMsg = `HTTP ${tokenRes?.status ?? 'réseau'}`;
    try {
      const parsed = JSON.parse(errorBody);
      if (parsed.error?.message) detailMsg += ` - ${parsed.error.message}`;
    } catch {}
    throw new OAuthCallbackError(
      `Échec de l'échange du code d'autorisation auprès de ${network} (${detailMsg}).`,
    );
  }

  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };

  if (!tokenJson.access_token) {
    throw new OAuthCallbackError(`${network} n'a retourné aucun jeton d'accès.`);
  }

  let externalId = fingerprint(tokenJson.access_token);
  let displayName = `${network} (compte autorisé)`;
  let tokenToEncrypt = tokenJson.access_token;

  if (network === 'FACEBOOK') {
    try {
      const accountsRes = await fetch(
        `https://graph.facebook.com/v21.0/me/accounts?access_token=${tokenJson.access_token}`,
        { signal: AbortSignal.timeout(8000) },
      );
      if (accountsRes.ok) {
        const accountsData = (await accountsRes.json()) as {
          data?: Array<{ id: string; name: string; access_token: string }>;
        };
        const page = accountsData.data?.[0];
        if (page) {
          externalId = page.id;
          displayName = `${page.name} (Page Facebook)`;
          tokenToEncrypt = page.access_token;
        } else {
          const meRes = await fetch(
            `https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${tokenJson.access_token}`,
            { signal: AbortSignal.timeout(5000) },
          );
          if (meRes.ok) {
            const meData = (await meRes.json()) as { id?: string; name?: string };
            if (meData.id) externalId = meData.id;
            if (meData.name) displayName = `${meData.name} (Profil Facebook)`;
          }
        }
      }
    } catch {
      // keep fallback
    }
  } else if (network === 'LINKEDIN') {
    try {
      const userRes = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenJson.access_token}` },
        signal: AbortSignal.timeout(8000),
      });
      if (userRes.ok) {
        const userData = (await userRes.json()) as { sub?: string; name?: string };
        if (userData.sub) externalId = userData.sub;
        if (userData.name) displayName = `${userData.name} (LinkedIn)`;
      }
    } catch {
      // keep fallback
    }
  } else if (network === 'X') {
    try {
      const meRes = await fetch('https://api.twitter.com/2/users/me', {
        headers: { Authorization: `Bearer ${tokenJson.access_token}` },
        signal: AbortSignal.timeout(8000),
      });
      if (meRes.ok) {
        const meData = (await meRes.json()) as { data?: { id?: string; name?: string; username?: string } };
        if (meData.data?.id) externalId = meData.data.id;
        if (meData.data?.name) displayName = `${meData.data.name} (@${meData.data.username || 'x'})`;
      }
    } catch {
      // keep fallback
    }
  }

  await db.socialAccount.upsert({
    where: {
      organizationId_network_externalId: {
        organizationId: stateRow.organizationId,
        network,
        externalId,
      },
    },
    create: {
      organizationId: stateRow.organizationId,
      network,
      externalId,
      displayName,
      scopes: config.scopes,
      accessTokenEnc: encryptSecret(tokenToEncrypt),
      refreshTokenEnc: tokenJson.refresh_token ? encryptSecret(tokenJson.refresh_token) : null,
      expiresAt: tokenJson.expires_in ? new Date(Date.now() + tokenJson.expires_in * 1000) : null,
      connectedById: stateRow.userId,
      status: 'ACTIVE',
    },
    update: {
      displayName,
      scopes: config.scopes,
      accessTokenEnc: encryptSecret(tokenToEncrypt),
      refreshTokenEnc: tokenJson.refresh_token ? encryptSecret(tokenJson.refresh_token) : null,
      expiresAt: tokenJson.expires_in ? new Date(Date.now() + tokenJson.expires_in * 1000) : null,
      connectedById: stateRow.userId,
      status: 'ACTIVE',
    },
  });

  return { organizationId: stateRow.organizationId };
}
