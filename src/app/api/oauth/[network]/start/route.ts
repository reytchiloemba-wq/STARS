import { NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/tenant';
import { startOAuthFlow, OAuthNotConfiguredError } from '@/server/services/oauth.service';
import type { SocialNetwork } from '@prisma/client';

const VALID_NETWORKS: SocialNetwork[] = ['LINKEDIN', 'FACEBOOK', 'INSTAGRAM', 'X'];

/**
 * The redirect_uri sent to a social provider MUST be a fixed value that
 * exactly matches one of the "Valid OAuth Redirect URIs" registered in that
 * provider's developer console — it is deliberately NOT derived from the
 * current request's Host header. A prior version used the request's Host
 * (via x-forwarded-host / host), which computes a *different* redirect_uri
 * depending on which domain alias the user happens to be browsing from
 * (custom domain, Vercel's default *.vercel.app domain, or — worse — a
 * fresh, unique preview-deployment URL that changes on every push). Meta
 * can only be given a finite, stable allowlist; it correctly rejected any
 * value outside it ("URL bloquée … l'URI de redirection n'est pas
 * autorisée"). Fix: always use NEXTAUTH_URL — set it in Vercel's
 * environment variables to your one stable production domain, and register
 * `${NEXTAUTH_URL}/api/oauth/<network>/callback` (lowercase network) as the
 * redirect URI in Meta/LinkedIn/X's developer settings. The Host-header
 * fallback below only exists for local dev, where NEXTAUTH_URL is always
 * set anyway (see .env.example) — it's never reached in production once
 * NEXTAUTH_URL is configured correctly.
 */
function getCanonicalOrigin(req: Request): string {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;

  const forwardedProto = req.headers.get('x-forwarded-proto');
  const forwardedHost = req.headers.get('x-forwarded-host');
  if (forwardedProto && forwardedHost) return `${forwardedProto}://${forwardedHost}`;
  const host = req.headers.get('host');
  if (host) return `${host.includes('localhost') ? 'http' : 'https'}://${host}`;

  return 'http://localhost:3000';
}

export async function GET(req: Request, { params }: { params: Promise<{ network: string }> }) {
  const { network: rawNetwork } = await params;
  const network = rawNetwork.toUpperCase() as SocialNetwork;
  if (!VALID_NETWORKS.includes(network)) {
    return NextResponse.json({ error: 'Unknown network' }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const org = searchParams.get('org');
  if (!org) return NextResponse.json({ error: 'Missing org parameter' }, { status: 400 });

  // Used only to redirect the browser back somewhere sensible on error —
  // never for the OAuth redirect_uri itself (see getCanonicalOrigin above).
  const requestOrigin = req.headers.get('x-forwarded-host')
    ? `${req.headers.get('x-forwarded-proto') ?? 'https'}://${req.headers.get('x-forwarded-host')}`
    : new URL(req.url).origin;

  try {
    const ctx = await requireTenantPermission(org, 'social.connect');
    const redirectUri = `${getCanonicalOrigin(req)}/api/oauth/${rawNetwork.toLowerCase()}/callback`;
    const { authorizeUrl } = await startOAuthFlow(ctx, network, redirectUri);
    return NextResponse.redirect(authorizeUrl);
  } catch (err) {
    if (err instanceof OAuthNotConfiguredError) {
      return NextResponse.redirect(`${requestOrigin}/w/${org}/settings/social?error=${encodeURIComponent(err.message)}`);
    }
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return NextResponse.redirect(`${requestOrigin}/w/${org}/settings/social?error=${encodeURIComponent(message)}`);
  }
}
