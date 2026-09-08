import { NextResponse } from 'next/server';
import { requireTenantPermission } from '@/lib/tenant';
import { startOAuthFlow, OAuthNotConfiguredError } from '@/server/services/oauth.service';
import type { SocialNetwork } from '@prisma/client';

const VALID_NETWORKS: SocialNetwork[] = ['LINKEDIN', 'FACEBOOK', 'INSTAGRAM', 'X'];

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
  if (!VALID_NETWORKS.includes(network)) {
    return NextResponse.json({ error: 'Unknown network' }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const org = searchParams.get('org');
  if (!org) return NextResponse.json({ error: 'Missing org parameter' }, { status: 400 });

  const origin = getBaseUrl(req);

  try {
    const ctx = await requireTenantPermission(org, 'social.connect');
    // Fixed, provider-registered redirect URI — org context travels via `state`, never via the URL.
    const redirectUri = `${origin}/api/oauth/${rawNetwork.toLowerCase()}/callback`;
    const { authorizeUrl } = await startOAuthFlow(ctx, network, redirectUri);
    return NextResponse.redirect(authorizeUrl);
  } catch (err) {
    if (err instanceof OAuthNotConfiguredError) {
      return NextResponse.redirect(`${origin}/w/${org}/settings/social?error=${encodeURIComponent(err.message)}`);
    }
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return NextResponse.redirect(`${origin}/w/${org}/settings/social?error=${encodeURIComponent(message)}`);
  }
}
