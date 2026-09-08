import { resolveTenant } from '@/lib/tenant';
import { db } from '@/lib/db';
import { disconnectSocialAccountAction, connectSandboxAccountAction } from './actions';
import Link from 'next/link';

const NETWORKS: {
  key: 'linkedin' | 'facebook' | 'instagram' | 'x';
  networkEnum: 'LINKEDIN' | 'FACEBOOK' | 'INSTAGRAM' | 'X';
  label: string;
  icon: string;
  description: string;
  color: string;
}[] = [
  {
    key: 'linkedin',
    networkEnum: 'LINKEDIN',
    label: 'LinkedIn',
    icon: '💼',
    description: 'Publication sur profils personnels et Pages Entreprises vérifiées.',
    color: 'border-[#0A66C2]/40 bg-[#0A66C2]/10 text-[#0A66C2]',
  },
  {
    key: 'x',
    networkEnum: 'X',
    label: 'X (Twitter)',
    icon: '𝕏',
    description: 'Diffusion de threads et de posts avec statistiques d’engagement.',
    color: 'border-white/30 bg-white/10 text-white',
  },
  {
    key: 'instagram',
    networkEnum: 'INSTAGRAM',
    label: 'Instagram Pro',
    icon: '📸',
    description: 'Publication de visuels et légendes sur comptes Business et Créateurs.',
    color: 'border-[#E4405F]/40 bg-[#E4405F]/10 text-[#E4405F]',
  },
  {
    key: 'facebook',
    networkEnum: 'FACEBOOK',
    label: 'Facebook Pages',
    icon: '👥',
    description: 'Gestion et publication programmée sur vos Pages d’organisation.',
    color: 'border-[#1877F2]/40 bg-[#1877F2]/10 text-[#1877F2]',
  },
];

export default async function SocialSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ org: string }>;
  searchParams: Promise<{ error?: string; connected?: string }>;
}) {
  const { org } = await params;
  const { error, connected } = await searchParams;
  const ctx = await resolveTenant(org);

  const accounts = await db.socialAccount.findMany({
    where: { organizationId: ctx.organization.id, status: { not: 'REVOKED' } },
    orderBy: { createdAt: 'desc' },
  });

  const disconnect = disconnectSocialAccountAction.bind(null, org);

  return (
    <div className="space-y-8">
      {/* En-tête de la page */}
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-accent-cyan/30 bg-accent-cyan/10 px-3 py-0.5 text-xs font-semibold text-accent-cyan">
          <span>Canaux de Publication</span>
        </div>
        <h1 className="mt-2 font-display text-2xl font-black text-white sm:text-3xl">
          Mes Réseaux Sociaux
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connectez vos profils et pages officielles pour publier vos analyses depuis le Studio Éditorial. STARS garantit la confidentialité de vos jetons chiffrés en AES-256-GCM.
        </p>
      </div>

      {/* Messages de succès ou d'erreur */}
      {connected && (
        <div className="flex items-center gap-3 rounded-xl border border-success/40 bg-success/10 p-4 text-xs text-success">
          <span className="text-base">✓</span>
          <span>
            Compte <strong>{connected.toUpperCase()}</strong> connecté avec succès ! Il est maintenant disponible dans le Studio Éditorial.
          </span>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-danger/40 bg-danger/10 p-4 text-xs text-danger">
          <div className="font-bold">Information sur la connexion :</div>
          <div className="mt-1">{decodeURIComponent(error)}</div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Astuce : Si vous êtes en environnement de test ou si vos clés d’API officielles ne sont pas encore validées par Meta ou LinkedIn, vous pouvez activer un compte en mode Bac à sable (Sandbox) ci-dessous.
          </p>
        </div>
      )}

      {/* Grille des 4 réseaux disponibles pour connexion */}
      <section className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Connecter un nouveau réseau
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {NETWORKS.map((n) => {
            const connectedAccount = accounts.find((a) => a.network === n.networkEnum);
            return (
              <div
                key={n.key}
                className="glass-card flex flex-col justify-between rounded-2xl p-5"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl">{n.icon}</span>
                    {connectedAccount ? (
                      <span className="rounded-full border border-success/40 bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">
                        Connecté
                      </span>
                    ) : (
                      <span className="rounded-full border border-border bg-surface-raised px-2 py-0.5 text-[10px] text-muted-foreground">
                        Non lié
                      </span>
                    )}
                  </div>
                  <h3 className="mt-3 font-display text-base font-bold text-white">{n.label}</h3>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{n.description}</p>
                </div>

                <div className="mt-5 space-y-2 border-t border-border/60 pt-4">
                  {/* Bouton OAuth Réel */}
                  <a
                    href={`/api/oauth/${n.key}/start?org=${org}`}
                    className="block w-full rounded-xl bg-start-gradient py-2 text-center text-xs font-bold text-white shadow-sm transition hover:scale-[1.01] hover:opacity-95"
                  >
                    Connecter via {n.label} ↗
                  </a>

                  {/* Bouton Sandbox Instantané */}
                  {!connectedAccount && (
                    <form action={connectSandboxAccountAction.bind(null, org, n.networkEnum)}>
                      <button
                        type="submit"
                        className="w-full rounded-xl border border-border/80 bg-surface-raised/80 py-1.5 text-center text-[11px] font-medium text-muted-foreground transition hover:border-accent-cyan hover:text-white"
                      >
                        + Activer compte Sandbox
                      </button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Liste des comptes déjà connectés */}
      <section className="glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between border-b border-border/80 pb-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-white">
            Comptes connectés & autorisés ({accounts.length})
          </h2>
          <Link
            href={`/w/${org}/studio`}
            className="text-xs font-semibold text-accent-cyan hover:underline"
          >
            Ouvrir le Studio Éditorial →
          </Link>
        </div>

        {accounts.length === 0 ? (
          <div className="py-10 text-center text-xs text-muted-foreground">
            Aucun compte social connecté pour le moment. Cliquez sur un des réseaux ci-dessus pour connecter votre profil ou activer un compte de test.
          </div>
        ) : (
          <div className="mt-4 divide-y divide-border/60">
            {accounts.map((acc) => (
              <div key={acc.id} className="flex flex-col justify-between gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-surface-raised px-2 py-0.5 text-xs font-bold text-accent-cyan">
                      {acc.network}
                    </span>
                    <span className="font-semibold text-white">{acc.displayName}</span>
                    <span className="rounded-full border border-success/40 bg-success/15 px-2 py-0.2 text-[10px] font-bold text-success">
                      {acc.status}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Permissions : {acc.scopes.join(', ') || 'Standard'} ·{' '}
                    {acc.expiresAt
                      ? `Valide jusqu’au ${new Date(acc.expiresAt).toLocaleDateString('fr-FR')}`
                      : 'Actif en continu'}
                  </div>
                </div>

                <form action={disconnect.bind(null, acc.id)}>
                  <button
                    type="submit"
                    className="rounded-xl border border-danger/40 px-3 py-1.5 text-xs font-medium text-danger transition hover:bg-danger/10"
                  >
                    Déconnecter
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
