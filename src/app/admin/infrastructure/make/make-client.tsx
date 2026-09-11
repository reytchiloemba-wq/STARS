'use client';

import { useState } from 'react';
import { saveMakeConfigAction, updateScenarioAction, testScenarioAction } from './actions';
import { MAKE_SCENARIO_BLUEPRINTS } from '@/server/services/make/blueprints';
import type { WorkflowType, OrchestrationMode } from '@/server/services/make/types';

interface MakeClientProps {
  overview: {
    config: {
      id: string;
      environment: string;
      organizationIdMake?: string | null;
      teamId?: string | null;
      apiTokenFingerprint?: string | null;
      hasWebhookSecret: boolean;
      region: string;
      isEnabled: boolean;
      fallbackMode: string;
    };
    scenarios: Array<{
      id: string;
      workflow: WorkflowType;
      scenarioId: string;
      scenarioName: string;
      version: string;
      webhookUrl: string;
      isActive: boolean;
      isPrimary: boolean;
      fallbackMode: string;
      timeoutMs: number;
      lastTestedAt: Date | null;
      lastTestResult: string | null;
      lastTestMessage: string | null;
      averageLatencyMs: number | null;
    }>;
    finops: {
      totalExecutions: number;
      totalUnits: number;
      totalCostEur: number;
      grossMarginPercent: number;
      targetMarginPercent: number;
      marginAlert: boolean;
    };
    recentExecutions: Array<{
      id: string;
      eventId: string;
      correlationId: string;
      tenantName: string;
      tenantSlug: string;
      workflow: string;
      status: string;
      requestedAt: Date;
      latencyMs: number | null;
      sicConsumed: number;
      technicalCostCents: number;
      errorMessage: string | null;
    }>;
  };
}

