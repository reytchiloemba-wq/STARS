const NETWORKS = [
  { name: 'LinkedIn', color: 'border-[#0A66C2]/40 bg-[#0A66C2]/10 text-[#0A66C2]', icon: '💼' },
  { name: 'X / Twitter', color: 'border-white/30 bg-white/10 text-white', icon: '𝕏' },
  { name: 'Instagram Pro', color: 'border-[#E4405F]/40 bg-[#E4405F]/10 text-[#E4405F]', icon: '📸' },
  { name: 'Facebook Pages', color: 'border-[#1877F2]/40 bg-[#1877F2]/10 text-[#1877F2]', icon: '👥' },
];

const FEATURES = [
  {
    icon: '🎙️',
    title: 'Brand Voice Studio',
    description: 'Ton, vocabulaire métier, curseur d’audace et signature propre à votre marque, intégrés et respectés à chaque génération.',
    tag: 'Identité Protégée',
  },
  {
    icon: '⚡',
    title: '5 Variantes Instantanées',
    description: 'Concise, experte, dirigeante, pédagogique ou forte en engagement. Comparez, éditez et fusionnez en un clic avant publication.',
    tag: 'Multi-Angles',
  },
  {
    icon: '🛡️',
    title: 'Fact-Checking & Sources Certifiées',
    description: 'Chaque affirmation est reliée à ses sources vérifiées. Intégrez vos illustrations sous licence Unsplash/Pexels ou générées par IA.',
    tag: 'Traçabilité Totale',
  },
];

export default function EditorialStudioShowcase() {
  return (
    <section className="relative border-y border-white/[0.08] bg-surface/40 py-24 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <div className="text-center">
          <span className="text-xs font-bold uppercase tracking-widest text-accent-cyan">
            Atelier de Création
          </span>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Votre analyse. Votre voix. Chaque réseau.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Le Studio Éditorial transforme la complexité de l’actualité en une stratégie de contenu impactante et rigoureusement sourcée.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="glass-card flex flex-col justify-between rounded-2xl p-7"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-start-gradient text-xl shadow-md shadow-accent-cyan/10">
                    {f.icon}
                  </span>
                  <span className="rounded-full border border-border/80 bg-surface-raised px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                    {f.tag}
                  </span>
                </div>
                <h3 className="mt-5 font-display text-lg font-bold text-white">{f.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{f.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Canaux de diffusion connectés */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-3.5">
          {NETWORKS.map((n) => (
            <div
              key={n.name}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold backdrop-blur-md transition-transform hover:scale-105 ${n.color}`}
            >
              <span className="text-sm">{n.icon}</span>
              <span>{n.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
