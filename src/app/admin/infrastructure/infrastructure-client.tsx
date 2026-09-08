'use client';

import { useState, useTransition } from 'react';
import type { ProviderDefinition, ProviderCategory } from '@/config/providers';
import {
  saveConnectorAction,
  testConnectorAction,
  suspendConnectorAction,
  revokeConnectorAction,
  setPrimaryConnectorAction,
} from './actions';

interface IntegrationState {
  id: string;
  environment: string;
  status: string;
  isPrimary: boolean;
  credentialsFingerprint: string | null;
  lastTestedAt: string | null;
  lastTestResult: string | null;
  lastTestMessage: string | null;
  totalCostCents: number;
}

interface IncidentItem {
  id: string;
  providerName: string;
  severity: string;
  message: string;
  createdAt: string;
}

interface AuditItem {
  id: string;
  action: string;
  actorEmail: string;
  createdAt: string;
  metadata: unknown;
}

const STATUS_STYLES: Record<string, string> = {
  NOT_CONFIGURED: 'bg-muted text-muted-foreground border-border',
  INCOMPLETE: 'bg-warning/10 text-warning border-warning/40',
  TESTING: 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/40',
  OPERATIONAL: 'bg-success/10 text-success border-success/40',
  DEGRADED: 'bg-warning/10 text-warning border-warning/40',
  QUOTA_LOW: 'bg-warning/10 text-warning border-warning/40',
  QUOTA_EXHAUSTED: 'bg-danger/10 text-danger border-danger/40',
  AUTH_EXPIRED: 'bg-danger/10 text-danger border-danger/40',
  ERROR: 'bg-danger/10 text-danger border-danger/40',
  SUSPENDED: 'bg-muted text-muted-foreground border-border',
  REVOKED: 'bg-muted text-muted-foreground border-border',
};

const STATUS_LABELS: Record<string, string> = {
  NOT_CONFIGURED: 'Non configuré',
  INCOMPLETE: 'Configuration incomplète',
  TESTING: 'Test en cours',
  OPERATIONAL: 'Opérationnel',
  DEGRADED: 'Dégradé',
  QUOTA_LOW: 'Quota faible',
  QUOTA_EXHAUSTED: 'Quota épuisé',
  AUTH_EXPIRED: 'Autorisation expirée',
  ERROR: 'Erreur',
  SUSPENDED: 'Suspendu',
  REVOKED: 'Révoqué',
};

