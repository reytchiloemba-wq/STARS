const STEPS = [
  { n: '1', title: 'Découvrez', desc: 'STARS surveille et organise les sources.' },
  { n: '2', title: 'Analysez', desc: 'Les faits, arguments et incertitudes sont distingués.' },
  { n: '3', title: 'Confrontez', desc: 'Thèse, antithèse et avis d\'experts.' },
  { n: '4', title: 'Créez', desc: 'STARS prépare un contenu adapté à votre voix.' },
  { n: '5', title: 'Publiez', desc: 'Validez et diffusez sur vos réseaux.' },
];

export default function HowItWorks() {
  return (
    <section className="border-y border-border bg-surface/40 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">
          De l&apos;information à la publication en cinq étapes.
        </h2>
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-2xl border border-border bg-surface p-6">
              <span className="bg-start-gradient bg-clip-text text-2xl font-bold text-transparent">{s.n}</span>
              <h3 className="mt-2 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
