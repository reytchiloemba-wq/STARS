import { describe, it, expect } from 'vitest';
import { roleHasPermission, assertPermission } from '@/lib/rbac';
import { RoleName } from '@prisma/client';

describe('RBAC matrix', () => {
  it('grants OWNER every sensitive permission', () => {
    expect(roleHasPermission(RoleName.OWNER, 'org.administer')).toBe(true);
    expect(roleHasPermission(RoleName.OWNER, 'billing.manage')).toBe(true);
    expect(roleHasPermission(RoleName.OWNER, 'data.delete')).toBe(true);
  });

  it('denies READER any write or publish permission', () => {
    expect(roleHasPermission(RoleName.READER, 'draft.create')).toBe(false);
    expect(roleHasPermission(RoleName.READER, 'social.publish')).toBe(false);
    expect(roleHasPermission(RoleName.READER, 'org.administer')).toBe(false);
  });

  it('denies COMMUNITY_MANAGER billing and org administration', () => {
    expect(roleHasPermission(RoleName.COMMUNITY_MANAGER, 'billing.manage')).toBe(false);
    expect(roleHasPermission(RoleName.COMMUNITY_MANAGER, 'org.administer')).toBe(false);
    expect(roleHasPermission(RoleName.COMMUNITY_MANAGER, 'social.publish')).toBe(true);
  });

  it('assertPermission throws for a role lacking the permission', () => {
    expect(() => assertPermission(RoleName.READER, 'draft.create')).toThrow(/Forbidden/);
  });

  it('assertPermission does not throw for a role holding the permission', () => {
    expect(() => assertPermission(RoleName.ANALYST, 'analysis.create')).not.toThrow();
  });
});
