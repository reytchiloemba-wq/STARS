const DOMAINS = ['Économie', 'Intelligence artificielle', 'Immobilier', 'Supply chain', 'Santé', 'Énergie', 'Géopolitique'];

export default function DualPath() {
  return (
    <section id="parcours" className="mx-auto max-w-6xl px-6 py-20">
      <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">
        Commencez par un sujet ou laissez STARS vous montrer ce qui compte.
      </h2>

      <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-accent-cyan/40 bg-surface p-8">
          <span className="demo-badge !border-accent-cyan/40 !bg-accent-cyan/10 !text-accent-cyan">STARS Direct</span>
          <h3 className="mt-3 text-xl font-semibold">Vous connaissez votre sujet ? Saisissez-le.</h3>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>• Question libre</li>
            <li>• Événement</li>
            <li>• Entreprise</li>
            <li>• Réglementation</li>
            <li>• Technologie</li>
            <li>• URL</li>
          </ul>
          <a href="/register" className="mt-6 inline-block rounded-lg bg-start-gradient px-5 py-2.5 text-sm font-medium text-white">
            Analyser un sujet
          </a>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-8">
          <span className="demo-badge !border-accent-violet/40 !bg-accent-violet/10 !text-accent-violet">STARS Explore</span>
          <h3 className="mt-3 text-xl font-semibold">Vous cherchez l&apos;inspiration ? Explorez un domaine.</h3>
          <div className="mt-4 flex flex-wrap gap-2">
            {DOMAINS.map((d) => (
              <span key={d} className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                {d}
              </span>
            ))}
          </div>
          <a href="/register" className="mt-6 inline-block rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:border-accent-cyan">
            Explorer l&apos;actualité
          </a>
        </div>
      </div>
    </section>
  );
}
