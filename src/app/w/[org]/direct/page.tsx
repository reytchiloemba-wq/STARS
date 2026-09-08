import DirectSearchForm from '@/components/direct-search-form';

export default async function DirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ org: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { org } = await params;
  const { q } = await searchParams;

  return (
    <div>
      <h1 className="text-2xl font-semibold">STARS Direct</h1>
      <p className="mt-1 text-muted-foreground">
        Saisissez librement un sujet à analyser. STARS Direct et STARS Explore convergent vers le même dossier d&apos;analyse.
      </p>
      <div className="mt-6">
        <DirectSearchForm org={org} initialQuery={q} />
      </div>
    </div>
  );
}
