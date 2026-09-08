'use server';

import { db } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/super-admin';
import { revalidatePath } from 'next/cache';
import { type OrgStatus } from '@prisma/client';

export async function updateTenantStatusAction(orgId: string, status: OrgStatus) {
  await requireSuperAdmin();
  await db.organization.update({
    where: { id: orgId },
    data: { status },
  });
  revalidatePath('/admin');
  return { ok: true };
}

export async function grantCreditsAction(orgId: string, amount: number) {
  await requireSuperAdmin();
  const wallet = await db.creditWallet.upsert({
    where: { organizationId: orgId },
    create: { organizationId: orgId, balance: amount },
    update: { balance: { increment: amount } },
  });

  await db.creditTransaction.create({
    data: {
      organizationId: orgId,
      walletId: wallet.id,
      amount,
      reason: 'MANUAL_ADJUSTMENT',
      balanceAfter: wallet.balance,
      metadata: { note: 'Ajustement Super Admin STARS' },
    },
  });

  revalidatePath('/admin');
  return { ok: true, newBalance: wallet.balance };
}
