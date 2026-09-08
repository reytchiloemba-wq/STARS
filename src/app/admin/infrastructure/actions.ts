'use server';

import { requireSuperAdmin } from '@/lib/super-admin';
import {
  saveIntegrationCredentials,
  testGlobalIntegration,
  suspendIntegration,
  revokeIntegration,
  setPrimary,
} from '@/server/services/infrastructure.service';
import type { IntegrationEnvironment } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function saveConnectorAction(formData: FormData) {
  const actor = await requireSuperAdmin();

  const providerKey = String(formData.get('providerKey'));
  const environment = String(formData.get('environment') || 'TEST') as IntegrationEnvironment;
  const fieldKeysRaw = formData.get('fieldKeys');
  const fieldKeys = String(fieldKeysRaw ?? '').split(',').filter(Boolean);

  const credentials: Record<string, string> = {};
  for (const key of fieldKeys) {
    const value = formData.get(`cred_${key}`);
    if (typeof value === 'string' && value.trim()) credentials[key] = value.trim();
  }

  await saveIntegrationCredentials(actor, providerKey, environment, credentials, null);
  revalidatePath('/admin/infrastructure');
  return { ok: true };
}

export async function testConnectorAction(id: string) {
  const actor = await requireSuperAdmin();
  const result = await testGlobalIntegration(actor, id);
  revalidatePath('/admin/infrastructure');
  return result;
}

export async function suspendConnectorAction(id: string) {
  const actor = await requireSuperAdmin();
  await suspendIntegration(actor, id);
  revalidatePath('/admin/infrastructure');
  return { ok: true };
}

export async function revokeConnectorAction(id: string) {
  const actor = await requireSuperAdmin();
  await revokeIntegration(actor, id);
  revalidatePath('/admin/infrastructure');
  return { ok: true };
}

export async function setPrimaryConnectorAction(id: string, isPrimary: boolean) {
  const actor = await requireSuperAdmin();
  await setPrimary(actor, id, isPrimary);
  revalidatePath('/admin/infrastructure');
  return { ok: true };
}
