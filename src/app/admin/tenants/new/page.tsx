import type { Metadata } from 'next';
import Link from 'next/link';
import { TenantRegistrationForm } from './tenant-registration-form';

export const metadata: Metadata = {
  title: 'Inscrire un Tenant B2B | STARS Administration',
  description: 'Formulaire officiel d’onboarding et de provisionnement des organisations B2B par l’administrateur STARS.',
};

export const dynamic = 'force-dynamic';

export default function NewTenantPage() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-16">
      {/* Fil d'Ariane & En-tête */}
      <div>
        <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <Link href="/admin" className="hover:text-foreground transition">
            Supervision Admin
          </Link>
          <span>/</span>
          <span className="text-foreground font-semibold">Tenants</span>
          <span>/</span>
          <span className="text-accent-cyan font-bold">Inscription B2B</span>
        </nav>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight sm:text-3xl">
              Inscription &amp; Provisionnement Tenant B2B
            </h1>
            <p className="mt-1.5 text-xs text-muted-foreground sm:text-sm">
              Enregistrez une nouvelle organisation cliente, configurez ses accès C-Level, affectez son forfait STARS et allouez ses crédits SIC.
            </p>
          </div>

          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-white hover:border-accent-cyan transition"
          >
            <span>← Retour à la Supervision</span>
          </Link>
        </div>
      </div>

      {/* Formulaire complet B2B */}
      <TenantRegistrationForm />
    </div>
  );
}
