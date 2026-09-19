'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import type { Organization, Subscription, Plan, CreditWallet, OrgStatus } from '@prisma/client';
import { updateTenantStatusAction, grantCreditsAction, createTenantByAdminAction } from './actions';

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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdTenantResult, setCreatedTenantResult] = useState<{
    name: string;
    slug: string;
    ownerEmail: string;
    ownerName: string | null;
    planName: string;
    initialCredits: number;
    plainPassword: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
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

  function handleCreateTenant(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreateError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        const res = await createTenantByAdminAction(formData);
        if (res.ok && res.tenant) {
          setCreatedTenantResult(res.tenant);
          setShowCreateModal(false);
          const newEnriched: EnrichedOrg = {
            id: res.tenant.id,
            name: res.tenant.name,
            slug: res.tenant.slug,
            status: res.tenant.status,
            logoUrl: null,
            country: 'FR',
            language: 'fr',
            currency: 'EUR',
            timezone: 'Europe/Paris',
            industry: null,
            size: null,
            editorialCharter: null,
            retentionPolicyDays: 365,
            createdAt: new Date(),
            updatedAt: new Date(),
            ownerId: 'user',
            subscription: {
              id: 'sub-' + Date.now(),
              organizationId: res.tenant.id,
              planId: 'plan',
              status: 'ACTIVE',
              billingCycle: 'MONTHLY',
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 3600 * 1000),
              trialEndsAt: null,
              createdAt: new Date(),
              updatedAt: new Date(),
              stripeCustomerId: null,
              stripeSubscriptionId: null,
              plan: {
                id: 'p',
                key: 'plan',
                name: res.tenant.planName,
                monthlyPriceCents: 0,
                annualPriceCents: 0,
                quotas: {},
              },
            },
            creditWallet: {
              id: 'w-' + Date.now(),
              organizationId: res.tenant.id,
              balance: res.tenant.initialCredits,
              updatedAt: new Date(),
            },
            _count: { memberships: 1, drafts: 0, publications: 0 },
          };
          setOrgs([newEnriched, ...orgs]);
        }
      } catch (err) {
        setCreateError(err instanceof Error ? err.message : 'Erreur lors de la création du tenant');
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Notification nouveau tenant créé avec succès */}
      {createdTenantResult && (
        <div className="rounded-2xl border border-success/40 bg-success/10 p-5 shadow-lg backdrop-blur-md">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-success/20 text-success text-base font-bold">✓</span>
              <div>
                <h3 className="font-bold text-white text-sm">Nouveau Tenant créé avec succès !</h3>
                <p className="text-xs text-muted-foreground">L&apos;organisation et le compte administrateur client sont opérationnels.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCreatedTenantResult(null)}
              className="text-muted-foreground hover:text-white text-xs"
            >
              ✕
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-surface-raised/80 rounded-xl p-3 border border-border text-xs">
            <div>
              <span className="text-muted-foreground block text-[11px]">Organisation :</span>
              <strong className="text-white">{createdTenantResult.name}</strong>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Espace de travail (URL) :</span>
              <span className="font-mono text-accent-cyan">/w/{createdTenantResult.slug}/dashboard</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">E-mail de connexion :</span>
              <span className="font-mono text-white">{createdTenantResult.ownerEmail}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px]">Mot de passe généré :</span>
              <span className="font-mono text-accent-emerald font-bold bg-black/40 px-1.5 py-0.5 rounded">{createdTenantResult.plainPassword}</span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Forfait : <strong className="text-white">{createdTenantResult.planName}</strong> ({createdTenantResult.initialCredits} crédits alloués)</span>
            <button
              type="button"
              onClick={() => {
                const text = `Vos accès STARS :\nOrganisation: ${createdTenantResult.name}\nLien d'accès: https://stars-ap.com/w/${createdTenantResult.slug}/dashboard\nE-mail: ${createdTenantResult.ownerEmail}\nMot de passe: ${createdTenantResult.plainPassword}`;
                navigator.clipboard.writeText(text);
                setCopied(true);
                setTimeout(() => setCopied(false), 3000);
              }}
              className="text-xs font-semibold px-3 py-1 rounded-lg border border-accent-cyan/40 bg-accent-cyan/15 text-accent-cyan hover:bg-accent-cyan/25 transition"
            >
              {copied ? '✓ Accès copiés dans le presse-papier !' : '📋 Copier les accès client'}
            </button>
          </div>
        </div>
      )}

      {/* Table des Tenants */}
      <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-foreground">Tenants enregistrés ({orgs.length})</h2>
            <p className="text-xs text-muted-foreground">Création et gestion des organisations exclusivement déléguées à l&apos;administrateur STARS.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/tenants/new"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-start-gradient px-4 py-2 text-xs font-bold text-white shadow-md shadow-accent-blue/20 hover:scale-[1.02] transition"
            >
              <span>+ Inscrire un nouveau Tenant (Formulaire B2B)</span>
            </Link>
            <button
              type="button"
              onClick={() => { setCreateError(null); setShowCreateModal(true); }}
              className="hidden sm:inline-flex items-center justify-center rounded-xl border border-border bg-surface-raised px-3 py-2 text-xs font-medium text-muted-foreground hover:text-white transition"
              title="Création rapide par modal"
            >
              <span>⚡ Rapide</span>
            </button>
          </div>
        </div>
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

      {/* Modal Inscription Nouveau Tenant par Admin */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Inscrire un nouveau Tenant Client</h3>
                <p className="text-xs text-muted-foreground">Création manuelle de l&apos;espace entreprise et provisionnement des accès.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-muted-foreground hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {createError && (
              <div className="mt-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateTenant} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground font-medium mb-1">Nom de l&apos;organisation *</label>
                  <input
                    name="organizationName"
                    required
                    placeholder="Ex: TotalEnergies, Safran..."
                    className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2 text-foreground outline-none focus:border-accent-cyan"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground font-medium mb-1">Nom du responsable *</label>
                  <input
                    name="ownerName"
                    required
                    placeholder="Ex: Marc Lemoine"
                    className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2 text-foreground outline-none focus:border-accent-cyan"
                  />
                </div>
              </div>

              <div>
                <label className="block text-muted-foreground font-medium mb-1">E-mail professionnel de connexion *</label>
                <input
                  name="ownerEmail"
                  type="email"
                  required
                  placeholder="contact@entreprise.com"
                  className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2 text-foreground outline-none focus:border-accent-cyan"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground font-medium mb-1">Mot de passe temporaire</label>
                  <input
                    name="password"
                    type="text"
                    placeholder="Laisser vide pour auto-générer"
                    className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2 text-foreground outline-none focus:border-accent-cyan font-mono"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground font-medium mb-1">Forfait attribué</label>
                  <select
                    name="planKey"
                    defaultValue="professional"
                    className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2 text-foreground outline-none focus:border-accent-cyan"
                  >
                    <option value="discovery">Discovery (0 € — 10 crédits)</option>
                    <option value="creator">Creator (29 € — 120 crédits)</option>
                    <option value="professional">Professional (89 € — 400 crédits)</option>
                    <option value="business">Business (249 € — 1 500 crédits)</option>
                    <option value="enterprise">Enterprise (Sur devis — Personnalisé)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-muted-foreground font-medium mb-1">Crédits IA alloués (optionnel, écrase le quota du forfait)</label>
                <input
                  name="customCredits"
                  type="number"
                  min="0"
                  placeholder="Par défaut : quota du forfait"
                  className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2 text-foreground outline-none focus:border-accent-cyan"
                />
              </div>

              <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-medium hover:bg-surface-raised"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-start-gradient px-5 py-2 text-xs font-bold text-white shadow-md hover:opacity-90 disabled:opacity-50 transition"
                >
                  {isPending ? 'Création en cours…' : 'Valider et Inscrire le Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