export default function MakeClient({ overview }: MakeClientProps) {
  const [testingId, setTestingId] = useState<string | null>(null);
  const [selectedBlueprint, setSelectedBlueprint] = useState<WorkflowType | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const res = await testScenarioAction(id);
      alert(res.message);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors du test.');
    } finally {
      setTestingId(null);
    }
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    await updateScenarioAction(id, { isActive: !current });
  };

  const handleModeChange = async (id: string, mode: OrchestrationMode) => {
    await updateScenarioAction(id, { fallbackMode: mode });
  };

  return (
    <div className="space-y-10">
      {/* FinOps Cockpit Overview */}
      <section className="rounded-2xl border border-border/80 bg-surface p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-5">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-accent-cyan">Télémétrie FinOps</span>
            <h2 className="text-xl font-bold text-white">Contrôle des Coûts & Marge Brute</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
              overview.finops.marginAlert
                ? 'bg-danger/15 text-danger border border-danger/30'
                : 'bg-success/15 text-success border border-success/30'
            }`}>
              <span className={`h-2 w-2 rounded-full ${overview.finops.marginAlert ? 'bg-danger' : 'bg-success'}`} />
              Marge brute estimée : {overview.finops.grossMarginPercent} % (Cible &gt; {overview.finops.targetMarginPercent} %)
            </span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-border/60 bg-surface-raised p-4">
            <div className="text-xs text-muted-foreground">Exécutions totales</div>
            <div className="mt-1 font-display text-2xl font-bold text-white">{overview.finops.totalExecutions}</div>
          </div>
          <div className="rounded-xl border border-border/60 bg-surface-raised p-4">
            <div className="text-xs text-muted-foreground">Opérations / Tokens</div>
            <div className="mt-1 font-display text-2xl font-bold text-white">{overview.finops.totalUnits.toLocaleString('fr-FR')}</div>
          </div>
          <div className="rounded-xl border border-border/60 bg-surface-raised p-4">
            <div className="text-xs text-muted-foreground">Coût technique estimé</div>
            <div className="mt-1 font-display text-2xl font-bold text-accent-cyan">
              {overview.finops.totalCostEur.toFixed(2)} € HT
            </div>
          </div>
          <div className="rounded-xl border border-border/60 bg-surface-raised p-4">
            <div className="text-xs text-muted-foreground">Objectif Rentabilité</div>
            <div className="mt-1 font-display text-2xl font-bold text-success">
              {overview.finops.grossMarginPercent >= 70 ? 'Optimal (70%+)' : 'Alerte (&lt;65%)'}
            </div>
          </div>
        </div>
      </section>

      {/* Global Make Credentials & Configuration */}
      <section className="rounded-2xl border border-border/80 bg-surface p-6 shadow-sm">
        <div className="border-b border-border/60 pb-5">
          <span className="text-xs font-bold uppercase tracking-wider text-accent-cyan">Paramètres Make.com</span>
          <h2 className="text-xl font-bold text-white">Connexion Centrale à l’Orchestrateur</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Configurez les accès Make de niveau A. Les jetons d’API et secrets HMAC sont chiffrés en AES-256-GCM.
          </p>
        </div>

        {saveMessage && (
          <div className="mt-4 rounded-xl border border-success/30 bg-success/10 p-3 text-xs text-success">
            {saveMessage}
          </div>
        )}

        <form
          action={async (formData) => {
            await saveMakeConfigAction(formData);
            setSaveMessage('Configuration Make enregistrée avec succès.');
            setTimeout(() => setSaveMessage(null), 4000);
          }}
          className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2"
        >
          <div>
            <label className="block text-xs font-medium text-muted-foreground">Organization ID Make</label>
            <input
              type="text"
              name="organizationIdMake"
              defaultValue={overview.config.organizationIdMake ?? ''}
              placeholder="ex: 123456"
              className="mt-1.5 w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-accent-cyan focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground">Team ID</label>
            <input
              type="text"
              name="teamId"
              defaultValue={overview.config.teamId ?? ''}
              placeholder="ex: 789012"
              className="mt-1.5 w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-accent-cyan focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground">
              API Token Make {overview.config.apiTokenFingerprint && `(Actuel: ${overview.config.apiTokenFingerprint})`}
            </label>
            <input
              type="password"
              name="apiToken"
              placeholder={overview.config.apiTokenFingerprint ? 'Laisser vide pour ne pas modifier' : 'Token Make v2'}
              className="mt-1.5 w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-accent-cyan focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground">
              Secret Webhook HMAC {overview.config.hasWebhookSecret && '(Défini)'}
            </label>
            <input
              type="password"
              name="webhookSecret"
              placeholder={overview.config.hasWebhookSecret ? 'Laisser vide pour ne pas modifier' : 'Clé secrète de signature HMAC'}
              className="mt-1.5 w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:border-accent-cyan focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground">Région Make</label>
            <select
              name="region"
              defaultValue={overview.config.region}
              className="mt-1.5 w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2 text-xs text-foreground focus:border-accent-cyan focus:outline-none"
            >
              <option value="eu1">eu1 (Europe - Francfort)</option>
              <option value="eu2">eu2 (Europe - Paris)</option>
              <option value="us1">us1 (États-Unis - Virginie)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground">Mode d’Orchestration par défaut</label>
            <select
              name="fallbackMode"
              defaultValue={overview.config.fallbackMode}
              className="mt-1.5 w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2 text-xs text-foreground focus:border-accent-cyan focus:outline-none"
            >
              <option value="HYBRID">Hybride (Make en priorité, secours natif si indisponible)</option>
              <option value="MAKE">Make uniquement (Erreur si Make indisponible)</option>
              <option value="NATIVE">Natif uniquement (Bypasser Make sans modifier le code)</option>
            </select>
          </div>

          <div className="flex items-center gap-3 pt-2 md:col-span-2">
            <input
              type="checkbox"
              id="isEnabled"
              name="isEnabled"
              defaultChecked={overview.config.isEnabled}
              className="h-4 w-4 rounded border-border text-accent-cyan focus:ring-accent-cyan"
            />
            <label htmlFor="isEnabled" className="text-xs font-medium text-foreground">
              Activer globalement l’orchestration Make (si décoché, STARS bascule à 100% sur le moteur natif)
            </label>
          </div>

          <div className="pt-2 md:col-span-2">
            <button
              type="submit"
              className="rounded-xl bg-start-gradient px-5 py-2.5 text-xs font-bold text-white shadow-md hover:scale-[1.02] transition-transform"
            >
              Enregistrer la configuration
            </button>
          </div>
        </form>
      </section>

      {/* Scenarios Table */}
      <section className="rounded-2xl border border-border/80 bg-surface p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-5">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-accent-cyan">Scénarios & Workflows</span>
            <h2 className="text-xl font-bold text-white">Registre des 8 Workflows STARS</h2>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border/80 text-muted-foreground">
                <th className="pb-3 font-semibold">Workflow</th>
                <th className="pb-3 font-semibold">Scénario Make</th>
                <th className="pb-3 font-semibold">Version</th>
                <th className="pb-3 font-semibold">Mode</th>
                <th className="pb-3 font-semibold">Statut</th>
                <th className="pb-3 font-semibold">Latence</th>
                <th className="pb-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {overview.scenarios.map((sc) => (
                <tr key={sc.id} className="hover:bg-surface-raised/40 transition-colors">
                  <td className="py-3.5 font-bold text-foreground">
                    <div>{sc.workflow}</div>
                    <div className="text-[11px] font-normal text-muted-foreground">{sc.scenarioName}</div>
                  </td>
                  <td className="py-3.5 font-mono text-[11px] text-muted-foreground">{sc.scenarioId}</td>
                  <td className="py-3.5">
                    <span className="rounded bg-surface-raised px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {sc.version}
                    </span>
                  </td>
                  <td className="py-3.5">
                    <select
                      value={sc.fallbackMode}
                      onChange={(e) => handleModeChange(sc.id, e.target.value as OrchestrationMode)}
                      className="rounded-lg border border-border bg-surface-raised px-2 py-1 text-[11px] text-foreground focus:outline-none"
                    >
                      <option value="HYBRID">Hybride</option>
                      <option value="MAKE">Make</option>
                      <option value="NATIVE">Natif</option>
                    </select>
                  </td>
                  <td className="py-3.5">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(sc.id, sc.isActive)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        sc.isActive
                          ? 'bg-success/15 text-success border border-success/30'
                          : 'bg-muted text-muted-foreground border border-border'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${sc.isActive ? 'bg-success' : 'bg-muted-foreground'}`} />
                      {sc.isActive ? 'Actif' : 'Suspendu'}
                    </button>
                  </td>
                  <td className="py-3.5 font-mono text-muted-foreground">
                    {sc.averageLatencyMs ? `${sc.averageLatencyMs} ms` : '—'}
                  </td>
                  <td className="py-3.5 text-right space-x-2">
                    <button
                      type="button"
                      disabled={testingId === sc.id}
                      onClick={() => handleTest(sc.id)}
                      className="rounded-lg border border-border bg-surface-raised px-2.5 py-1 text-[11px] font-medium text-foreground hover:border-accent-cyan transition-colors"
                    >
                      {testingId === sc.id ? 'Test…' : 'Tester'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedBlueprint(sc.workflow)}
                      className="rounded-lg border border-accent-cyan/40 bg-accent-cyan/10 px-2.5 py-1 text-[11px] font-medium text-accent-cyan hover:bg-accent-cyan/20 transition-colors"
                    >
                      Blueprint JSON
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent Executions Audit Log */}
      <section className="rounded-2xl border border-border/80 bg-surface p-6 shadow-sm">
        <div className="border-b border-border/60 pb-5">
          <span className="text-xs font-bold uppercase tracking-wider text-accent-cyan">Audit & Idempotence</span>
          <h2 className="text-xl font-bold text-white">Dernières Exécutions Orchestrées</h2>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border/80 text-muted-foreground">
                <th className="pb-3 font-semibold">Date</th>
                <th className="pb-3 font-semibold">Tenant</th>
                <th className="pb-3 font-semibold">Workflow</th>
                <th className="pb-3 font-semibold">Statut</th>
                <th className="pb-3 font-semibold">Latence</th>
                <th className="pb-3 font-semibold text-right">SIC Consommés</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {overview.recentExecutions.map((ex) => (
                <tr key={ex.id} className="hover:bg-surface-raised/40 transition-colors">
                  <td className="py-3 text-muted-foreground">{new Date(ex.requestedAt).toLocaleTimeString('fr-FR')}</td>
                  <td className="py-3 font-semibold text-foreground">{ex.tenantName}</td>
                  <td className="py-3 font-mono text-[11px]">{ex.workflow}</td>
                  <td className="py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      ex.status === 'COMPLETED'
                        ? 'bg-success/15 text-success'
                        : ex.status === 'FAILED'
                          ? 'bg-danger/15 text-danger'
                          : 'bg-accent-cyan/15 text-accent-cyan'
                    }`}>
                      {ex.status}
                    </span>
                  </td>
                  <td className="py-3 font-mono text-muted-foreground">{ex.latencyMs ? `${ex.latencyMs} ms` : '—'}</td>
                  <td className="py-3 text-right font-bold text-foreground">{ex.sicConsumed} SIC</td>
                </tr>
              ))}
              {overview.recentExecutions.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-muted-foreground">
                    Aucune exécution enregistrée pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Blueprint Modal */}
      {selectedBlueprint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="font-display text-lg font-bold text-white">
                  Blueprint Make : {MAKE_SCENARIO_BLUEPRINTS[selectedBlueprint].name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Spécification exportable pour configuration dans l’éditeur Make.com
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBlueprint(null)}
                className="rounded-lg border border-border p-1 text-muted-foreground hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-xl border border-border/60 bg-surface-raised p-4">
                <div className="text-xs font-semibold text-white">Modules requis dans le scénario :</div>
                <ul className="mt-2 space-y-2 text-xs text-muted-foreground">
                  {MAKE_SCENARIO_BLUEPRINTS[selectedBlueprint].modules.map((m) => (
                    <li key={m.id} className="flex items-start gap-2">
                      <span className="font-mono text-accent-cyan">#{m.id}</span>
                      <span className="font-semibold text-foreground">{m.module} ({m.action})</span> : {m.description}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">JSON Exportable :</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(MAKE_SCENARIO_BLUEPRINTS[selectedBlueprint], null, 2));
                      alert('Blueprint copié dans le presse-papier !');
                    }}
                    className="text-xs font-bold text-accent-cyan hover:underline"
                  >
                    Copier le JSON
                  </button>
                </div>
                <pre className="mt-2 max-h-60 overflow-x-auto rounded-xl border border-border bg-surface-raised p-4 text-[11px] font-mono text-muted-foreground">
                  {JSON.stringify(MAKE_SCENARIO_BLUEPRINTS[selectedBlueprint], null, 2)}
                </pre>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedBlueprint(null)}
                className="rounded-xl bg-surface-raised px-4 py-2 text-xs font-bold text-foreground hover:bg-border transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
