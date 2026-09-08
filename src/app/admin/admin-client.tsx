'use client';

import { useState, useTransition } from 'react';
import type { Organization, Subscription, Plan, CreditWallet, OrgStatus } from '@prisma/client';
import { updateTenantStatusAction, grantCreditsAction } from './actions';

type EnrichedOrg = Organization & {
  subscription: (Subscription & { plan: Plan }) | null;
  creditWallet: CreditWallet | null;
  _count: { memberships: number; drafts: number; publications: number };
};

type AuditLogItem = {
  id: string;
  action: string;
  targetType: string | null;
  createdAt: Date;
  actor: { email: string } | null;
  organization: { name: string } | null;
};

export default function AdminClient({
  organizations: initialOrgs,
  recentAuditLogs,
}: {
  organizations: EnrichedOrg[];
  recentAuditLogs: AuditLogItem[];
}) {
  const [orgs, setOrgs] = useState(initialOrgs);
  const [selectedOrg, setSelectedOrg] = useState<EnrichedOrg | null>(null);
  const [creditAmount, setCreditAmount] = useState<number>(100);
  const [isPending, startTransition] = useTransition();

  function handleStatusChange(orgId: string, status: OrgStatus) {
    startTransition(async () => {
      const res = await updateTenantStatusAction(orgId, status);
      if (res.ok) {
        setOrgs(orgs.map((o) => (o.id === orgId ? { ...o, status } : o)));
      }
    });
  }

  function handleGrantCredits(orgId: string) {
    startTransition(async () => {
      const res = await grantCreditsAction(orgId, creditAmount);
      if (res.ok) {
        setOrgs(
          orgs.map((o) =>
            o.id === orgId
              ? {
                  ...o,
                  creditWallet: o.creditWallet
                    ? { ...o.creditWallet, balance: res.newBalance }
                    : ({ id: 'w', organizationId: orgId, balance: res.newBalance, updatedAt: new Date() } as CreditWallet),
                }
              : o,
          ),
        );
        setSelectedOrg(null);
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Table des Tenants */}
      <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="text-base font-bold text-foreground mb-4">Tenants enregistrés ({orgs.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border text-[10px] uppercase text-muted-foreground">
              <tr>
                <th className="pb-3">Organisation</th>
                <th className="pb-3">Slug</th>
                <th className="pb-3">Forfait</th>
                <th className="pb-3">Statut</th>
                <th className="pb-3">Membres</th>
                <th className="pb-3">Crédits</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orgs.map((org) => {
                const planName = org.subscription?.plan?.name || 'Discovery';
                const balance = org.creditWallet?.balance ?? 0;
                return (
                  <tr key={org.id} className="hover:bg-surface-raised transition">
                    <td className="py-3 font-semibold text-foreground">{org.name}</td>
                    <td className="py-3 font-mono text-muted-foreground">{org.slug}</td>
                    <td className="py-3">
                      <span className="rounded bg-accent-cyan/10 px-2 py-0.5 text-accent-cyan font-semibold">
                        {planName}
                      </span>
                    </td>
                    <td className="py-3">
                      <select
                        value={org.status}
                        disabled={isPending}
                        onChange={(e) => handleStatusChange(org.id, e.target.value as OrgStatus)}
                        className="rounded-lg border border-border bg-surface px-2 py-1 text-xs outline-none"
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="TRIAL">TRIAL</option>
                        <option value="SUSPENDED">SUSPENDED</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    </td>
                    <td className="py-3">{org._count.memberships}</td>
                    <td className="py-3 font-bold text-foreground">{balance}</td>
                    <td className="py-3">
                      <button
                        type="button"
                        onClick={() => setSelectedOrg(org)}
                        className="rounded-lg border border-border px-2.5 py-1 text-xs hover:bg-surface"
                      >
                        + Crédits
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Audit Logs récents */}
      <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="text-base font-bold text-foreground mb-4">Derniers événements d&apos;audit système</h2>
        {recentAuditLogs.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucun journal d&apos;audit récent.</p>
        ) : (
          <div className="space-y-2">
            {recentAuditLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between rounded-xl bg-surface-raised p-3 text-xs">
                <div>
                  <span className="font-semibold text-foreground">{log.action}</span>
                  <span className="text-muted-foreground ml-2">
                    par {log.actor?.email || 'Système'} · Tenant : {log.organization?.name || 'Global'}
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground font-mono">
                  {new Date(log.createdAt).toLocaleTimeString('fr-FR')}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modal Ajustement de crédits */}
      {selectedOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-2xl">
            <h3 className="text-base font-bold text-foreground">Accorder des crédits — {selectedOrg.name}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Ajustement manuel d&apos;infrastructure avec journalisation obligatoire dans l&apos;audit log.
            </p>

            <div className="mt-4">
              <label className="text-xs font-semibold text-muted-foreground">Nombre de crédits à ajouter :</label>
              <input
                type="number"
                min="10"
                step="10"
                value={creditAmount}
                onChange={(e) => setCreditAmount(parseInt(e.target.value) || 0)}
                className="mt-1 w-full rounded-xl border border-border bg-surface-raised p-2 text-xs outline-none focus:border-accent-cyan"
              />
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setSelectedOrg(null)}
                className="rounded-xl border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface-raised"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleGrantCredits(selectedOrg.id)}
                className="rounded-xl bg-start-gradient px-4 py-1.5 text-xs font-bold text-white shadow hover:opacity-90 disabled:opacity-50"
              >
                {isPending ? 'Attribution…' : 'Confirmer l’ajout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
