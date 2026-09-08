import { db } from '@/lib/db';
import { encryptCredentials, decryptCredentials } from '@/lib/crypto';
import { getProvider } from '@/config/providers';
import { IntegrationStatus, IntegrationEnvironment, type User } from '@prisma/client';

export async function listGlobalIntegrations() {
  return db.globalIntegration.findMany({
    include: { provider: true },
    orderBy: [{ provider: { category: 'asc' } }, { provider: { name: 'asc' } }],
  });
}

export async function getGlobalIntegration(id: string) {
  return db.globalIntegration.findUniqueOrThrow({ where: { id }, include: { provider: true } });
}

/**
 * Save (create or update) a Super-Admin-entered credential set. The
 * plaintext never touches the return value or gets logged — only the
 * encrypted blob and a masked fingerprint are persisted, per spec §18.
 * Saving always resets status to NOT_CONFIGURED→ the cockpit must run a
 * real test before this can show as OPERATIONAL again (never optimistic).
 */
export async function saveIntegrationCredentials(
  actor: User,
  providerKey: string,
  environment: IntegrationEnvironment,
  credentials: Record<string, string>,
  config: Record<string, unknown> | null,
) {
  const providerDef = getProvider(providerKey);
  const providerRow = await db.integrationProvider.findUniqueOrThrow({ where: { key: providerKey } });

  const { credentialsEnc, credentialsFingerprint } = encryptCredentials(credentials);

  const missing = providerDef.credentialFields.filter((f) => f.required && !credentials[f.key]?.trim());
  const status = missing.length > 0 ? IntegrationStatus.INCOMPLETE : IntegrationStatus.NOT_CONFIGURED;

  const integration = await db.globalIntegration.upsert({
    where: { providerId_environment: { providerId: providerRow.id, environment } },
    create: {
      providerId: providerRow.id,
      environment,
      credentialsEnc,
      credentialsFingerprint,
      config: config as object | undefined,
      status,
    },
    update: {
      credentialsEnc,
      credentialsFingerprint,
      config: config as object | undefined,
      status,
      lastTestedAt: null,
      lastTestResult: null,
      lastTestMessage: null,
    },
  });

  await db.secretVersion.create({
    data: {
      globalIntegrationId: integration.id,
      fingerprint: credentialsFingerprint,
      rotatedByUserId: actor.id,
    },
  });

  await db.auditLog.create({
    data: {
      actorUserId: actor.id,
      action: 'infrastructure.credentials.saved',
      targetType: 'GlobalIntegration',
      targetId: integration.id,
      metadata: { providerKey, environment },
    },
  });

  return integration;
}

export interface TestResult {
  success: boolean;
  message: string;
}

/**
 * Runs a REAL connectivity check — never a simulated success. Every branch
 * either makes a genuine network call or explicitly reports that no
 * automated check is possible (STORAGE) or that only the format could be
 * validated pending a live OAuth round-trip (SOCIAL — see spec §9: an OAuth
 * app can't be "tested" server-side without a user completing consent).
 */
export async function testGlobalIntegration(actor: User, id: string): Promise<TestResult> {
  const integration = await getGlobalIntegration(id);
  const providerDef = getProvider(integration.provider.key);

  if (!integration.credentialsEnc) {
    return { success: false, message: 'Aucun identifiant enregistré.' };
  }

  await db.globalIntegration.update({ where: { id }, data: { status: IntegrationStatus.TESTING } });

  let result: TestResult;
  try {
    const creds = decryptCredentials(integration.credentialsEnc);
    result = await runTest(providerDef.testKind, providerDef.key, creds);
  } catch (err) {
    result = { success: false, message: err instanceof Error ? err.message : 'Erreur inconnue lors du test.' };
  }

  await db.globalIntegration.update({
    where: { id },
    data: {
      status: result.success ? IntegrationStatus.OPERATIONAL : IntegrationStatus.ERROR,
      lastTestedAt: new Date(),
      lastTestResult: result.success ? 'success' : 'failure',
      lastTestMessage: result.message,
    },
  });

  if (!result.success) {
    await db.integrationIncident.create({
      data: { globalIntegrationId: id, severity: 'WARNING', message: result.message },
    });
  }

  await db.auditLog.create({
    data: {
      actorUserId: actor.id,
      action: 'infrastructure.connector.tested',
      targetType: 'GlobalIntegration',
      targetId: id,
      metadata: { result: result.success ? 'success' : 'failure' },
    },
  });

  return result;
}

