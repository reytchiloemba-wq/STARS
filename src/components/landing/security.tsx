const ITEMS = [
  'Isolation multi-tenant vérifiée par des tests automatisés',
  'Chiffrement des jetons et données sensibles',
  'Permissions granulaires par rôle',
  'Journalisation et audit',
  'OAuth officiel pour chaque réseau social',
  'Validation humaine avant toute publication',
  'Suppression des données sur demande',
  'Conformité RGPD',
  'Transparence sur les contenus générés par IA',
  'Traçabilité systématique des sources',
];

export default function Security() {
  return (
    <section id="securite" className="mx-auto max-w-6xl px-6 py-20">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
          Vos recherches, vos sources et votre stratégie restent les vôtres.
        </h2>
      </div>
      <div className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2">
        {ITEMS.map((item) => (
          <div key={item} className="flex items-start gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm">
            <span className="text-success">✓</span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
