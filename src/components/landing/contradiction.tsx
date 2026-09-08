export default function ContradictionShowcase() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Comprendre avant de prendre position.</h2>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          STARS ne cherche pas à décider à votre place. Il vous apporte les éléments nécessaires pour construire une
          position éclairée.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-6">
          <span className="text-xs font-semibold uppercase tracking-wide text-accent-cyan">Thèse</span>
          <p className="mt-2 text-sm">Gains de productivité et création de nouveaux métiers portés par l&apos;automatisation.</p>
          <blockquote className="mt-4 border-l-2 border-border pl-3 text-sm italic text-muted-foreground">
            « Les secteurs qui adoptent tôt ces outils redéployent leurs équipes vers des tâches à plus forte valeur. »
          </blockquote>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6">
          <span className="text-xs font-semibold uppercase tracking-wide text-accent-magenta">Antithèse</span>
          <p className="mt-2 text-sm">Automatisation de tâches existantes et transitions professionnelles difficiles.</p>
          <blockquote className="mt-4 border-l-2 border-border pl-3 text-sm italic text-muted-foreground">
            « Sans accompagnement, les métiers les plus exposés n&apos;ont pas le temps de se reconvertir. »
          </blockquote>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 text-center text-xs text-muted-foreground sm:grid-cols-4">
        <span className="rounded-lg border border-border bg-surface px-3 py-2">Faits établis</span>
        <span className="rounded-lg border border-border bg-surface px-3 py-2">Experts</span>
        <span className="rounded-lg border border-border bg-surface px-3 py-2">Convergences</span>
        <span className="rounded-lg border border-border bg-surface px-3 py-2">Incertitudes</span>
      </div>
    </section>
  );
}
