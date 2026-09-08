'use server';

import { requireTenantPermission } from '@/lib/tenant';
import { BrandVoiceService } from '@/server/services/brandvoice.service';
import { revalidatePath } from 'next/cache';

export async function createBrandVoiceAction(
  orgSlug: string,
  data: {
    name: string;
    sector?: string;
    audience?: string;
    values: string[];
    tone?: string;
    preferredVocabulary: string[];
    forbiddenTerms: string[];
    technicalLevel?: string;
    boldnessLevel?: number;
    signature?: string;
    hashtags: string[];
    callToAction?: string;
  },
) {
  try {
    const ctx = await requireTenantPermission(orgSlug, 'brandvoice.edit');
    const created = await BrandVoiceService.create({
      organizationId: ctx.organization.id,
      ...data,
    });
    revalidatePath(`/w/${orgSlug}/brand-voice`);
    return { ok: true, brandVoice: created };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erreur de création' };
  }
}

export async function deleteBrandVoiceAction(orgSlug: string, id: string) {
  try {
    const ctx = await requireTenantPermission(orgSlug, 'brandvoice.edit');
    await BrandVoiceService.delete(ctx.organization.id, id);
    revalidatePath(`/w/${orgSlug}/brand-voice`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erreur de suppression' };
  }
}
