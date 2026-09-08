import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import type { Membership, Organization, RoleName } from '@prisma/client';
import { type Permission, assertPermission } from '@/lib/rbac';

export class TenantAccessError extends Error {
  constructor(message = 'Forbidden: no verified access to this organization') {
    super(message);
    this.name = 'TenantAccessError';
  }
}

export interface TenantContext {
  userId: string;
  organization: Organization;
  membership: Membership;
}

/**
 * The ONLY sanctioned way to resolve "which tenant is this request for".
 *
 * A slug/organizationId arriving from the client (route param, form field,
 * request body) is never trusted on its own — it is only ever used as a
 * lookup key, and the membership row proving `userId` belongs to that
 * organization must be found server-side before any tenant-scoped query
 * runs. If no verified membership exists, this throws rather than falling
 * back to any default org.
 */
export async function resolveTenant(orgSlug: string): Promise<TenantContext> {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) throw new TenantAccessError('Not authenticated');

  const organization = await db.organization.findUnique({ where: { slug: orgSlug } });
  if (!organization) throw new TenantAccessError('Organization not found');

  const membership = await db.membership.findUnique({
    where: { organizationId_userId: { organizationId: organization.id, userId } },
  });
  if (!membership) throw new TenantAccessError('User is not a member of this organization');

  return { userId, organization, membership };
}

/** Resolve tenant context AND assert the caller holds `permission`. */
export async function requireTenantPermission(
  orgSlug: string,
  permission: Permission,
): Promise<TenantContext> {
  const ctx = await resolveTenant(orgSlug);
  assertPermission(ctx.membership.role, permission);
  return ctx;
}

/**
 * Guard for background jobs / webhooks / queue consumers: every job payload
 * must carry an organizationId, and it is re-verified against the DB (not
 * merely trusted from the payload) before the job is allowed to touch any
 * tenant-scoped table. Jobs missing a valid organizationId are rejected.
 */
export async function assertJobTenant(organizationId: string | undefined | null) {
  if (!organizationId) throw new TenantAccessError('Job payload missing organizationId');
  const org = await db.organization.findUnique({ where: { id: organizationId } });
  if (!org) throw new TenantAccessError('Job references an unknown organization');
  return org;
}

export function requireRole(membership: Membership, allowed: RoleName[]) {
  if (!allowed.includes(membership.role)) {
    throw new TenantAccessError(`Role ${membership.role} is not permitted for this action`);
  }
}
