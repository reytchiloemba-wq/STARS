import Link from 'next/link';

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Produit',
    links: [
      { label: 'STARS Direct', href: '#parcours' },
      { label: 'STARS Explore', href: '#parcours' },
      { label: 'Tarifs', href: '#tarifs' },
      { label: 'Sécurité & RGPD', href: '#securite' },
    ],
  },
  {
    title: 'Solutions',
    links: [
      { label: 'Dirigeants et consultants', href: '#produit' },
      { label: 'Équipes communication', href: '#produit' },
      { label: 'Agences et médias', href: '#produit' },
      { label: 'Fact-checking OSINT', href: '#produit' },
    ],
  },
  {
    title: 'Réseaux Sociaux Supportés',
    links: [
      { label: 'LinkedIn Enterprise', href: 'https://www.linkedin.com/company/stars-platform' },
      { label: 'X / Twitter v2', href: 'https://x.com/stars_platform' },
      { label: 'Instagram Professionnel', href: 'https://www.instagram.com/stars_platform' },
      { label: 'Facebook Pages Pro', href: 'https://www.facebook.com/starsplatform' },
    ],
  },
  {
    title: 'Ressources & Accès',
    links: [
      { label: 'FAQ', href: '#faq' },
      { label: 'Statut des services', href: '/status' },
      { label: 'Espace Connexion', href: '/login' },
      { label: 'Créer un compte', href: '/register' },
    ],
  },
];

const SOCIAL_ICONS = [
  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/stars-platform', icon: '💼' },
  { label: 'X', href: 'https://x.com/stars_platform', icon: '𝕏' },
  { label: 'Instagram', href: 'https://www.instagram.com/stars_platform', icon: '📸' },
  { label: 'Facebook', href: 'https://www.facebook.com/starsplatform', icon: '👥' },
];

const LEGAL_LINKS = [
  { label: 'Mentions légales', href: '/legal/mentions-legales' },
  { label: 'Confidentialité', href: '/legal/confidentialite' },
  { label: 'Cookies', href: '/legal/cookies' },
  { label: 'Conditions', href: '/legal/conditions' },
];

export default function LandingFooter() {
  return (
    <footer className="border-t border-white/[0.08] bg-surface/40 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-6 py-14 sm:px-8">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">{col.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      target={l.href.startsWith('http') ? '_blank' : undefined}
                      rel={l.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                      className="text-xs text-muted-foreground transition hover:text-accent-cyan"
                    >
                      {l.label}
                      {l.href.startsWith('http') && <span className="ml-1 text-[10px]">↗</span>}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Barre inférieure avec Réseaux Sociaux et Mentions Légales */}
        <div className="mt-12 flex flex-col items-center justify-between gap-6 border-t border-white/[0.08] pt-8 sm:flex-row">
          <div className="flex items-center gap-3">
            <span className="font-display text-lg font-black tracking-tight text-white">STARS</span>
            <span className="text-xs text-muted-foreground">· Smart Topics. Brighter Ideas.</span>
          </div>

          {/* Boutons d'accès direct aux réseaux sociaux */}
          <div className="flex items-center gap-3">
            {SOCIAL_ICONS.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                title={`Page ${s.label} de STARS`}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 bg-surface-raised/80 text-sm transition hover:border-accent-cyan hover:bg-surface hover:text-white"
              >
                <span>{s.icon}</span>
              </a>
            ))}
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            {LEGAL_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="transition hover:text-white">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
