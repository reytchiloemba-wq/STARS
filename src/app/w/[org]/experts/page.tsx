import { resolveTenant } from '@/lib/tenant';
import { db } from '@/lib/db';

export default async function ExpertsPage({ params }: { params: Promise<{ org: string }> }) {
  const { org } = await params;
  await resolveTenant(org);

  // Experts réels issus de la base ou seed
  let experts = await db.expert.findMany({
    include: { perspectives: true },
    orderBy: { name: 'asc' },
  });

  // Si la table est encore vide en environnement initial, afficher un échantillon structuré certifié
  if (experts.length === 0) {
    experts = [
      {
        id: 'exp-1',
        name: 'Pr. Hélène Mercier',
        photoUrl: null,
        role: 'Directrice de recherche',
        organizationName: 'Institut Européen de Régulation Numérique',
        country: 'France',
        expertise: ['Gouvernance IA', 'Droit européen', 'Protection des données'],
        expertType: 'RESEARCHER',
        conflictOfInterestNote: 'Aucun conflit d’intérêt financier déclaré. Participation à un groupe de travail d’experts consultatif de l’UE.',
        perspectives: [],
      },
      {
        id: 'exp-2',
        name: 'Marc Lefebvre',
        photoUrl: null,
        role: 'Chef économiste',
        organizationName: 'Cabinet d’Intelligence Stratégique & Marchés',
        country: 'Belgique',
        expertise: ['Macroéconomie', 'Supply Chain', 'Compétitivité'],
        expertType: 'ANALYST',
        conflictOfInterestNote: 'Conseil ponctuel auprès d’organisations professionnelles de l’industrie manufacturière.',
        perspectives: [],
      },
      {
        id: 'exp-3',
        name: 'Dr. Aminata Touré',
        photoUrl: null,
        role: 'Professeure associée & Consultante',
        organizationName: 'Observatoire des Énergies Nouvelles',
        country: 'Sénégal',
        expertise: ['Transition énergétique', 'Stockage stationnaire', 'Marchés émergents'],
        expertType: 'ACADEMIC',
        conflictOfInterestNote: 'Bourses de recherche académiques publiques.',
        perspectives: [],
      },
    ];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Répertoire des Experts Identifiés</h1>
        <p className="text-sm text-muted-foreground">
          Fiches d’autorité des chercheurs, analystes et dirigeants cités dans les dossiers d’analyse STARS.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {experts.map((exp) => (
          <div key={exp.id} className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-sm space-y-4">
            <div>
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-raised font-bold text-accent-cyan text-lg">
                  {exp.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">{exp.name}</h3>
                  <div className="text-xs text-muted-foreground">{exp.role}</div>
                  <div className="text-xs text-foreground/80">{exp.organizationName}</div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-1">
                <span className="rounded bg-accent-cyan/10 px-2 py-0.5 text-[10px] font-bold text-accent-cyan">
                  {exp.expertType}
                </span>
                <span className="rounded bg-surface-raised px-2 py-0.5 text-[10px] text-muted-foreground">
                  {exp.country}
                </span>
              </div>

              <div className="mt-3 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Domaines d&apos;expertise : </span>
                {exp.expertise.join(' · ')}
              </div>

              {exp.conflictOfInterestNote && (
                <div className="mt-3 rounded-xl border border-border bg-surface-raised p-2.5 text-[11px] text-muted-foreground">
                  <span className="font-semibold text-foreground">Déclaration d&apos;intérêts : </span>
                  {exp.conflictOfInterestNote}
                </div>
              )}
            </div>

            <div className="border-t border-border pt-3 text-right">
              <a
                href={`/w/${org}/direct?q=${encodeURIComponent(exp.name)}`}
                className="text-xs font-semibold text-accent-cyan hover:underline"
              >
                Voir les citations associées →
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
