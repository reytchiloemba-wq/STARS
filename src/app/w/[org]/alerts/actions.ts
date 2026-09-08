'use server';

import { requireTenantPermission } from '@/lib/tenant';
import { db } from '@/lib/db';
import { type WatchlistKind } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function createWatchlistAction(
  orgSlug: string,
  data: { label: string; kind: WatchlistKind; value: string },
) {
  try {
    const ctx = await requireTenantPermission(orgSlug, 'org.administer');
    const created = await db.watchlist.create({
      data: {
        organizationId: ctx.organization.id,
        label: data.label,
        kind: data.kind,
        value: data.value,
      },
    });
    revalidatePath(`/w/${orgSlug}/alerts`);
    return { ok: true, item: created };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erreur' };
  }
}

export async function deleteWatchlistAction(orgSlug: string, id: string) {
  try {
    const ctx = await requireTenantPermission(orgSlug, 'org.administer');
    await db.watchlist.deleteMany({
      where: { id, organizationId: ctx.organization.id },
    });
    revalidatePath(`/w/${orgSlug}/alerts`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erreur' };
  }
}

export async function createAlertAction(
  orgSlug: string,
  data: { label: string; triggerKeyword: string },
) {
  try {
    const ctx = await requireTenantPermission(orgSlug, 'org.administer');
    const alert = await db.alert.create({
      data: {
        organizationId: ctx.organization.id,
        label: data.label,
        triggerRule: { keyword: data.triggerKeyword },
        isActive: true,
      },
    });
    revalidatePath(`/w/${orgSlug}/alerts`);
    return { ok: true, alert };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erreur' };
  }
}

export async function toggleAlertAction(orgSlug: string, id: string, isActive: boolean) {
  try {
    const ctx = await requireTenantPermission(orgSlug, 'org.administer');
    await db.alert.updateMany({
      where: { id, organizationId: ctx.organization.id },
      data: { isActive },
    });
    revalidatePath(`/w/${orgSlug}/alerts`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erreur' };
  }
}
