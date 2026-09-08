import { db } from '@/lib/db';
import AdminClient from './admin-client';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const [organizations, totalUsers, totalAnalyses, totalDrafts, totalPubs, recentAuditLogs] = await Promise.all([
    db.organization.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        subscription: { include: { plan: true } },
        creditWallet: true,
        _count: { select: { memberships: true, drafts: true, publications: true } },
      },
    }),
    db.user.count(),
    db.analysis.count(),
    db.draft.count(),
    db.publication.count(),
    db.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { actor: { select: { email: true } }, organization: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Supervision Globale de la Plateforme</h1>
        <p className="text-xs text-muted-foreground">
          Supervisez l&apos;ensemble des tenants, les consommations d&apos;IA, la santé de l&apos;infrastructure et les audits de conformité.
        </p>
      </div>

      {/* Statistiques globales */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="text-xs text-muted-foreground">Tenants actifs</div>
          <div className="mt-1 text-2xl font-bold text-foreground">{organizations.length}</div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="text-xs text-muted-foreground">Utilisateurs inscrits</div>
          <div className="mt-1 text-2xl font-bold text-foreground">{totalUsers}</div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="text-xs text-muted-foreground">Analyses créées</div>
          <div className="mt-1 text-2xl font-bold text-foreground">{totalAnalyses}</div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="text-xs text-muted-foreground">Brouillons & Posts</div>
          <div className="mt-1 text-2xl font-bold text-foreground">{totalDrafts}</div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="text-xs text-muted-foreground">Publications diffusées</div>
          <div className="mt-1 text-2xl font-bold text-foreground">{totalPubs}</div>
        </div>
      </div>

      <AdminClient organizations={organizations} recentAuditLogs={recentAuditLogs} />
    </div>
  );
}
