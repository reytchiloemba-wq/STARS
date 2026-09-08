import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoleName } from '@prisma/client';

// In-memory fixtures standing in for two separate tenants and their members.
const orgA = { id: 'org-a', slug: 'org-a', name: 'Tenant A' };
const orgB = { id: 'org-b', slug: 'org-b', name: 'Tenant B' };
const userA = { id: 'user-a' };
const userB = { id: 'user-b' };

const memberships = [
  { organizationId: orgA.id, userId: userA.id, role: RoleName.OWNER },
  { organizationId: orgB.id, userId: userB.id, role: RoleName.READER },
];

let currentSessionUserId: string | null = null;

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(async () => (currentSessionUserId ? { user: { id: currentSessionUserId } } : null)),
}));

vi.mock('@/lib/db', () => ({
  db: {
    organization: {
      findUnique: vi.fn(async ({ where }: { where: { slug?: string; id?: string } }) => {
        if (where.slug === orgA.slug || where.id === orgA.id) return orgA;
        if (where.slug === orgB.slug || where.id === orgB.id) return orgB;
        return null;
      }),
    },
    membership: {
      findUnique: vi.fn(async ({ where }: { where: { organizationId_userId: { organizationId: string; userId: string } } }) => {
        const { organizationId, userId } = where.organizationId_userId;
        return memberships.find((m) => m.organizationId === organizationId && m.userId === userId) ?? null;
      }),
    },
  },
}));

const { resolveTenant, requireTenantPermission, assertJobTenant, TenantAccessError } = await import('@/lib/tenant');

beforeEach(() => {
  currentSessionUserId = null;
});

describe('multi-tenant isolation guard (resolveTenant)', () => {
  it('rejects an unauthenticated caller', async () => {
    await expect(resolveTenant(orgA.slug)).rejects.toThrow(TenantAccessError);
  });

  it('rejects a request for an organization that does not exist', async () => {
    currentSessionUserId = userA.id;
    await expect(resolveTenant('does-not-exist')).rejects.toThrow(/not found/i);
  });

  it('CRITICAL: rejects a tenant-A user requesting tenant B, even though B exists', async () => {
    currentSessionUserId = userA.id;
    await expect(resolveTenant(orgB.slug)).rejects.toThrow(/not a member/i);
  });

  it('CRITICAL: rejects a tenant-B user requesting tenant A', async () => {
    currentSessionUserId = userB.id;
    await expect(resolveTenant(orgA.slug)).rejects.toThrow(TenantAccessError);
  });

  it('resolves successfully when the caller is a verified member', async () => {
    currentSessionUserId = userA.id;
    const ctx = await resolveTenant(orgA.slug);
    expect(ctx.organization.id).toBe(orgA.id);
    expect(ctx.membership.role).toBe(RoleName.OWNER);
  });

  it('never returns tenant B data for a tenant A session, no matter which slug wins the lookup race', async () => {
    currentSessionUserId = userA.id;
    const results = await Promise.allSettled([resolveTenant(orgA.slug), resolveTenant(orgB.slug)]);
    expect(results[0].status).toBe('fulfilled');
    expect(results[1].status).toBe('rejected');
  });
});

describe('requireTenantPermission', () => {
  it('blocks a verified member who lacks the required permission', async () => {
    currentSessionUserId = userB.id; // READER in org B
    await expect(requireTenantPermission(orgB.slug, 'org.administer')).rejects.toThrow(/Forbidden/);
  });

  it('allows a verified member who holds the required permission', async () => {
    currentSessionUserId = userA.id; // OWNER in org A
    const ctx = await requireTenantPermission(orgA.slug, 'org.administer');
    expect(ctx.organization.id).toBe(orgA.id);
  });
});

describe('assertJobTenant (background job / worker guard)', () => {
  it('rejects a job payload with no organizationId', async () => {
    await expect(assertJobTenant(undefined)).rejects.toThrow(/missing organizationId/i);
  });

  it('rejects a job payload referencing an unknown organization', async () => {
    await expect(assertJobTenant('org-ghost')).rejects.toThrow(/unknown organization/i);
  });

  it('accepts a job payload with a real organizationId', async () => {
    const org = await assertJobTenant(orgA.id);
    expect(org.id).toBe(orgA.id);
  });
});
