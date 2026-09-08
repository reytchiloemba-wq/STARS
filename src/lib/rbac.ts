import type { RoleName } from '@prisma/client';

// Granular permission keys (see spec §4 "Membres, équipes et rôles").
export type Permission =
  | 'news.view'
  | 'search.direct.run'
  | 'analysis.create'
  | 'sources.view'
  | 'draft.create'
  | 'draft.edit'
  | 'draft.approve'
  | 'social.connect'
  | 'social.publish'
  | 'social.schedule'
  | 'analytics.view'
  | 'members.invite'
  | 'billing.manage'
  | 'brandvoice.edit'
  | 'data.export'
  | 'data.delete'
  | 'org.administer';

// Baseline RBAC matrix for the fixed RoleName enum. Business/Enterprise tenants
// may layer CustomRole permission sets on top (see prisma schema `CustomRole`),
// but every fixed role below always resolves deterministically — a custom role
// only ever narrows or extends, it can never spoof OWNER-level org admin rights.
const MATRIX: Record<RoleName, Permission[]> = {
  OWNER: [
    'news.view', 'search.direct.run', 'analysis.create', 'sources.view',
    'draft.create', 'draft.edit', 'draft.approve',
    'social.connect', 'social.publish', 'social.schedule',
    'analytics.view', 'members.invite', 'billing.manage', 'brandvoice.edit',
    'data.export', 'data.delete', 'org.administer',
  ],
  ADMIN: [
    'news.view', 'search.direct.run', 'analysis.create', 'sources.view',
    'draft.create', 'draft.edit', 'draft.approve',
    'social.connect', 'social.publish', 'social.schedule',
    'analytics.view', 'members.invite', 'brandvoice.edit',
    'data.export', 'org.administer',
  ],
  BILLING_MANAGER: ['news.view', 'billing.manage'],
  EDITOR_IN_CHIEF: [
    'news.view', 'search.direct.run', 'analysis.create', 'sources.view',
    'draft.create', 'draft.edit', 'draft.approve', 'social.schedule',
    'analytics.view', 'brandvoice.edit',
  ],
  ANALYST: ['news.view', 'search.direct.run', 'analysis.create', 'sources.view', 'analytics.view'],
  JOURNALIST: ['news.view', 'search.direct.run', 'analysis.create', 'sources.view', 'draft.create', 'draft.edit'],
  FACT_CHECKER: ['news.view', 'sources.view', 'draft.edit'],
  WRITER: ['news.view', 'sources.view', 'draft.create', 'draft.edit'],
  APPROVER: ['news.view', 'draft.approve', 'analytics.view'],
  COMMUNITY_MANAGER: ['news.view', 'draft.create', 'draft.edit', 'social.publish', 'social.schedule', 'analytics.view'],
  READER: ['news.view', 'analytics.view'],
};

export function roleHasPermission(role: RoleName, permission: Permission): boolean {
  return MATRIX[role]?.includes(permission) ?? false;
}

export function assertPermission(role: RoleName, permission: Permission): void {
  if (!roleHasPermission(role, permission)) {
    throw new Error(`Forbidden: role ${role} lacks permission ${permission}`);
  }
}
