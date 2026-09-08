'use server';

import { requireTenantPermission } from '@/lib/tenant';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function toggleFollowDomainAction(orgSlug: string, categoryId: string, isFollowed: boolean) {
  try {
    const ctx = await requireTenantPermission(orgSlug, 'org.administer');
    if (isFollowed) {
      await db.organizationDomain.upsert({
        where: {
          organizationId_categoryId: {
            organizationId: ctx.organization.id,
            categoryId,
          },
        },
        create: {
          organizationId: ctx.organization.id,
          categoryId,
          keywords: [],
          exclusions: [],
          territories: [],
          languages: [],
        },
        update: {},
      });
    } else {
      await db.organizationDomain.deleteMany({
        where: {
          organizationId: ctx.organization.id,
          categoryId,
        },
      });
    }
    revalidatePath(`/w/${orgSlug}/domains`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erreur' };
  }
}

export async function updateDomainFiltersAction(
  orgSlug: string,
  categoryId: string,
  data: {
    keywords: string[];
    exclusions: string[];
    territories: string[];
  },
) {
  try {
    const ctx = await requireTenantPermission(orgSlug, 'org.administer');
    await db.organizationDomain.upsert({
      where: {
        organizationId_categoryId: {
          organizationId: ctx.organization.id,
          categoryId,
        },
      },
      create: {
        organizationId: ctx.organization.id,
        categoryId,
        keywords: data.keywords,
        exclusions: data.exclusions,
        territories: data.territories,
        languages: [],
      },
      update: {
        keywords: data.keywords,
        exclusions: data.exclusions,
        territories: data.territories,
      },
    });
    revalidatePath(`/w/${orgSlug}/domains`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erreur' };
  }
}
