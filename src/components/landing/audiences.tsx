const AUDIENCES = [
  { title: 'Dirigeants', benefit: "Une prise de parole stratégique préparée en quelques minutes, jamais publiée sans votre validation." },
  { title: 'Consultants', benefit: "Démontrez votre expertise sectorielle avec des analyses sourcées, pas de simples reformulations." },
  { title: 'Créateurs', benefit: "Ne partez jamais d'une page blanche : un flux d'idées vérifiées, prêtes à être façonnées." },
  { title: 'Équipes communication', benefit: "Un calendrier éditorial partagé, des workflows de validation et une voix de marque cohérente." },
  { title: 'Agences', benefit: 'Gérez plusieurs marques et clients depuis un même espace, avec une isolation stricte entre comptes.' },
  { title: 'Médias et institutions', benefit: 'Un radar mondial et une gouvernance éditoriale renforcée pour vos équipes de veille.' },
];

const COMPARISON_ROWS = [
  'Veille mondiale',
  'Recherche directe',
  'Sources traçables',
  'Thèse / antithèse',
  'Experts identifiés',
  'Brand Voice',
  'Illustration',
  'Validation humaine',
  'Publication multicanale',
  'Analytics',
];

export default function AudiencesAndDifferentiators() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">Conçu pour votre rôle.</h2>
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AUDIENCES.map((a) => (
            <div key={a.title} className="rounded-2xl border border-border bg-surface p-6">
              <h3 className="font-semibold">{a.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{a.benefit}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-surface/40 py-20">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">
            Bien plus qu&apos;un agrégateur. Bien plus qu&apos;un générateur de posts.
          </h2>
          <div className="mt-10 overflow-x-auto rounded-2xl border border-border bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-3 font-medium text-muted-foreground">Capacité</th>
                  <th className="px-4 py-3 font-medium text-accent-cyan">STARS</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Outils classiques</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row) => (
                  <tr key={row} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">{row}</td>
                    <td className="px-4 py-3 text-success">✓</td>
                    <td className="px-4 py-3 text-muted-foreground">Partiel ou absent</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}
