import Link from 'next/link';
import { resolveTenant } from '@/lib/tenant';
import { listDomainTopics } from '@/server/services/search.service';

export default async function ExploreCategoryPage({
  params,
}: {
  params: Promise<{ org: string; category: string }>;
}) {
  const { org, category } = await params;
  const ctx = await resolveTenant(org);
  const topics = await listDomainTopics(ctx, category);

  return (
    <div>
      <Link href={`/w/${org}/explore`} className="text-sm text-accent-cyan hover:underline">
        ← Tous les domaines
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">{category}</h1>

      <div className="mt-6 space-y-3">
        {topics.map((t) => (
          <div key={t.id} className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
            <div>
              <div className="flex items-center gap-2 font-medium">
                {t.title}
                <span className="demo-badge">Démonstration</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{t.summary}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {t.sourceCount} sources · {t.countries.join(', ')}
              </p>
            </div>
            <Link
              href={`/w/${org}/direct?q=${encodeURIComponent(t.title)}`}
              className="shrink-0 rounded-lg bg-start-gradient px-4 py-2 text-sm font-medium text-white"
            >
              Analyser
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