export default function InfrastructureClient({
  categories,
  categoryLabels,
  providers,
  integrationsByProviderKey,
  incidents,
  auditLog,
}: {
  categories: ProviderCategory[];
  categoryLabels: Record<ProviderCategory, string>;
  providers: ProviderDefinition[];
  integrationsByProviderKey: Record<string, IntegrationState | null>;
  incidents: IncidentItem[];
  auditLog: AuditItem[];
}) {
  const [tab, setTab] = useState<'overview' | 'connectors' | 'incidents' | 'audit'>('overview');

  const allStates = Object.values(integrationsByProviderKey).filter(Boolean) as IntegrationState[];
  const operational = allStates.filter((s) => s.status === 'OPERATIONAL').length;
  const errors = allStates.filter((s) => ['ERROR', 'AUTH_EXPIRED', 'QUOTA_EXHAUSTED'].includes(s.status)).length;
  const notConfigured = providers.length - allStates.length;
  const totalCostCents = allStates.reduce((sum, s) => sum + s.totalCostCents, 0);

  let availability: string;
  if (errors === 0 && notConfigured === 0) availability = '100 % opérationnel';
  else if (errors === 0) availability = 'Opérationnel avec réserves';
  else if (errors < allStates.length) availability = 'Mode dégradé';
  else availability = 'Partiellement bloqué';

  return (
    <div>
      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {(
          [
            ['overview', "Vue d'ensemble"],
            ['connectors', 'Connecteurs'],
            ['incidents', `Incidents (${incidents.length})`],
            ['audit', 'Audit'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`whitespace-nowrap px-4 py-2 text-sm font-medium ${
              tab === key ? 'border-b-2 border-accent-cyan text-foreground' : 'text-muted-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="mt-6 space-y-6">
          <div className="rounded-2xl border border-accent-cyan/40 bg-surface p-5">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Disponibilité opérationnelle de STARS</div>
            <div className="mt-1 text-xl font-bold">{availability}</div>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Connecteurs opérationnels" value={operational} />
            <Stat label="Connecteurs en erreur" value={errors} />
            <Stat label="Non configurés" value={notConfigured} />
            <Stat label="Coût total suivi" value={`${(totalCostCents / 100).toFixed(2)} €`} />
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Par catégorie</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((cat) => {
                const inCat = providers.filter((p) => p.category === cat);
                const opInCat = inCat.filter((p) => integrationsByProviderKey[p.key]?.status === 'OPERATIONAL').length;
                return (
                  <div key={cat} className="rounded-xl border border-border bg-surface p-4 text-sm">
                    <div className="font-medium">{categoryLabels[cat]}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {opInCat} / {inCat.length} opérationnel(s)
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab === 'connectors' && (
        <div className="mt-6 space-y-8">
          {categories.map((cat) => (
            <div key={cat}>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {categoryLabels[cat]}
              </h3>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {providers
                  .filter((p) => p.category === cat)
                  .map((p) => (
                    <ConnectorCard key={p.key} provider={p} state={integrationsByProviderKey[p.key] ?? null} />
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'incidents' && (
        <div className="mt-6 space-y-3">
          {incidents.length === 0 ? (
            <p className="rounded-2xl border border-border bg-surface p-6 text-sm text-muted-foreground">
              Aucun incident actif.
            </p>
          ) : (
            incidents.map((inc) => (
              <div key={inc.id} className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
                <div className="font-medium">
                  {inc.providerName} · {inc.severity}
                </div>
                <div className="mt-1 text-muted-foreground">{inc.message}</div>
                <div className="mt-1 text-xs text-muted-foreground">{new Date(inc.createdAt).toLocaleString('fr-FR')}</div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'audit' && (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Action</th>
                <th className="px-4 py-2 font-medium">Par</th>
              </tr>
            </thead>
            <tbody>
              {auditLog.map((a) => (
                <tr key={a.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2">{new Date(a.createdAt).toLocaleString('fr-FR')}</td>
                  <td className="px-4 py-2">{a.action}</td>
                  <td className="px-4 py-2">{a.actorEmail}</td>
                </tr>
              ))}
              {auditLog.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                    Aucune action enregistrée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="text-lg font-semibold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function ConnectorCard({ provider, state }: { provider: ProviderDefinition; state: IntegrationState | null }) {
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const status = state?.status ?? 'NOT_CONFIGURED';

  function handleSave(formData: FormData) {
    startTransition(async () => {
      await saveConnectorAction(formData);
      setExpanded(false);
      setFormValues({});
    });
  }

  function handleTest() {
    if (!state) return;
    startTransition(async () => {
      const result = await testConnectorAction(state.id);
      setTestMessage(result.message);
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-semibold">{provider.name}</h4>
            {state?.isPrimary && <span className="text-accent-cyan">★ principal</span>}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{provider.description}</p>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>
          {STATUS_LABELS[status]}
        </span>
      </div>

      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
        {state?.credentialsFingerprint && <div>Identifiants : {state.credentialsFingerprint}</div>}
        {state?.lastTestedAt && (
          <div>
            Dernier test : {new Date(state.lastTestedAt).toLocaleString('fr-FR')} —{' '}
            {state.lastTestResult === 'success' ? 'succès' : 'échec'}
          </div>
        )}
        {state?.lastTestMessage && <div className="italic">{state.lastTestMessage}</div>}
        {state && state.totalCostCents > 0 && <div>Coût cumulé : {(state.totalCostCents / 100).toFixed(2)} €</div>}
      </div>

      {testMessage && <p className="mt-2 rounded-lg bg-surface-raised px-3 py-2 text-xs">{testMessage}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:border-accent-cyan"
        >
          {expanded ? 'Fermer' : 'Configurer'}
        </button>
        {state && (
          <>
            <button
              onClick={handleTest}
              disabled={isPending}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:border-accent-cyan disabled:opacity-50"
            >
              Tester
            </button>
            <button
              onClick={() =>
                startTransition(async () => {
                  await setPrimaryConnectorAction(state.id, !state.isPrimary);
                })
              }
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:border-accent-cyan"
            >
              {state.isPrimary ? 'Retirer principal' : 'Définir principal'}
            </button>
            <button
              onClick={() => startTransition(async () => { await suspendConnectorAction(state.id); })}
              className="rounded-lg border border-warning/40 px-3 py-1.5 text-xs font-medium text-warning hover:bg-warning/10"
            >
              Suspendre
            </button>
            <button
              onClick={() => startTransition(async () => { await revokeConnectorAction(state.id); })}
              className="rounded-lg border border-danger/40 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/10"
            >
              Révoquer
            </button>
          </>
        )}
      </div>

      {expanded && (
        <form action={handleSave} className="mt-4 space-y-3 border-t border-border pt-4">
          <input type="hidden" name="providerKey" value={provider.key} />
          <input type="hidden" name="fieldKeys" value={provider.credentialFields.map((f) => f.key).join(',')} />

          <label className="block text-xs">
            <span className="mb-1 block text-muted-foreground">Environnement</span>
            <select name="environment" className="w-full rounded-lg border border-border bg-surface-raised px-2 py-1.5 text-sm">
              <option value="TEST">Test</option>
              <option value="PRODUCTION">Production</option>
            </select>
          </label>

          {provider.key === 'meta' && (
            <div className="rounded-xl border border-accent-cyan/30 bg-accent-cyan/5 p-3 text-xs space-y-2">
              <div className="font-bold text-accent-cyan flex items-center gap-1.5">
                <span>ℹ️</span>
                <span>URLs et domaine officiels à coller dans Meta for Developers :</span>
              </div>
              <div className="space-y-1.5 text-[11px] text-muted-foreground">
                <div>
                  <span className="text-white font-medium">Domaine de l’application (App Domains) :</span>
                  <code className="block mt-0.5 rounded bg-surface-raised px-2 py-1 text-accent-cyan select-all font-mono">
                    stars-ap.com
                  </code>
                  <code className="block mt-0.5 rounded bg-surface-raised px-2 py-1 text-accent-cyan select-all font-mono">
                    stars-platform-orpin.vercel.app
                  </code>
                </div>
                <div>
                  <span className="text-white font-medium">URL du site Web (Paramètres &gt; Basique &gt; Site Web) :</span>
                  <code className="block mt-0.5 rounded bg-surface-raised px-2 py-1 text-accent-cyan select-all font-mono">
                    https://stars-ap.com/
                  </code>
                </div>
                <div>
                  <span className="text-white font-medium">Politique de confidentialité (Privacy Policy URL) :</span>
                  <code className="block mt-0.5 rounded bg-surface-raised px-2 py-1 text-accent-cyan select-all font-mono">
                    https://stars-ap.com/legal/confidentialite
                  </code>
                </div>
                <div>
                  <span className="text-white font-medium">Conditions d’utilisation (Terms of Service URL) :</span>
                  <code className="block mt-0.5 rounded bg-surface-raised px-2 py-1 text-accent-cyan select-all font-mono">
                    https://stars-ap.com/legal/conditions
                  </code>
                </div>
                <div>
                  <span className="text-white font-medium">URIs de redirection OAuth (Connexion Facebook &gt; Paramètres) :</span>
                  <code className="block mt-0.5 rounded bg-surface-raised px-2 py-1 text-accent-cyan select-all font-mono">
                    https://stars-ap.com/api/oauth/facebook/callback
                  </code>
                  <code className="block mt-0.5 rounded bg-surface-raised px-2 py-1 text-accent-cyan select-all font-mono">
                    https://stars-platform-orpin.vercel.app/api/oauth/facebook/callback
                  </code>
                  <code className="block mt-0.5 rounded bg-surface-raised px-2 py-1 text-accent-cyan select-all font-mono">
                    https://stars-ap.com/api/oauth/instagram/callback
                  </code>
                  <code className="block mt-0.5 rounded bg-surface-raised px-2 py-1 text-accent-cyan select-all font-mono">
                    https://stars-platform-orpin.vercel.app/api/oauth/instagram/callback
                  </code>
                </div>
              </div>
            </div>
          )}

          {provider.key === 'linkedin' && (
            <div className="rounded-xl border border-accent-cyan/30 bg-accent-cyan/5 p-3 text-xs space-y-2">
              <div className="font-bold text-accent-cyan">ℹ️ URLs de redirection OAuth autorisées (LinkedIn Developer &gt; Auth) :</div>
              <code className="block rounded bg-surface-raised px-2 py-1 text-[11px] text-accent-cyan select-all font-mono">
                https://stars-ap.com/api/oauth/linkedin/callback
              </code>
              <code className="block rounded bg-surface-raised px-2 py-1 text-[11px] text-accent-cyan select-all font-mono">
                https://stars-platform-orpin.vercel.app/api/oauth/linkedin/callback
              </code>
            </div>
          )}

          {provider.credentialFields.length === 0 ? (
            <p className="text-xs text-muted-foreground">Aucun identifiant requis pour ce fournisseur.</p>
          ) : (
            provider.credentialFields.map((field) => (
              <label key={field.key} className="block text-xs">
                <span className="mb-1 block text-muted-foreground">
                  {field.label}
                  {field.required && ' *'}
                </span>
                <input
                  type={field.type}
                  name={`cred_${field.key}`}
                  placeholder={field.placeholder}
                  required={field.required}
                  value={formValues[field.key] ?? ''}
                  onChange={(e) => setFormValues((v) => ({ ...v, [field.key]: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-surface-raised px-2 py-1.5 text-sm"
                />
              </label>
            ))
          )}

          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-start-gradient px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
          >
            Enregistrer (chiffré)
          </button>
        </form>
      )}
    </div>
  );
}
