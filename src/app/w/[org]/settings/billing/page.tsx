import { resolveTenant } from '@/lib/tenant';
import { db } from '@/lib/db';
import { getBalance, listRecentTransactions } from '@/server/services/credits.service';
import { listOrganizationInvoices } from '@/server/services/billing.service';
import { getBillingProvider } from '@/server/adapters/billing';
import { getPlan, formatPriceCents, type PlanKey } from '@/config/pricing';
import BillingPlans from '@/components/billing-plans';
import CreditPackList from '@/components/credit-pack-list';
import { openBillingPortalAction } from './actions';

export default async function BillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ org: string }>;
  searchParams: Promise<{ error?: string; checkout?: string; credits?: string }>;
}) {
  const { org } = await params;
  const { error, checkout, credits: creditsStatus } = await searchParams;
  const ctx = await resolveTenant(org);

  const [subscription, balance, transactions, memberCount, invoices] = await Promise.all([
    db.subscription.findUnique({ where: { organizationId: ctx.organization.id }, include: { plan: true } }),
    getBalance(ctx.organization.id),
    listRecentTransactions(ctx.organization.id, 10),
    db.membership.count({ where: { organizationId: ctx.organization.id } }),
    listOrganizationInvoices(ctx),
  ]);

  const currentPlanKey = (subscription?.plan.key as PlanKey | undefined) ?? 'discovery';
  const plan = getPlan(currentPlanKey);
  const billingConfigured = getBillingProvider().isConfigured();
  const portalAction = openBillingPortalAction.bind(null, org);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold">Abonnement et facturation</h1>
        <p className="mt-1 text-muted-foreground">Gérez le plan, les crédits et les factures de {ctx.organization.name}.</p>
      </div>

      {error && (
        <p className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          {decodeURIComponent(error)}
        </p>
      )}
      {checkout === 'success' && (
        <p className="rounded-lg border border-success/40 bg-success/10 px-4 py-3 text-sm text-success">
          Merci ! Votre abonnement est en cours d&apos;activation.
        </p>
      )}
      {creditsStatus === 'success' && (
        <p className="rounded-lg border border-success/40 bg-success/10 px-4 py-3 text-sm text-success">
          Merci ! Vos crédits seront ajoutés dès la confirmation du paiement.
        </p>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard label="Plan actuel" value={plan.name} />
        <StatCard label="Statut" value={subscription?.status ?? 'TRIAL'} />
        <StatCard label="Membres" value={`${memberCount} / ${plan.quotas.seatsIncluded === -1 ? '∞' : plan.quotas.seatsIncluded}`} />
        <StatCard
          label="Crédits STARS"
          value={`${balance} / ${plan.quotas.creditsPerMonth === -1 ? '∞' : plan.quotas.creditsPerMonth}`}
        />
      </section>

      {!billingConfigured && (
        <p className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          La facturation Stripe n&apos;est pas configurée sur cette installation (STRIPE_SECRET_KEY absent). Les boutons
          ci-dessous fonctionneront dès qu&apos;une clé Stripe (mode test ou live) sera renseignée dans .env.
        </p>
      )}

      {subscription?.stripeCustomerId && (
        <form action={portalAction}>
          <button type="submit" className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:border-accent-cyan">
            Gérer mon moyen de paiement et mes factures (Portail Stripe)
          </button>
        </form>
      )}

      <section>
        <h2 className="mb-4 text-center text-xl font-semibold">Changer de forfait</h2>
        <BillingPlans org={org} currentPlanKey={currentPlanKey} />
      </section>

      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Packs de crédits supplémentaires
        </h2>
        <CreditPackList org={org} />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Historique des crédits
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Motif</th>
                <th className="px-4 py-2 font-medium text-right">Montant</th>
                <th className="px-4 py-2 font-medium text-right">Solde après</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2">{t.createdAt.toLocaleDateString('fr-FR')}</td>
                  <td className="px-4 py-2">{t.reason}</td>
                  <td className={`px-4 py-2 text-right ${t.amount < 0 ? 'text-danger' : 'text-success'}`}>
                    {t.amount > 0 ? '+' : ''}
                    {t.amount}
                  </td>
                  <td className="px-4 py-2 text-right">{t.balanceAfter}</td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                    Aucun mouvement de crédits pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Factures</h2>
        <div className="rounded-2xl border border-border bg-surface p-4">
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {billingConfigured
                ? 'Aucune facture pour le moment.'
                : 'Les factures apparaîtront ici une fois la facturation Stripe connectée.'}
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {invoices.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between">
                  <span>{inv.createdAt.toLocaleDateString('fr-FR')} · {inv.number ?? inv.id}</span>
                  <span className="flex items-center gap-3">
                    <span>{formatPriceCents(inv.amountDueCents)}</span>
                    <span className="text-muted-foreground">{inv.status}</span>
                    {inv.hostedInvoiceUrl && (
                      <a href={inv.hostedInvoiceUrl} target="_blank" rel="noreferrer" className="text-accent-cyan hover:underline">
                        Voir
                      </a>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="text-lg font-semibold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
