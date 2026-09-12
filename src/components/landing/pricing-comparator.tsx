import { PLANS, formatPriceCents } from '@/config/pricing';

interface ComparatorRow {
  label: string;
  render: (plan: (typeof PLANS)[number]) => string;
}

function formatCount(n: number): string {
  if (n < 0) return 'Illimité';
  return n.toLocaleString('fr-FR');
}

const ROWS: ComparatorRow[] = [
  { label: 'Utilisateurs inclus', render: (p) => formatCount(p.quotas.seatsIncluded) },
  { label: 'Domaines suivis', render: (p) => formatCount(p.quotas.domains) },
  { label: 'STARS Intelligence Credits / mois', render: (p) => formatCount(p.quotas.creditsPerMonth) },
  { label: 'Comptes sociaux connectés', render: (p) => formatCount(p.quotas.socialAccountsIncluded) },
  { label: 'Publications / mois', render: (p) => formatCount(p.quotas.publicationsPerMonth) },
  { label: 'STARS Voices', render: (p) => formatCount(p.quotas.brandVoicesIncluded) },
  { label: 'Commentaires synchronisés / mois', render: (p) => formatCount(p.quotas.commentsPerMonth) },
  { label: 'Suggestions IA de réponse / mois', render: (p) => formatCount(p.quotas.commentAiSuggestionsPerMonth) },
  { label: 'Historique conservé', render: (p) => (p.quotas.historyDays < 0 ? 'Illimité' : `${p.quotas.historyDays} jours`) },
  { label: 'Accès API', render: (p) => (p.quotas.apiAccess ? 'Oui' : 'Non') },
];

export default function PricingComparator() {
  return (
    <div className="mt-16">
      <h3 className="text-center font-display text-xl font-bold text-white">Comparer les offres en détail</h3>
      <div className="mt-6 overflow-x-auto rounded-2xl border border-border/70">
        <table className="w-full min-w-[720px] border-collapse text-xs">
          <thead>
            <tr className="bg-surface-raised">
              <th className="sticky left-0 bg-surface-raised px-4 py-3 text-left font-semibold text-muted-foreground">
                Fonctionnalité
              </th>
              {PLANS.map((plan) => (
                <th key={plan.key} className="px-4 py-3 text-center font-bold text-white">
                  {plan.name}
                  <div className="mt-0.5 text-[10px] font-normal text-accent-cyan">
                    {formatPriceCents(plan.monthlyPriceCents)}
                    {plan.monthlyPriceCents !== null && plan.monthlyPriceCents > 0 && '/mois'}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, i) => (
              <tr key={row.label} className={i % 2 === 0 ? 'bg-surface/40' : 'bg-transparent'}>
                <td className="sticky left-0 bg-inherit px-4 py-2.5 text-left text-muted-foreground">{row.label}</td>
                {PLANS.map((plan) => (
                  <td key={plan.key} className="px-4 py-2.5 text-center font-medium text-foreground">
                    {row.render(plan)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
