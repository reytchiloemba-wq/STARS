import Link from 'next/link';
import { db } from '@/lib/db';

export default async function ExplorePage({ params }: { params: Promise<{ org: string }> }) {
  const { org } = await params;
  const categories = await db.category.findMany({ where: { parentId: null }, orderBy: { label: 'asc' } });

  return (
    <div>
      <h1 className="text-2xl font-semibold">STARS Explore</h1>
      <p className="mt-1 text-muted-foreground">Choisissez un domaine pour découvrir ses sujets d&apos;actualité.</p>

      {categories.length === 0 ? (
        <p className="mt-8 text-muted-foreground">
          Aucun domaine n&apos;est encore configuré. Exécutez <code>npm run db:seed</code> pour charger la taxonomie de démonstration.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/w/${org}/explore/${c.key}`}
              className="rounded-xl border border-border bg-surface p-4 text-sm font-medium hover:border-accent-cyan"
            >
              {c.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
