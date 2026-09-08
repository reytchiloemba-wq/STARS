import Link from 'next/link';

export default function StatusPage() {
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-16 text-center">
      <Link href="/" className="bg-start-gradient bg-clip-text text-lg font-bold text-transparent">
        STARS
      </Link>
      <h1 className="mt-6 text-3xl font-bold tracking-tight">Statut des services</h1>
      <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-success/40 bg-success/10 px-4 py-2 text-sm text-success">
        <span className="h-2 w-2 rounded-full bg-success" /> Aucun incident connu
      </p>
      <p className="mt-6 text-sm text-muted-foreground">
        Cette page est un espace réservé. Une page de statut opérationnelle (historique d&apos;incidents, disponibilité
        par composant) reste à connecter à un fournisseur de monitoring dédié.
      </p>
    </main>
  );
}
