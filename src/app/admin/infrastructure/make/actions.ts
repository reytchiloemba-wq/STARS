'use server';

import { revalidatePath } from 'next/cache';
import { requireSuperAdmin } from '@/lib/super-admin';
import { saveMakeConfiguration, updateScenario, testMakeScenario } from '@/server/services/make/admin.service';
import type { OrchestrationMode } from '@/server/services/make/types';

export async function saveMakeConfigAction(formData: FormData) {
  await requireSuperAdmin();

  const organizationIdMake = (formData.get('organizationIdMake') as string) || undefined;
  const teamId = (formData.get('teamId') as string) || undefined;
  const apiToken = (formData.get('apiToken') as string) || undefined;
  const webhookSecret = (formData.get('webhookSecret') as string) || undefined;
  const region = (formData.get('region') as string) || 'eu1';
  const isEnabled = formData.get('isEnabled') === 'on';
  const fallbackMode = (formData.get('fallbackMode') as OrchestrationMode) || undefined;

  await saveMakeConfiguration({
    organizationIdMake,
    teamId,
    apiToken,
    webhookSecret,
    region,
    isEnabled,
    fallbackMode,
  });

  revalidatePath('/admin/infrastructure/make');
  return { success: true };
}

export async function updateScenarioAction(
  id: string,
  data: {
    scenarioId?: string;
    webhookUrl?: string;
    version?: string;
    isActive?: boolean;
    isPrimary?: boolean;
    fallbackMode?: OrchestrationMode;
    timeoutMs?: number;
  },
) {
  await requireSuperAdmin();
  await updateScenario(id, data);
  revalidatePath('/admin/infrastructure/make');
  return { success: true };
}

export async function testScenarioAction(id: string) {
  await requireSuperAdmin();
  const result = await testMakeScenario(id);
  revalidatePath('/admin/infrastructure/make');
  return result;
}
