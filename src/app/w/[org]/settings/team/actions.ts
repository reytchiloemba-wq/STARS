'use server';

import { randomBytes } from 'node:crypto';
import { requireTenantPermission } from '@/lib/tenant';
import { db } from '@/lib/db';
import { RoleName } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function inviteMemberAction(orgSlug: string, formData: FormData) {
  const ctx = await requireTenantPermission(orgSlug, 'members.invite');

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const role = String(formData.get('role') ?? 'READER') as RoleName;
  if (!email) return;

  await db.invitation.upsert({
    where: { organizationId_email: { organizationId: ctx.organization.id, email } },
    create: {
      organizationId: ctx.organization.id,
      email,
      role,
      token: randomBytes(24).toString('hex'),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    update: {
      role,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  revalidatePath(`/w/${orgSlug}/settings/team`);
}
