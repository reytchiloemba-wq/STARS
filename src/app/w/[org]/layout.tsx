import { resolveTenant, TenantAccessError, type TenantContext } from '@/lib/tenant';
import { listOrganizationsForUser } from '@/server/services/organization.service';
import WorkspaceShell from '@/components/workspace-shell';

function AccessDenied() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 text-center">
      <div>
        <h1 className="text-xl font-semibold">Accès refusé</h1>
        <p className="mt-2 text-muted-foreground">
          Vous n&apos;avez pas accès à cette organisation, ou elle n&apos;existe pas.
        </p>
        <a href="/login" className="mt-4 inline-block text-accent-cyan hover:underline">
          Retour à la connexion
        </a>
      </div>
    </main>
  );
}

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ org: string }>;
}) {
  const { org } = await params;

  let ctx: TenantContext;
  try {
    ctx = await resolveTenant(org);
  } catch (err) {
    if (err instanceof TenantAccessError) return <AccessDenied />;
    throw err;
  }

  const memberships = await listOrganizationsForUser(ctx.userId);

  return (
    <WorkspaceShell
      activeOrgSlug={org}
      activeOrgName={ctx.organization.name}
      role={ctx.membership.role}
      organizations={memberships.map((m) => ({ slug: m.organization.slug, name: m.organization.name }))}
    >
      {children}
    </WorkspaceShell>
  );
}