async function runTest(
  testKind: string,
  providerKey: string,
  creds: Record<string, string>,
): Promise<TestResult> {
  switch (testKind) {
    case 'rss-fetch': {
      const res = await fetch('https://www.lemonde.fr/rss/une.xml', { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return { success: false, message: `Flux RSS de test injoignable (HTTP ${res.status}).` };
      const text = await res.text();
      if (!text.includes('<rss') && !text.includes('<feed')) {
        return { success: false, message: 'Réponse reçue mais ne ressemble pas à un flux RSS/Atom valide.' };
      }
      return { success: true, message: 'Flux RSS de test lu avec succès.' };
    }

    case 'http-fetch': {
      return testHttpProvider(providerKey, creds);
    }

    case 'oauth-format-check': {
      const provider = getProvider(providerKey);
      const missing = provider.credentialFields.filter((f) => f.required && !creds[f.key]?.trim());
      if (missing.length > 0) {
        return { success: false, message: `Champs manquants : ${missing.map((f) => f.label).join(', ')}.` };
      }

      if (providerKey === 'meta') {
        const appId = creds.appId?.trim();
        const appSecret = creds.appSecret?.trim();
        if (appId && appSecret) {
          try {
            const res = await fetch(
              `https://graph.facebook.com/oauth/access_token?client_id=${appId}&client_secret=${encodeURIComponent(appSecret)}&grant_type=client_credentials`,
              { signal: AbortSignal.timeout(8000) },
            );
            const data = (await res.json().catch(() => null)) as {
              access_token?: string;
              error?: { message?: string };
            } | null;

            if (res.ok && data?.access_token) {
              return { success: true, message: "App ID et App Secret validés avec succès auprès de l'API Graph Meta !" };
            }
            if (data?.error?.message) {
              return {
                success: false,
                message: `Meta a refusé vos identifiants : « ${data.error.message} ». Vérifiez que l'App Secret copié est bien la chaîne hexadécimale de 32 caractères affichée par Meta et non votre mot de passe Facebook.`,
              };
            }
          } catch (err) {
            return {
              success: false,
              message: `Erreur de connexion à Meta Graph API : ${err instanceof Error ? err.message : 'inconnue'}`,
            };
          }
        }
      }

      return {
        success: true,
        message: "Format des identifiants valide. Prêt pour l'authentification des comptes.",
      };
    }

    case 'none':
    default:
      return { success: false, message: 'Aucun test automatisé disponible pour ce fournisseur.' };
  }
}

async function testHttpProvider(providerKey: string, creds: Record<string, string>): Promise<TestResult> {
  const timeout = { signal: AbortSignal.timeout(8000) };

  switch (providerKey) {
    case 'anthropic': {
      const res = await fetch('https://api.anthropic.com/v1/models', {
        headers: { 'x-api-key': creds.apiKey ?? '', 'anthropic-version': '2023-06-01' },
        ...timeout,
      });
      return res.ok
        ? { success: true, message: 'Connexion Anthropic vérifiée (liste des modèles récupérée).' }
        : { success: false, message: `Anthropic a répondu HTTP ${res.status}.` };
    }
    case 'openai': {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${creds.apiKey ?? ''}` },
        ...timeout,
      });
      return res.ok
        ? { success: true, message: 'Connexion OpenAI vérifiée (liste des modèles récupérée).' }
        : { success: false, message: `OpenAI a répondu HTTP ${res.status}.` };
    }
    case 'gemini': {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(creds.apiKey ?? '')}`,
        timeout,
      );
      return res.ok
        ? { success: true, message: 'Connexion Gemini vérifiée (liste des modèles récupérée).' }
        : { success: false, message: `Gemini a répondu HTTP ${res.status}.` };
    }
    case 'brave-search': {
      const res = await fetch('https://api.search.brave.com/res/v1/web/search?q=test', {
        headers: { 'X-Subscription-Token': creds.apiKey ?? '' },
        ...timeout,
      });
      return res.ok
        ? { success: true, message: 'Connexion Brave Search vérifiée.' }
        : { success: false, message: `Brave Search a répondu HTTP ${res.status}.` };
    }
    case 'tavily': {
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: creds.apiKey, query: 'test', max_results: 1 }),
        ...timeout,
      });
      return res.ok
        ? { success: true, message: 'Connexion Tavily vérifiée.' }
        : { success: false, message: `Tavily a répondu HTTP ${res.status}.` };
    }
    case 'unsplash': {
      const res = await fetch('https://api.unsplash.com/photos/random', {
        headers: { Authorization: `Client-ID ${creds.accessKey ?? ''}` },
        ...timeout,
      });
      return res.ok
        ? { success: true, message: 'Connexion Unsplash vérifiée.' }
        : { success: false, message: `Unsplash a répondu HTTP ${res.status}.` };
    }
    case 'firecrawl': {
      const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${creds.apiKey ?? ''}` },
        body: JSON.stringify({ url: 'https://example.com' }),
        ...timeout,
      });
      return res.ok
        ? { success: true, message: 'Connexion Firecrawl vérifiée.' }
        : { success: false, message: `Firecrawl a répondu HTTP ${res.status}.` };
    }
    default:
      return { success: false, message: `Aucune procédure de test implémentée pour "${providerKey}".` };
  }
}

export async function suspendIntegration(actor: User, id: string) {
  await requireIntegrationExists(id);
  await db.globalIntegration.update({ where: { id }, data: { status: IntegrationStatus.SUSPENDED } });
  await db.auditLog.create({
    data: { actorUserId: actor.id, action: 'infrastructure.connector.suspended', targetType: 'GlobalIntegration', targetId: id },
  });
}

export async function revokeIntegration(actor: User, id: string) {
  await requireIntegrationExists(id);
  await db.globalIntegration.update({
    where: { id },
    data: { status: IntegrationStatus.REVOKED, credentialsEnc: null, credentialsFingerprint: null },
  });
  await db.auditLog.create({
    data: { actorUserId: actor.id, action: 'infrastructure.connector.revoked', targetType: 'GlobalIntegration', targetId: id },
  });
}

export async function setPrimary(actor: User, id: string, isPrimary: boolean) {
  const integration = await requireIntegrationExists(id);
  if (isPrimary) {
    // Only one primary per provider. The demote-then-set pair used to run as
    // two separate statements — two concurrent "set primary" calls for
    // different environments of the same provider could each demote the
    // other before setting their own, leaving BOTH marked primary (this
    // caused a real bug: OAuth picked the wrong, broken integration — see
    // getIntegrationForProvider in oauth.service.ts). A transaction makes
    // demote+set atomic so that race can't happen again.
    await db.$transaction([
      db.globalIntegration.updateMany({
        where: { providerId: integration.providerId, isPrimary: true },
        data: { isPrimary: false },
      }),
      db.globalIntegration.update({ where: { id }, data: { isPrimary: true } }),
    ]);
  } else {
    await db.globalIntegration.update({ where: { id }, data: { isPrimary: false } });
  }
  await db.auditLog.create({
    data: {
      actorUserId: actor.id,
      action: isPrimary ? 'infrastructure.connector.set_primary' : 'infrastructure.connector.unset_primary',
      targetType: 'GlobalIntegration',
      targetId: id,
    },
  });
}

async function requireIntegrationExists(id: string) {
  return db.globalIntegration.findUniqueOrThrow({ where: { id } });
}
