import { NextResponse } from 'next/server';
import { completeOAuthFlow, logOAuthOutcome, OAuthCallbackError, OAuthNotConfiguredError } from '@/server/services/oauth.service';
import { db } from '@/lib/db';
import type { SocialNetwork } from '@prisma/client';

function getBaseUrl(req: Request): string {
  const forwardedProto = req.headers.get('x-forwarded-proto');
  const forwardedHost = req.headers.get('x-forwarded-host');
  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  const host = req.headers.get('host');
  if (host) {
    const proto = host.includes('localhost') ? 'http' : 'https';
    return `${proto}://${host}`;
  }
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

export async function GET(req: Request, { params }: { params: Promise<{ network: string }> }) {
  const { network: rawNetwork } = await params;
  const network = rawNetwork.toUpperCase() as SocialNetwork;

  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const providerError = searchParams.get('error_description') ?? searchParams.get('error');

  let origin = getBaseUrl(req);
  let orgSlug: string | null = null;
  let orgId: string | null = null;

  if (state) {
    try {
      const stateRow = await db.oAuthState.findUnique({
        where: { state },
        include: { organization: true },
      });
      if (stateRow?.redirectUri) {
        try {
          origin = new URL(stateRow.redirectUri).origin;
        } catch {}
      }
      if (stateRow?.organization?.slug) {
        orgSlug = stateRow.organization.slug;
        orgId = stateRow.organization.id;
      }
    } catch {}
  }

  // Every outcome below is persisted to AuditLog (see oauth.service.ts) —
  // a prior version only ever logged failures to console.error, which is
  // only visible in the hosting provider's function logs, not queryable
  // from the app. A report of "nothing happens after Facebook consent" was
  // previously undiagnosable without shell access to the deployment.
  const errorRedirect = (msg: string) => {
    void logOAuthOutcome({ organizationId: orgId, network, outcome: 'failed', message: msg });
    if (orgSlug) {
      return NextResponse.redirect(`${origin}/w/${orgSlug}/settings/social?error=${encodeURIComponent(msg)}`);
    }
    return NextResponse.redirect(`${origin}/login?oauthError=${encodeURIComponent(msg)}`);
  };

  if (providerError) {
    return errorRedirect(providerError);
  }
  if (!code || !state) {
    return errorRedirect('Réponse OAuth incomplète.');
  }

  try {
    const { organizationId } = await completeOAuthFlow(network, code, state);
    const org = await db.organization.findUniqueOrThrow({ where: { id: organizationId } });
    await logOAuthOutcome({ organizationId, network, outcome: 'connected', message: 'Connexion OAuth réussie.' });
    return NextResponse.redirect(`${origin}/w/${org.slug}/settings/social?connected=${rawNetwork.toLowerCase()}`);
  } catch (err) {
    if (err instanceof OAuthCallbackError || err instanceof OAuthNotConfiguredError) {
      return errorRedirect(err.message);
    }
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return errorRedirect(message);
  }
}
