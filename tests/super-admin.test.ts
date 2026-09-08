import { describe, it, expect, vi, beforeEach } from 'vitest';

const users = [
  { id: 'user-admin', email: 'admin@stars.app', isSuperAdmin: true },
  { id: 'user-tenant', email: 'tenant-owner@stars.app', isSuperAdmin: false },
];

let currentSessionUserId: string | null = null;

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(async () => (currentSessionUserId ? { user: { id: currentSessionUserId } } : null)),
}));

vi.mock('@/lib/db', () => ({
  db: {
    user: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => users.find((u) => u.id === where.id) ?? null),
    },
  },
}));

const { requireSuperAdmin, SuperAdminAccessError } = await import('@/lib/super-admin');

beforeEach(() => {
  currentSessionUserId = null;
});

describe('requireSuperAdmin — global cockpit gate', () => {
  it('rejects an unauthenticated caller', async () => {
    await expect(requireSuperAdmin()).rejects.toThrow(SuperAdminAccessError);
  });

  it('CRITICAL: rejects a regular tenant user, even a real authenticated one', async () => {
    currentSessionUserId = 'user-tenant';
    await expect(requireSuperAdmin()).rejects.toThrow(SuperAdminAccessError);
  });

  it('allows a genuine Super Admin user', async () => {
    currentSessionUserId = 'user-admin';
    const user = await requireSuperAdmin();
    expect(user.id).toBe('user-admin');
  });

  it('rejects a session referencing a user id that no longer exists', async () => {
    currentSessionUserId = 'user-deleted-ghost';
    await expect(requireSuperAdmin()).rejects.toThrow(SuperAdminAccessError);
  });
});
