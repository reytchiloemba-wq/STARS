'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import type { RoleName } from '@prisma/client';

interface NavGroup {
  title: string;
  items: { href: string; label: string; icon: string }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Général',
    items: [{ href: 'dashboard', label: 'Tableau de bord', icon: '📊' }],
  },
  {
    title: 'Veille & Intelligence',
    items: [
      { href: 'direct', label: 'STARS Direct', icon: '🔍' },
      { href: 'explore', label: 'STARS Explore', icon: '🌐' },
      { href: 'radar', label: 'Radar Mondial', icon: '📡' },
      { href: 'domains', label: 'Domaines Suivis', icon: '🏷️' },
      { href: 'experts', label: 'Fiches Experts', icon: '🎓' },
      { href: 'sources', label: 'Gouvernance Sources', icon: '📚' },
    ],
  },
  {
    title: 'Édition & Diffusion',
    items: [
      { href: 'studio', label: 'Studio Éditorial', icon: '✍️' },
      { href: 'drafts', label: 'Brouillons & Bibliothèque', icon: '📝' },
      { href: 'calendar', label: 'Calendrier Éditorial', icon: '📅' },
      { href: 'publications', label: 'Publications', icon: '🚀' },
    ],
  },
  {
    title: 'Engagement & Communauté',
    items: [
      { href: 'comments', label: 'Comment Intelligence', icon: '💬' },
    ],
  },
  {
    title: 'Stratégie & Impact',
    items: [
      { href: 'brand-voice', label: 'Brand Voice Studio', icon: '🎙️' },
      { href: 'briefings', label: 'Briefings Exécutifs', icon: '📋' },
      { href: 'alerts', label: 'Alertes & Watchlists', icon: '🔔' },
      { href: 'analytics', label: 'Analytics & Impact', icon: '📈' },
    ],
  },
  {
    title: 'Paramètres',
    items: [
      { href: 'settings/team', label: 'Équipe & Rôles', icon: '👥' },
      { href: 'settings/billing', label: 'Abonnement & Crédits', icon: '💎' },
      { href: 'settings/social', label: 'Mes Réseaux Sociaux', icon: '🔗' },
    ],
  },
];

export default function WorkspaceShell({
  children,
  activeOrgSlug,
  activeOrgName,
  role,
  organizations,
}: {
  children: React.ReactNode;
  activeOrgSlug: string;
  activeOrgName: string;
  role: RoleName;
  organizations: { slug: string; name: string }[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Find active item for breadcrumb
  let activeItemTitle = 'Espace de travail';
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      const href = `/w/${activeOrgSlug}/${item.href}`;
      if (pathname === href || pathname.startsWith(`${href}/`)) {
        activeItemTitle = item.label;
        break;
      }
    }
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm transition-opacity md:hidden"
          aria-hidden="true"
        />
      )}

      {/* Barre latérale desktop & mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border/80 bg-surface/95 px-4 py-5 backdrop-blur-xl transition-transform duration-300 ease-in-out md:static md:w-64 md:translate-x-0 ${
          mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-2">
          <Link
            href={`/w/${activeOrgSlug}/dashboard`}
            className="flex items-center gap-2.5 transition hover:opacity-90"
            onClick={() => setMobileOpen(false)}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-start-gradient shadow-glow-cyan">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="h-4 w-4 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <div>
              <span className="font-display text-lg font-extrabold tracking-tight text-white">
                STARS
              </span>
              <span className="ml-1.5 rounded-full border border-accent-cyan/30 bg-accent-cyan/10 px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider text-accent-cyan">
                SaaS
              </span>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-raised hover:text-foreground md:hidden"
            aria-label="Fermer le menu"
          >
            ✕
          </button>
        </div>

        {/* Sélecteur d'organisation moderne */}
        <div className="mt-4 rounded-xl border border-border/60 bg-surface-raised/60 p-2.5 shadow-inner">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="uppercase tracking-wider font-semibold">Organisation</span>
            <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-bold text-accent-cyan">
              {role}
            </span>
          </div>
          <select
            className="mt-1.5 w-full rounded-lg border border-border/70 bg-surface px-2.5 py-1.5 text-xs font-semibold text-foreground outline-none transition focus:border-accent-cyan"
            value={activeOrgSlug}
            onChange={(e) => {
              router.push(`/w/${e.target.value}/dashboard`);
              setMobileOpen(false);
            }}
          >
            {organizations.map((o) => (
              <option key={o.slug} value={o.slug}>
                {o.name}
              </option>
            ))}
          </select>
        </div>

        {/* Groupes de navigation */}
        <nav className="mt-5 flex-1 space-y-5 overflow-y-auto pr-1">
          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <div className="px-2.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                {group.title}
              </div>
              <div className="mt-1 space-y-0.5">
                {group.items.map((item) => {
                  const href = `/w/${activeOrgSlug}/${item.href}`;
                  const active = pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-all ${
                        active
                          ? 'bg-start-gradient text-white shadow-md shadow-accent-blue/15'
                          : 'text-muted-foreground hover:bg-surface-raised hover:text-foreground'
                      }`}
                    >
                      <span className="text-sm">{item.icon}</span>
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer Sidebar */}
        <div className="mt-auto border-t border-border/80 pt-3.5 text-xs">
          <div className="flex items-center justify-between">
            <div className="truncate font-semibold text-foreground">{activeOrgName}</div>
            <Link
              href="/"
              target="_blank"
              className="rounded-md border border-border/60 px-1.5 py-0.5 text-[10px] text-muted-foreground transition hover:border-accent-cyan hover:text-accent-cyan"
            >
              Portail ↗
            </Link>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted-foreground">
            <Link
              href={`/w/${activeOrgSlug}/settings/billing`}
              className="hover:text-accent-cyan"
              onClick={() => setMobileOpen(false)}
            >
              💎 Plan & Facturation
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-danger/80 hover:text-danger hover:underline"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </aside>

      {/* Zone Principale avec Header Supérieur Réactif */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/60 bg-surface/70 px-4 backdrop-blur-md sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg border border-border p-1.5 text-sm md:hidden hover:border-accent-cyan"
              aria-label="Ouvrir le menu de navigation"
            >
              ☰
            </button>

            {/* Breadcrumb indicator */}
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span className="hidden sm:inline text-foreground/80">{activeOrgName}</span>
              <span className="hidden sm:inline text-border">/</span>
              <span className="font-semibold text-foreground">{activeItemTitle}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/w/${activeOrgSlug}/studio`}
              className="flex items-center gap-1.5 rounded-xl bg-start-gradient px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:opacity-90 hover:shadow-glow-cyan"
            >
              <span>+</span>
              <span className="hidden sm:inline">Nouveau post</span>
            </Link>

            <Link
              href="/admin/infrastructure"
              className="hidden lg:flex items-center gap-1.5 rounded-xl border border-border/80 bg-surface-raised/80 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-accent-cyan hover:text-foreground"
            >
              <span>⚙️</span>
              <span>Cockpit Super Admin</span>
            </Link>

            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/login' })}
              title="Se déconnecter"
              className="rounded-xl border border-border/70 p-1.5 text-xs text-muted-foreground transition hover:border-danger/40 hover:bg-danger/10 hover:text-danger"
              aria-label="Déconnexion"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.8" stroke="currentColor" className="h-4 w-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
              </svg>
            </button>
          </div>
        </header>

        {/* Contenu principal */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
