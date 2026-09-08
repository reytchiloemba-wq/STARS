const CAPABILITIES = [
  'Veille mondiale',
  'Sources traçables',
  'Analyse contradictoire',
  'Création assistée',
  'Publication multicanale',
  'Collaboration sécurisée',
];

const PAIN_POINTS = [
  'Surcharge informationnelle',
  'Sources dispersées',
  'Opinions confondues avec les faits',
  'Manque de temps',
  'Création de contenu répétitive',
  'Outils fragmentés',
  'Risques réputationnels',
];

export default function TrustAndProblem() {
  return (
    <>
      <section className="border-y border-border bg-surface/50 py-8">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-center text-sm text-muted-foreground">
            Une seule plateforme pour chercher, vérifier, comprendre, créer et publier.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-x-8 gap-y-3">
            {CAPABILITIES.map((c) => (
              <span key={c} className="text-sm font-medium text-muted-foreground">
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section id="produit" className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
          L&apos;information est partout. La compréhension fiable est rare.
        </h2>
        <div className="mx-auto mt-8 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
          {PAIN_POINTS.map((p) => (
            <div key={p} className="rounded-lg border border-border bg-surface px-4 py-3 text-left text-sm text-muted-foreground">
              {p}
            </div>
          ))}
        </div>
        <p className="mx-auto mt-8 max-w-2xl text-lg font-medium">
          STARS réunit toute la chaîne éditoriale dans un environnement unique.
        </p>
      </section>
    </>
  );
}
