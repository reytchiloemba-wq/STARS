'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  PLANS,
  formatPriceCents,
  ANNUAL_MONTHS_FREE,
  VAT_NOTE,
  type PlanKey,
} from '@/config/pricing';
import { registerAction } from '@/app/(auth)/actions';

interface RegisterClientProps {
  initialPlan?: PlanKey;
  initialCycle?: 'MONTHLY' | 'ANNUAL';
  initialName?: string;
  initialEmail?: string;
  initialOrg?: string;
  errorMessage?: string;
  isCancelled?: boolean;
}

const SELF_SERVE_PLANS = PLANS.filter((p) => !p.isCustomPricing);

export default function RegisterClient({
  initialPlan = 'professional',
  initialCycle = 'MONTHLY',
  initialName = '',
  initialEmail = '',
  initialOrg = '',
  errorMessage,
  isCancelled,
}: RegisterClientProps) {
  const [selectedPlanKey, setSelectedPlanKey] = useState<PlanKey>(
    SELF_SERVE_PLANS.some((p) => p.key === initialPlan) ? initialPlan : 'professional'
  );
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'ANNUAL'>(initialCycle);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultPlan = SELF_SERVE_PLANS[0]!;
  const selectedPlan =
    SELF_SERVE_PLANS.find((p) => p.key === selectedPlanKey) ?? defaultPlan;

  const priceCents =
    billingCycle === 'ANNUAL'
      ? selectedPlan.annualPriceCents
      : selectedPlan.monthlyPriceCents;

  const isFree = selectedPlan.key === 'discovery';
  const hasTrial = !isFree && Boolean(selectedPlan.trialDays);

  return (
    <div className="relative mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      {/* Glow d'ambiance d'arrière-plan */}
      <div className="pointer-events-none absolute -top-20 left-1/2 -z-10 h-96 w-[700px] -translate-x-1/2 rounded-full bg-start-gradient opacity-15 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/2 -left-20 -z-10 h-72 w-72 rounded-full bg-accent-cyan/10 blur-[100px]" />

      {/* En-tête de la page */}
      <div className="text-center">
        <Link href="/" className="inline-block group">
          <div className="flex items-center justify-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-start-gradient p-2 shadow-md shadow-accent-cyan/25 transition group-hover:scale-105">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-full w-full text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <span className="font-display text-2xl font-black tracking-tight text-white">STARS</span>
          </div>
        </Link>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-accent-cyan/40 bg-accent-cyan/10 px-3.5 py-1 text-xs font-semibold text-accent-cyan">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-cyan animate-pulse" />
          <span>Création d&apos;Organisation &amp; Souscription en Ligne</span>
        </div>
        <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Activez votre cockpit d&apos;intelligence éditoriale
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Choisissez votre forfait, configurez votre organisation et démarrez votre veille stratégique sans friction.
        </p>
      </div>

      {/* Alertes d'état (Erreurs / Annulation Stripe) */}
      {errorMessage && (
        <div className="mx-auto mt-6 max-w-2xl rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger shadow-sm flex items-start gap-3">
          <span className="text-lg">⚠️</span>
          <div>
            <strong className="block font-semibold">Information d&apos;inscription :</strong>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {isCancelled && (
        <div className="mx-auto mt-6 max-w-2xl rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-300 shadow-sm flex items-start gap-3">
          <span className="text-lg">ℹ️</span>
          <div>
            <strong className="block font-semibold">Session de paiement interrompue :</strong>
            <span>Vous pouvez choisir un autre forfait ou reprendre votre inscription ci-dessous.</span>
          </div>
        </div>
      )}

      {/* Étape 1 : Sélecteur de Forfait */}
      <div className="mt-10">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-cyan/20 text-xs font-bold text-accent-cyan">1</span>
              <span>Sélectionnez votre forfait</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Changez ou résiliez à tout moment depuis votre espace de facturation.
            </p>
          </div>

          {/* Switcher Mensuel / Annuel */}
          <div className="flex items-center gap-3 rounded-2xl border border-border/80 bg-surface/80 p-1.5 backdrop-blur-md shadow-inner">
            <button
              type="button"
              id="cycle-monthly-btn"
              onClick={() => setBillingCycle('MONTHLY')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                billingCycle === 'MONTHLY'
                  ? 'bg-start-gradient text-white shadow-sm'
                  : 'text-muted-foreground hover:text-white'
              }`}
            >
              Mensuel
            </button>
            <button
              type="button"
              id="cycle-annual-btn"
              onClick={() => setBillingCycle('ANNUAL')}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                billingCycle === 'ANNUAL'
                  ? 'bg-start-gradient text-white shadow-sm'
                  : 'text-muted-foreground hover:text-white'
              }`}
            >
              <span>Annuel</span>
              <span className="rounded-full bg-success/20 px-2 py-0.2 text-[10px] font-extrabold text-success border border-success/30">
                {ANNUAL_MONTHS_FREE} mois offerts
              </span>
            </button>
          </div>
        </div>

        {/* Cartes des 4 forfaits */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SELF_SERVE_PLANS.map((plan) => {
            const isSelected = plan.key === selectedPlanKey;
            const isPopular = plan.highlight === 'most-popular';
            const price =
              billingCycle === 'ANNUAL' ? plan.annualPriceCents : plan.monthlyPriceCents;

            return (
              <div
                key={plan.key}
                id={`plan-card-${plan.key}`}
                onClick={() => setSelectedPlanKey(plan.key)}
                className={`relative flex cursor-pointer flex-col justify-between rounded-2xl p-5 transition-all duration-300 ${
                  isSelected
                    ? 'border-2 border-accent-cyan bg-surface-raised shadow-xl shadow-accent-cyan/15 ring-2 ring-accent-cyan/30 scale-[1.02]'
                    : 'border border-border/80 bg-surface/80 hover:border-accent-cyan/50 hover:bg-surface-raised/70'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-base font-bold text-white">{plan.name}</span>
                    {isPopular && (
                      <span className="rounded-full bg-start-gradient px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white shadow-sm">
                        Populaire
                      </span>
                    )}
                    {plan.trialDays && (
                      <span className="rounded-full border border-accent-violet/40 bg-accent-violet/15 px-2 py-0.5 text-[9px] font-bold text-accent-violet">
                        {plan.trialDays}j d&apos;essai
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {plan.tagline}
                  </p>

                  <div className="mt-4 border-t border-border/60 pt-3">
                    <div className="flex items-baseline gap-1">
                      <span className="font-display text-2xl font-black text-white">
                        {formatPriceCents(price)}
                      </span>
                      {price !== null && price > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {billingCycle === 'ANNUAL' ? '/an HT' : '/mois HT'}
                        </span>
                      )}
                    </div>
                    {billingCycle === 'ANNUAL' && price !== null && price > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Équivalent à {formatPriceCents(Math.round(price / 12))}/mois
                      </p>
                    )}
                  </div>

                  {/* Quotas clés */}
                  <div className="mt-4 space-y-1.5 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>Crédits SIC :</span>
                      <strong className="text-accent-cyan font-mono font-bold">
                        {plan.quotas.creditsPerMonth} / mois
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Utilisateurs :</span>
                      <span className="text-foreground font-medium">{plan.quotas.seatsIncluded}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Domaines suivis :</span>
                      <span className="text-foreground font-medium">{plan.quotas.domains}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Réseaux connectés :</span>
                      <span className="text-foreground font-medium">{plan.quotas.socialAccountsIncluded}</span>
                    </div>
                  </div>
                </div>

                {/* Radio selection indicator */}
                <div className="mt-5 flex items-center gap-2 border-t border-border/60 pt-3">
                  <div
                    className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                      isSelected
                        ? 'border-accent-cyan bg-accent-cyan'
                        : 'border-muted-foreground/50 bg-transparent'
                    }`}
                  >
                    {isSelected && <div className="h-1.5 w-1.5 rounded-full bg-background" />}
                  </div>
                  <span className={`text-xs font-semibold ${isSelected ? 'text-accent-cyan' : 'text-muted-foreground'}`}>
                    {isSelected ? 'Forfait sélectionné' : 'Choisir ce forfait'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Note pour le plan Enterprise */}
        <div className="mt-4 text-center text-xs text-muted-foreground">
          Besoin d&apos;une infrastructure dédiée, d&apos;un volume sur-mesure ou d&apos;un SLA 99.9% ?{' '}
          <Link href="/contact-sales?plan=enterprise" className="text-accent-cyan hover:underline font-medium">
            Découvrir l&apos;offre STARS Enterprise →
          </Link>
        </div>
      </div>

      {/* Étape 2 : Formulaire d'inscription & Récapitulatif de Commande */}
      <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Formulaire utilisateur (7 colonnes) */}
        <div className="rounded-2xl border border-border bg-surface/90 p-6 shadow-xl backdrop-blur-xl sm:p-8 lg:col-span-7">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-cyan/20 text-xs font-bold text-accent-cyan">2</span>
            <span>Vos informations professionnelles</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Ces identifiants vous serviront à administrer votre organisation et accéder au cockpit.
          </p>

          <form
            action={registerAction}
            onSubmit={() => setIsSubmitting(true)}
            className="mt-6 space-y-4"
          >
            {/* Champs cachés pour le plan et le cycle */}
            <input type="hidden" name="planKey" value={selectedPlanKey} />
            <input type="hidden" name="billingCycle" value={billingCycle} />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                  Nom et prénom <span className="text-accent-cyan">*</span>
                </span>
                <input
                  name="name"
                  type="text"
                  required
                  defaultValue={initialName}
                  placeholder="Ex : Alexandra Dupont"
                  className="w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan/30"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                  Organisation ou Entreprise <span className="text-accent-cyan">*</span>
                </span>
                <input
                  name="organizationName"
                  type="text"
                  required
                  defaultValue={initialOrg}
                  placeholder="Ex : Nexus Media Group"
                  className="w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan/30"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                Adresse e-mail professionnelle <span className="text-accent-cyan">*</span>
              </span>
              <input
                name="email"
                type="email"
                required
                defaultValue={initialEmail}
                placeholder="alexandra@nexus-media.fr"
                className="w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan/30"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">
                Mot de passe sécurisé <span className="text-accent-cyan">*</span> (8 caractères minimum)
              </span>
              <input
                name="password"
                type="password"
                required
                minLength={8}
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-sm text-foreground outline-none transition focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan/30"
              />
            </label>

            <div className="pt-3">
              <button
                type="submit"
                id="submit-register-btn"
                disabled={isSubmitting}
                className="w-full relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-start-gradient py-3.5 px-6 font-bold text-sm text-white shadow-lg shadow-accent-blue/25 transition-all duration-300 hover:scale-[1.01] hover:shadow-glow-cyan disabled:opacity-60 disabled:pointer-events-none"
              >
                {isSubmitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Création du compte &amp; Redirection...</span>
                  </>
                ) : isFree ? (
                  <>
                    <span>Créer mon compte gratuit STARS</span>
                    <span>→</span>
                  </>
                ) : hasTrial ? (
                  <>
                    <span>Démarrer mes {selectedPlan.trialDays} jours d&apos;essai &amp; Payer en ligne</span>
                    <span>→</span>
                  </>
                ) : (
                  <>
                    <span>Procéder au paiement en ligne sécurisé ({formatPriceCents(priceCents)})</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-center text-muted-foreground leading-relaxed pt-2">
              En créant votre compte, vous acceptez nos{' '}
              <Link href="/legal/conditions" className="text-accent-cyan hover:underline">Conditions Générales</Link> et notre{' '}
              <Link href="/legal/privacy" className="text-accent-cyan hover:underline">Politique de Confidentialité</Link>.
            </p>
          </form>
        </div>

        {/* Récapitulatif de commande & Garanties (5 colonnes) */}
        <div className="flex flex-col justify-between rounded-2xl border border-border/80 bg-surface/60 p-6 shadow-xl backdrop-blur-xl sm:p-8 lg:col-span-5">
          <div>
            <div className="flex items-center justify-between border-b border-border/70 pb-4">
              <h3 className="font-display text-base font-bold text-white">Récapitulatif de commande</h3>
              <span className="rounded-full bg-surface-raised px-2.5 py-1 text-[11px] font-semibold text-accent-cyan border border-border">
                {selectedPlan.name}
              </span>
            </div>

            <div className="mt-5 space-y-3.5 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Forfait sélectionné</span>
                <span className="font-semibold text-foreground">{selectedPlan.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Périodicité</span>
                <span className="font-semibold text-foreground">
                  {billingCycle === 'ANNUAL' ? 'Facturation annuelle' : 'Facturation mensuelle'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>STARS Credits (SIC) inclus</span>
                <span className="font-mono font-bold text-accent-cyan">
                  {selectedPlan.quotas.creditsPerMonth} SIC / mois
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Montant du forfait (HT)</span>
                <span className="font-bold text-foreground">{formatPriceCents(priceCents)}</span>
              </div>

              {hasTrial && (
                <div className="rounded-xl border border-success/30 bg-success/10 p-3 text-success">
                  <div className="flex items-center justify-between font-bold">
                    <span>Essai offert :</span>
                    <span>{selectedPlan.trialDays} jours gratuits</span>
                  </div>
                  <p className="mt-1 text-[11px] text-success/90">
                    Aucun montant prélevé aujourd&apos;hui. Vous pouvez annuler en 1 clic avant le terme de l&apos;essai.
                  </p>
                </div>
              )}

              <div className="border-t border-border/80 pt-3.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-bold text-white">Total dû aujourd&apos;hui</span>
                  <div className="text-right">
                    <span className="font-display text-2xl font-black text-white">
                      {hasTrial || isFree ? '0,00 €' : formatPriceCents(priceCents)}
                    </span>
                    <span className="block text-[10px] text-muted-foreground">HT</span>
                  </div>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">{VAT_NOTE}</p>
              </div>
            </div>
          </div>

          {/* Garanties et réassurance */}
          <div className="mt-8 border-t border-border/70 pt-5 space-y-2.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-2.5">
              <span className="text-base text-accent-cyan">🔒</span>
              <span>Paiement en ligne sécurisé via <strong>Stripe</strong> (Chiffrement SSL/TLS 256-bit)</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-base text-success">✓</span>
              <span>Sans engagement : résiliation ou changement de forfait en 1 clic</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="text-base text-accent-violet">🧾</span>
              <span>Facturation automatique avec TVA et reçus conformes entreprise</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lien vers la connexion */}
      <div className="mt-10 border-t border-border/60 pt-6 text-center text-xs text-muted-foreground">
        Vous possédez déjà un compte STARS ?{' '}
        <Link href="/login" className="font-semibold text-accent-cyan hover:underline">
          Connectez-vous à votre espace →
        </Link>
      </div>
    </div>
  );
}
