'use client';

import type { FinOpsOverview } from '@/server/services/finops.service';

interface FinOpsClientProps {
  overview: FinOpsOverview;
}

export default function FinOpsClient({ overview }: FinOpsClientProps) {
  return (
    <div className="space-y-10">
      {/* KPI Cards */}
      <section className="rounded-2xl border border-border/80 bg-surface p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-5">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-accent-cyan">Rentabilité Plateforme</span>
            <h2 className="text-xl font-bold text-white">Indicateurs Économiques Unitaires</h2>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                overview.marginAlert
                  ? 'bg-danger/15 text-danger border border-danger/30'
                  : 'bg-success/15 text-success border border-success/30'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${overview.marginAlert ? 'bg-danger' : 'bg-success'}`} />
              Marge brute unitaire : {overview.grossMarginPercent} % (Cible &gt; {overview.targetMarginPercent} %)
            </span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-border/60 bg-surface-raised p-4">
            <div className="text-xs text-muted-foreground">Opérations IA &amp; Médias</div>
            <div className="mt-1 font-display text-2xl font-bold text-white">
              {overview.totalOperations.toLocaleString('fr-FR')}
            </div>
          </div>
          <div className="rounded-xl border border-border/60 bg-surface-raised p-4">
            <div className="text-xs text-muted-foreground">Tokens / Requêtes consommés</div>
            <div className="mt-1 font-display text-2xl font-bold text-white">
              {overview.totalUnits.toLocaleString('fr-FR')}
            </div>
          </div>
          <div className="rounded-xl border border-border/60 bg-surface-raised p-4">
            <div className="text-xs text-muted-foreground">Coût technique estimé</div>
            <div className="mt-1 font-display text-2xl font-bold text-accent-cyan">
              {overview.totalCostEur.toFixed(2)} € HT
            </div>
          </div>
          <div className="rounded-xl border border-border/60 bg-surface-raised p-4">
            <div className="text-xs text-muted-foreground">Performance Marge</div>
            <div className="mt-1 font-display text-2xl font-bold text-success">
              {overview.grossMarginPercent >= 70 ? 'Optimal (70%+)' : 'Alerte (&lt;65%)'}
            </div>
          </div>
        </div>
      </section>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Provider Breakdown */}
        <section className="rounded-2xl border border-border/80 bg-surface p-6 shadow-sm">
          <div className="border-b border-border/60 pb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-accent-cyan">Fournisseurs d’IA</span>
            <h3 className="text-lg font-bold text-white">Répartition par Prestataire</h3>
          </div>
          <div className="mt-4 space-y-3">
            {overview.providerBreakdown.map((p) => (
              <div key={p.provider} className="rounded-xl border border-border/60 bg-surface-raised p-3.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="capitalize text-foreground font-mono">{p.provider}</span>
                  <span className="text-accent-cyan">{p.costEur.toFixed(3)} € ({p.sharePercent} %)</span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full bg-accent-cyan transition-all"
                    style={{ width: `${Math.max(5, p.sharePercent)}%` }}
                  />
                </div>
                <div className="mt-1.5 text-[11px] text-muted-foreground">
                  {p.units.toLocaleString('fr-FR')} unités / tokens consommés
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Workflow Breakdown */}
        <section className="rounded-2xl border border-border/80 bg-surface p-6 shadow-sm">
          <div className="border-b border-border/60 pb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-accent-cyan">Workflows Métier</span>
            <h3 className="text-lg font-bold text-white">Consommation par Processus</h3>
          </div>
          <div className="mt-4 space-y-3">
            {overview.workflowBreakdown.map((w) => (
              <div key={w.workflow} className="rounded-xl border border-border/60 bg-surface-raised p-3.5">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-foreground font-mono">{w.workflow}</span>
                  <span className="text-white font-bold">{w.costEur.toFixed(3)} €</span>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {w.operations} exécution{w.operations > 1 ? 's' : ''} enregistrée{w.operations > 1 ? 's' : ''}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Itemized Audit Log Table */}
      <section className="rounded-2xl border border-border/80 bg-surface p-6 shadow-sm">
        <div className="border-b border-border/60 pb-5">
          <span className="text-xs font-bold uppercase tracking-wider text-accent-cyan">Journal d’Imputation</span>
          <h2 className="text-xl font-bold text-white">Derniers Coûts Techniques Détaillés</h2>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border/80 text-muted-foreground">
                <th className="pb-3 font-semibold">Date</th>
                <th className="pb-3 font-semibold">Organisation</th>
                <th className="pb-3 font-semibold">Workflow</th>
                <th className="pb-3 font-semibold">Fournisseur</th>
                <th className="pb-3 font-semibold text-right">Unités</th>
                <th className="pb-3 font-semibold text-right">Coût estimé</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {overview.recentCosts.map((c) => (
                <tr key={c.id} className="hover:bg-surface-raised/40 transition-colors">
                  <td className="py-3 text-muted-foreground">
                    {new Date(c.recordedAt).toLocaleTimeString('fr-FR')}
                  </td>
                  <td className="py-3 font-semibold text-foreground">{c.tenantName}</td>
                  <td className="py-3 font-mono text-[11px] text-accent-cyan">{c.workflow}</td>
                  <td className="py-3 font-mono text-[11px] capitalize text-muted-foreground">{c.provider}</td>
                  <td className="py-3 text-right font-mono text-muted-foreground">
                    {c.unitsConsumed.toLocaleString('fr-FR')}
                  </td>
                  <td className="py-3 text-right font-bold text-white">{c.costEur.toFixed(4)} €</td>
                </tr>
              ))}
              {overview.recentCosts.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-muted-foreground">
                    Aucun enregistrement de coût technique pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
