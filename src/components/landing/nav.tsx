'use client';

import { useState } from 'react';
import Link from 'next/link';

const LINKS = [
  { href: '#produit', label: 'Fonctionnalités' },
  { href: '#parcours', label: 'STARS Direct & Explore' },
  { href: '#tarifs', label: 'Tarifs' },
  { href: '#securite', label: 'Sécurité & RGPD' },
  { href: '#faq', label: 'FAQ' },
];

export default function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-white/[0.08] bg-background/80 backdrop-blur-xl transition-all">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5 sm:px-8">
        {/* Brand Logo with Icon */}
        <Link href="/" className="group flex items-center gap-2.5 transition">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-start-gradient p-1.5 shadow-sm shadow-accent-cyan/20 transition group-hover:scale-105">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-full w-full text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-xl font-black tracking-tight text-white">
              STARS
            </span>
            <span className="hidden text-[10px] font-bold uppercase tracking-wider text-accent-cyan sm:inline">
              Editorial AI
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden items-center gap-8 lg:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-xs font-medium text-muted-foreground transition hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="hidden items-center gap-4 sm:flex">
          <Link
            href="/login"
            className="text-xs font-medium text-muted-foreground transition hover:text-white"
          >
            Connexion
          </Link>
          <Link
            href="/register"
            className="relative inline-flex items-center justify-center overflow-hidden rounded-xl bg-start-gradient px-4 py-2 text-xs font-bold text-white shadow-md shadow-accent-blue/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-glow-cyan"
          >
            <span>Démarrer l&apos;essai gratuit</span>
          </Link>
        </div>

        {/* Mobile menu hamburger button */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-xl border border-border/80 p-2 text-muted-foreground transition hover:bg-surface-raised hover:text-foreground sm:hidden"
          aria-expanded={open}
          aria-label="Ouvrir le menu"
        >
          {open ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="border-t border-border/80 bg-surface/95 px-6 py-5 backdrop-blur-2xl sm:hidden">
          <div className="flex flex-col gap-3.5">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="py-1 text-sm font-medium text-muted-foreground transition hover:text-foreground"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-border/60 pt-3">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-border px-4 py-2.5 text-center text-xs font-medium text-muted-foreground"
              >
                Connexion
              </Link>
              <Link
                href="/register"
                onClick={() => setOpen(false)}
                className="rounded-xl bg-start-gradient px-4 py-2.5 text-center text-xs font-bold text-white shadow"
              >
                Démarrer l&apos;essai gratuit
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
