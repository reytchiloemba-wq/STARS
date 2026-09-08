import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import type { User } from '@prisma/client';

export class SuperAdminAccessError extends Error {
  constructor(message = 'Accès refusé : privilège Super Admin requis') {
    super(message);
    this.name = 'SuperAdminAccessError';
  }
}

/**
 * The ONLY sanctioned way to gate a Super Admin action or query. Used by
 * every server action under src/app/admin/** — never check `isSuperAdmin`
 * inline elsewhere, so there is exactly one place this rule can drift.
 *
 * This governs the GLOBAL infrastructure cockpit only (spec §5, §22): it is
 * unrelated to and does not substitute for per-tenant RBAC in src/lib/rbac.ts.
 * A Super Admin has no implicit access to any tenant's private data through
 * this guard — see src/lib/tenant.ts for that boundary, which stays separate
 * on purpose (spec §22: "ne doit pas pouvoir usurper silencieusement
 * l'identité d'un tenant").
 */
export async function requireSuperAdmin(): Promise<User> {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) throw new SuperAdminAccessError('Non authentifié');

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.isSuperAdmin) throw new SuperAdminAccessError();

  return user;
}
