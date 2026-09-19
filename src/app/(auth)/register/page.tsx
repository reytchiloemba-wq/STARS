import Link from 'next/link';

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-start-glow px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-xl text-center">
        <Link href="/" className="bg-start-gradient bg-clip-text text-2xl font-bold text-transparent">
          STARS
        </Link>
        <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-accent-cyan/30 bg-accent-cyan/10 px-3 py-1 text-xs font-semibold text-accent-cyan">
          <span>Accès Réservé</span>
        </div>

        <h1 className="mt-4 text-xl font-bold text-white">Inscription des Organisations</h1>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          L&apos;inscription et le provisionnement des organisations (tenants) sont administrés de manière centralisée par l&apos;équipe STARS.
        </p>

        <div className="mt-6 rounded-xl border border-border/70 bg-surface-raised/60 p-4 text-left text-xs text-muted-foreground space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-accent-cyan font-bold">•</span>
            <span>
              <strong className="text-foreground">Déjà invité ?</strong> Connectez-vous avec les identifiants transmis par votre administrateur.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-accent-cyan font-bold">•</span>
            <span>
              <strong className="text-foreground">Nouveau tenant ?</strong> Contactez l&apos;administration STARS pour activer votre espace.
            </span>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <Link
            href="/contact-sales"
            className="w-full rounded-xl bg-start-gradient px-4 py-2.5 text-sm font-bold text-white shadow-md transition hover:opacity-95"
          >
            Demander une ouverture d&apos;accès
          </Link>
          <Link
            href="/login"
            className="w-full rounded-xl border border-border/80 bg-surface-raised px-4 py-2.5 text-sm font-medium text-foreground transition hover:border-accent-cyan"
          >
            Accéder à la connexion
          </Link>
        </div>

        <div className="mt-8 border-t border-border/60 pt-4 text-xs text-muted-foreground">
          <Link href="/#tarifs" className="hover:text-foreground underline underline-offset-4">
            Consulter les forfaits et la tarification STARS
          </Link>
        </div>
      </div>
    </main>
  );
}
