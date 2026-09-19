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

export async function createTenantByAdminAction(formData: FormData) {
  const adminUser = await requireSuperAdmin();
  const organizationName = String(formData.get('organizationName') || '');
  const ownerName = String(formData.get('ownerName') || '');
  const ownerEmail = String(formData.get('ownerEmail') || '');
  const password = String(formData.get('password') || '');
  const planKey = String(formData.get('planKey') || 'discovery');
  const billingCycle = (String(formData.get('billingCycle') || 'MONTHLY') === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY') as 'MONTHLY' | 'ANNUAL';
  const customCreditsStr = formData.get('customCredits');
  const customCredits = customCreditsStr ? Number(customCreditsStr) : undefined;
  
  // B2B KYC Fields
  const registrationNumber = String(formData.get('registrationNumber') || '').trim() || undefined;
  const vatNumber = String(formData.get('vatNumber') || '').trim() || undefined;
  const country = String(formData.get('country') || '').trim() || undefined;
  const city = String(formData.get('city') || '').trim() || undefined;
  const industry = String(formData.get('industry') || '').trim() || undefined;
  const website = String(formData.get('website') || '').trim() || undefined;
  const ownerJobTitle = String(formData.get('ownerJobTitle') || '').trim() || undefined;
  const ownerPhone = String(formData.get('ownerPhone') || '').trim() || undefined;
  const poNumber = String(formData.get('poNumber') || '').trim() || undefined;
  const paymentMethod = String(formData.get('paymentMethod') || '').trim() || undefined;
  const customSlug = String(formData.get('customSlug') || '').trim() || undefined;
  const retentionDaysStr = formData.get('retentionPolicyDays');
  const retentionPolicyDays = retentionDaysStr ? Number(retentionDaysStr) : undefined;
  const editorialCharter = String(formData.get('editorialCharter') || '').trim() || undefined;
  const internalNotes = String(formData.get('internalNotes') || '').trim() || undefined;

  const { createTenantByAdmin } = await import('@/server/services/organization.service');
  const result = await createTenantByAdmin({
    organizationName,
    ownerName,
    ownerEmail,
    password: password || undefined,
    planKey,
    billingCycle,
    customCredits,
    adminUserId: adminUser.id,
    registrationNumber,
    vatNumber,
    country,
    city,
    industry,
    website,
    ownerJobTitle,
    ownerPhone,
    poNumber,
    paymentMethod,
    customSlug,
    retentionPolicyDays,
    editorialCharter,
    internalNotes,
  });

  revalidatePath('/admin');
  return {
    ok: true,
    tenant: {
      id: result.organization.id,
      name: result.organization.name,
      slug: result.organization.slug,
      status: result.organization.status,
      ownerEmail: result.user.email,
      ownerName: result.user.name,
      ownerJobTitle,
      ownerPhone,
      planName: result.planName,
      billingCycle: result.billingCycle,
      initialCredits: result.initialCredits,
      plainPassword: result.plainPassword,
      registrationNumber,
      country,
      city,
      industry,
      website,
      poNumber,
      paymentMethod,
    },
  };
}

