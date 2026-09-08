import { resolveTenant } from '@/lib/tenant';
import { db } from '@/lib/db';
import Link from 'next/link';

export default async function DashboardPage({ params }: { params: Promise<{ org: string }> }) {
  const { org } = await params;
  const ctx = await resolveTenant(org);

  const [
    topicCount,
    draftCount,
    pendingApprovalCount,
    scheduledCount,
    wallet,
    alerts,
    recentDrafts,
    followedDomains,
  ] = await Promise.all([
    db.topic.count({ where: { organizationId: ctx.organization.id } }),
    db.draft.count({ where: { organizationId: ctx.organization.id } }),
    db.draft.count({ where: { organizationId: ctx.organization.id, status: 'READY_FOR_REVIEW' } }),
    db.schedule.count({ where: { organizationId: ctx.organization.id } }),
    db.creditWallet.findUnique({ where: { organizationId: ctx.organization.id } }),
    db.alert.findMany({ where: { organizationId: ctx.organization.id, isActive: true }, take: 4 }),
    db.draft.findMany({
      where: { organizationId: ctx.organization.id },
      orderBy: { updatedAt: 'desc' },
      take: 4,
    }),
    db.organizationDomain.findMany({
      where: { organizationId: ctx.organization.id },
      include: { category: true },
      take: 6,
    }),
  ]);

  const creditBalance = wallet?.balance ?? 0;

  return (
    <div className="space-y-8">
      {/* En-tête Salutation et Actions rapides */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-accent-cyan/30 bg-accent-cyan/10 px-3 py-0.5 text-xs font-semibold text-accent-cyan">
            <span>Cockpit Éditorial Exécutif</span>
          </div>
          <h1 className="mt-2 font-display text-2xl font-black text-white sm:text-3xl">
            Tableau de Bord — {ctx.organization.name}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Espace d&apos;intelligence éditoriale · Rôle actif : <span className="font-semibold text-foreground">{ctx.membership.role}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/w/${org}/settings/billing`}
            className="flex items-center gap-2 rounded-xl border border-border/80 bg-surface px-4 py-2 text-xs font-semibold shadow-sm transition hover:border-accent-cyan hover:shadow-glow-cyan"
          >
            <span>💎 Solde Crédits :</span>
            <span className="font-bold text-accent-cyan">{creditBalance}</span>
          </Link>
          <Link
            href={`/w/${org}/studio`}
            className="flex items-center gap-1.5 rounded-xl bg-start-gradient px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-accent-blue/20 transition hover:scale-[1.02] hover:shadow-glow-cyan"
          >
            <span>+</span>
            <span>Préparer un post</span>
          </Link>
        </div>
      </div>

      {/* Barre STARS Direct Premium intégrée avec Ambient Glow */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.1] bg-surface/90 p-6 shadow-xl backdrop-blur-xl">
        <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-accent-cyan/10 blur-[60px]" />
        
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent-cyan">
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-accent-cyan/20 text-xs">🔍</span>
          <span>STARS Direct — Recherche & Analyse Immédiate</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Saisissez un sujet, une entreprise, une réglementation ou une URL pour lancer le copilote d&apos;analyse contradictoire.
        </p>

        <form action={`/w/${org}/direct`} method="GET" className="mt-4 flex flex-col gap-2.5 sm:flex-row">
          <input
            name="q"
            placeholder="Ex : Impact de l'IA générative sur les modèles économiques des médias européens..."
            className="flex-1 rounded-xl border border-border/80 bg-surface-raised/80 px-4 py-3 text-sm text-foreground outline-none transition focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan/40"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-start-gradient px-6 py-3 text-xs font-bold text-white shadow-md transition hover:scale-[1.01] hover:opacity-95"
          >
            <span>Analyser maintenant</span>
            <span>→</span>
          </button>
        </form>

        {/* Suggestions rapides */}
        <div className="mt-3.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground/70">Suggestions rapides :</span>
          {[
            'Directive IA européenne',
            'Souveraineté Cloud & GPU',
            'Cybersécurité bancaire',
            'Transition énergétique & PME',
          ].map((s) => (
            <Link
              key={s}
              href={`/w/${org}/direct?q=${encodeURIComponent(s)}`}
              className="rounded-lg border border-border/60 bg-surface-raised px-2 py-0.5 transition hover:border-accent-cyan hover:text-white"
            >
              {s}
            </Link>
          ))}
        </div>
      </div>

      {/* Cartes métriques clés modernisées */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon="🌐"
          label="Sujets & Dossiers suivis"
          value={topicCount}
          link={`/w/${org}/explore`}
          linkText="Explorer l'actualité"
          trend="+12% ce mois"
        />
        <MetricCard
          icon="📝"
          label="Brouillons en rédaction"
          value={draftCount}
          link={`/w/${org}/drafts`}
          linkText="Voir la bibliothèque"
          trend="En cours"
        />
        <MetricCard
          icon="⚖️"
          label="Circuit de validation"
          value={pendingApprovalCount}
          link={`/w/${org}/drafts`}
          linkText="Revue d'équipe"
          badge={pendingApprovalCount > 0 ? 'Action requise' : undefined}
          trend={pendingApprovalCount > 0 ? 'Prioritaire' : 'À jour'}
        />
        <MetricCard
          icon="📅"
          label="Publications programmées"
          value={scheduledCount}
          link={`/w/${org}/calendar`}
          linkText="Calendrier éditorial"
          trend="Multi-réseaux"
        />
      </div>

      {/* Sections parallèles : Signaux du radar & Derniers brouillons */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Veille prioritaire & Alertes */}
        <div className="glass-card flex flex-col justify-between rounded-2xl p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-base">📡</span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Veille prioritaire & Alertes actives
                </h3>
              </div>
              <Link href={`/w/${org}/radar`} className="text-xs font-semibold text-accent-cyan hover:underline">
                Radar mondial →
              </Link>
            </div>

            <div className="space-y-2.5">
              {alerts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/80 py-7 text-center text-xs text-muted-foreground">
                  Aucune alerte active.{' '}
                  <Link href={`/w/${org}/alerts`} className="font-semibold text-accent-cyan hover:underline">
                    Créer une alerte
                  </Link>
                </div>
              ) : (
                alerts.map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-xl border border-border/60 bg-surface-raised/70 p-3 text-xs transition hover:border-accent-cyan/40">
                    <div>
                      <span className="font-semibold text-white">{a.label}</span>
                      <div className="text-[11px] text-muted-foreground">
                        Surveillance active · Notification instantanée
                      </div>
                    </div>
                    <span className="rounded-full border border-success/40 bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">
                      Active
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-border/80 pt-3">
              <h4 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Domaines thématiques suivis :
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {followedDomains.length === 0 ? (
                  <span className="text-xs text-muted-foreground">Aucun domaine configuré.</span>
                ) : (
                  followedDomains.map((fd) => (
                    <Link
                      key={fd.id}
                      href={`/w/${org}/explore/${fd.category.key}`}
                      className="rounded-lg border border-border/80 bg-surface px-2.5 py-1 text-xs text-foreground transition hover:border-accent-cyan hover:text-white"
                    >
                      {fd.category.label}
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Dernières publications et brouillons */}
        <div className="glass-card flex flex-col justify-between rounded-2xl p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-base">✍️</span>
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Derniers contenus en rédaction
                </h3>
              </div>
              <Link href={`/w/${org}/drafts`} className="text-xs font-semibold text-accent-cyan hover:underline">
                Tous les brouillons →
              </Link>
            </div>

            <div className="space-y-2.5">
              {recentDrafts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/80 py-7 text-center text-xs text-muted-foreground">
                  Aucun brouillon pour l&apos;instant.{' '}
                  <Link href={`/w/${org}/studio`} className="font-semibold text-accent-cyan hover:underline">
                    Ouvrir le Studio
                  </Link>
                </div>
              ) : (
                recentDrafts.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-xl border border-border/60 bg-surface-raised/70 p-3 text-xs transition hover:border-accent-cyan/40">
                    <div className="mr-3 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-accent-cyan">{d.network}</span>
                        <span className="rounded bg-surface px-1.5 py-0.2 text-[10px] text-muted-foreground">
                          {d.status}
                        </span>
                      </div>
                      <p className="line-clamp-1 text-muted-foreground">
                        {d.currentContent || 'Brouillon vide'}
                      </p>
                    </div>
                    <Link
                      href={`/w/${org}/studio?draftId=${d.id}`}
                      className="shrink-0 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-accent-cyan hover:border-accent-cyan hover:bg-surface"
                    >
                      Reprendre →
                    </Link>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between border-t border-border/80 pt-3 text-xs">
              <Link href={`/w/${org}/briefings`} className="font-semibold text-accent-cyan hover:underline">
                📊 Générer le briefing exécutif hebdomadaire →
              </Link>
              <Link href={`/w/${org}/calendar`} className="text-muted-foreground hover:text-foreground">
                Calendrier ↗
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  link,
  linkText,
  badge,
  trend,
}: {
  icon: string;
  label: string;
  value: number;
  link: string;
  linkText: string;
  badge?: string;
  trend?: string;
}) {
  return (
    <div className="glass-card flex flex-col justify-between rounded-2xl p-5">
      <div>
        <div className="flex items-center justify-between">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-raised text-base shadow-inner">
            {icon}
          </span>
          {badge ? (
            <span className="rounded-full border border-warning/40 bg-warning/15 px-2 py-0.5 text-[10px] font-bold text-warning">
              {badge}
            </span>
          ) : trend ? (
            <span className="text-[11px] font-medium text-muted-foreground">{trend}</span>
          ) : null}
        </div>
        <div className="mt-3">
          <div className="font-display text-3xl font-black text-white">{value}</div>
          <div className="mt-1 text-xs text-muted-foreground">{label}</div>
        </div>
      </div>
      <Link
        href={link}
        className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs font-semibold text-accent-cyan hover:underline"
      >
        <span>{linkText}</span>
        <span>→</span>
      </Link>
    </div>
  );
}
