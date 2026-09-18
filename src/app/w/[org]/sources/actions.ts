'use server';

import { resolveTenant } from '@/lib/tenant';
import { SourceIngestionService } from '@/server/services/source-ingestion.service';
import { revalidatePath } from 'next/cache';

export async function ingestSourceAction(orgSlug: string, sourceId: string) {
  const ctx = await resolveTenant(orgSlug);

  const result = await SourceIngestionService.ingestSource(sourceId, {
    maxArticles: 3,
    organizationId: ctx.organization.id,
  });

  revalidatePath(`/w/${orgSlug}/sources`);
  revalidatePath(`/w/${orgSlug}/radar`);

  return {
    success: true,
    message: `${result.articlesSaved} article(s) extrait(s) et sauvegardé(s) depuis ${result.sourceName}.`,
    articlesSaved: result.articlesSaved,
    isDemoData: result.isDemoData,
  };
}

export async function ingestArticleUrlAction(orgSlug: string, url: string) {
  const ctx = await resolveTenant(orgSlug);

  if (!url || !url.startsWith('http')) {
    throw new Error('URL invalide.');
  }

  const result = await SourceIngestionService.ingestArticleUrl(url, {
    organizationId: ctx.organization.id,
  });

  revalidatePath(`/w/${orgSlug}/sources`);
  revalidatePath(`/w/${orgSlug}/radar`);

  return {
    success: true,
    message: `Article « ${result.title} » ingéré avec succès.`,
    articleId: result.articleId,
    title: result.title,
    isDemoData: result.isDemoData,
  };
}

export async function ingestAllMonitoredSourcesAction(orgSlug: string) {
  const ctx = await resolveTenant(orgSlug);

  const result = await SourceIngestionService.ingestMonitoredSources({
    organizationId: ctx.organization.id,
    maxPerSource: 2,
  });

  revalidatePath(`/w/${orgSlug}/sources`);
  revalidatePath(`/w/${orgSlug}/radar`);

  return {
    success: true,
    message: `Ingestion terminée : ${result.totalArticlesSaved} articles sauvegardés sur ${result.sourcesProcessed} sources.`,
    totalSaved: result.totalArticlesSaved,
  };
}
