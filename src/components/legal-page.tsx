import Link from 'next/link';

export default function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-16">
      <Link href="/" className="bg-start-gradient bg-clip-text text-lg font-bold text-transparent">
        STARS
      </Link>
      <h1 className="mt-6 text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
        Modèle indicatif — ce texte doit être validé par un juriste avant mise en production.
      </p>
      <div className="mt-8 space-y-4 text-sm leading-relaxed text-muted-foreground [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground">
        {children}
      </div>
    </main>
  );
}
