'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { PLANS, PlanKey, getPlan, formatPriceCents } from '@/config/pricing';
import { createTenantByAdminAction } from '@/app/admin/actions';

interface CreatedTenantInfo {
  id: string;
  name: string;
  slug: string;
  status: string;
  ownerEmail: string;
  ownerName: string | null;
  ownerJobTitle?: string;
  ownerPhone?: string;
  planName: string;
  billingCycle: string;
  initialCredits: number;
  plainPassword?: string;
  registrationNumber?: string;
  country?: string;
  city?: string;
  industry?: string;
  website?: string;
  poNumber?: string;
  paymentMethod?: string;
}

const INDUSTRIES = [
  'Technologies & SaaS',
  'Luxe, Mode & Beauté',
  'Énergie, Climat & Industrie',
  'Banque, Finance & Assurance',
  'Santé, Pharma & Biotech',
  'Médias, Presse & Divertissement',
  'Conseil, Audit & Juridique',
  'Commerce, Retail & E-commerce',
  'Secteur Public & Organisations Internationales',
  'Autre',
];

const COUNTRIES = [
  'France',
  'Belgique',
  'Suisse',
  'Luxembourg',
  'Royaume-Uni',
  'Allemagne',
  'États-Unis',
  'Canada',
  'Émirats Arabes Unis',
  'Autre',
];

const PAYMENT_METHODS = [
  { id: 'WIRE_TRANSFER', label: 'Virement bancaire SEPA / Facture à 30 jours (Bon de commande)' },
  { id: 'SEPA_DEBIT', label: 'Prélèvement automatique SEPA interentreprises' },
  { id: 'CORPORATE_CARD', label: 'Carte bancaire d’entreprise (CB / Visa / Mastercard)' },
  { id: 'FRAMEWORK_AGREEMENT', label: 'Contrat Cadre Annuel Enterprise (Sur devis / Acompte)' },
];

function generateSecurePassword(): string {
  const charsUpper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const charsLower = 'abcdefghijkmnopqrstuvwxyz';
  const charsNum = '23456789';
  const charsSpecial = '!@#$%&*';

  let pass = '';
  pass += charsUpper[Math.floor(Math.random() * charsUpper.length)];
  pass += charsLower[Math.floor(Math.random() * charsLower.length)];
  pass += charsNum[Math.floor(Math.random() * charsNum.length)];
  pass += charsSpecial[Math.floor(Math.random() * charsSpecial.length)];

  const all = charsUpper + charsLower + charsNum + charsSpecial;
  for (let i = 0; i < 9; i++) {
    pass += all[Math.floor(Math.random() * all.length)];
  }

  return pass.split('').sort(() => 0.5 - Math.random()).join('');
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export function TenantRegistrationForm() {
  const [isPending, startTransition] = useTransition();

  // Organisation
  const [organizationName, setOrganizationName] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [country, setCountry] = useState('France');
  const [city, setCity] = useState('');
  const [industry, setIndustry] = useState('Technologies & SaaS');
  const [website, setWebsite] = useState('');

  // Responsable légal / C-Level
  const [ownerName, setOwnerName] = useState('');
  const [ownerJobTitle, setOwnerJobTitle] = useState('Directeur Général');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [password, setPassword] = useState(() => generateSecurePassword());
  const [showPassword, setShowPassword] = useState(true);

  // Forfait & Crédits
  const [selectedPlanKey, setSelectedPlanKey] = useState<PlanKey>('professional');
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'ANNUAL'>('ANNUAL');
  const selectedPlan = getPlan(selectedPlanKey);
  const [customCredits, setCustomCredits] = useState<number>(selectedPlan.quotas.creditsPerMonth || 200);

  // Modalités contractuelles
  const [paymentMethod, setPaymentMethod] = useState('WIRE_TRANSFER');
  const [poNumber, setPoNumber] = useState('');
  const [retentionPolicyDays, setRetentionPolicyDays] = useState(365);
  const [editorialCharter, setEditorialCharter] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  // Résultat & Feedback
  const [error, setError] = useState<string | null>(null);
  const [createdTenant, setCreatedTenant] = useState<CreatedTenantInfo | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Mise à jour automatique du slug si l'utilisateur ne l'a pas personnalisé
  function handleOrgNameChange(val: string) {
    setOrganizationName(val);
    if (!isSlugManuallyEdited) {
      setCustomSlug(slugify(val));
    }
  }

  // Changement de plan : synchroniser les crédits initiaux par défaut
  function handlePlanSelect(key: PlanKey) {
    setSelectedPlanKey(key);
    const plan = PLANS.find((p) => p.key === key);
    if (plan) {
      setCustomCredits(plan.quotas.creditsPerMonth > 0 ? plan.quotas.creditsPerMonth : 500);
    }
  }

  function handleGenerateNewPassword() {
    setPassword(generateSecurePassword());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.append('organizationName', organizationName);
    formData.append('customSlug', customSlug);
    formData.append('registrationNumber', registrationNumber);
    formData.append('vatNumber', vatNumber);
    formData.append('country', country);
    formData.append('city', city);
    formData.append('industry', industry);
    formData.append('website', website);

    formData.append('ownerName', ownerName);
    formData.append('ownerJobTitle', ownerJobTitle);
    formData.append('ownerEmail', ownerEmail);
    formData.append('ownerPhone', ownerPhone);
    formData.append('password', password);

    formData.append('planKey', selectedPlanKey);
    formData.append('billingCycle', billingCycle);
    formData.append('customCredits', String(customCredits));

    formData.append('paymentMethod', paymentMethod);
    formData.append('poNumber', poNumber);
    formData.append('retentionPolicyDays', String(retentionPolicyDays));
    formData.append('editorialCharter', editorialCharter);
    formData.append('internalNotes', internalNotes);

    startTransition(async () => {
      try {
        const res = await createTenantByAdminAction(formData);
        if (res.ok && res.tenant) {
          setCreatedTenant(res.tenant);
        } else {
          setError('Erreur inattendue lors de la création du tenant.');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors de la création du tenant');
      }
    });
  }

  function handleCopyCredentials() {
    if (!createdTenant) return;
    const text = `=====================================================
STARS — KIT D'ACCÈS EXÉCUTIF ORGANISATION B2B
=====================================================

Bienvenue sur la plateforme d'intelligence éditoriale STARS.
Votre organisation a été provisionnée avec succès par l'administration STARS.

ESPACE DE TRAVAIL & ORGANISATION :
- Organisation : ${createdTenant.name}
- Identifiant d'espace (Slug) : ${createdTenant.slug}
- URL de connexion directe : ${window.location.origin}/login
- Accès direct au Workspace : ${window.location.origin}/w/${createdTenant.slug}/dashboard

IDENTIFIANTS DE L'ADMINISTRATEUR PRINCIPAL :
- Responsable : ${createdTenant.ownerName || 'Direction Générale'} (${createdTenant.ownerJobTitle || 'Contact Clé'})
- E-mail de connexion : ${createdTenant.ownerEmail}
- Mot de passe temporaire : ${createdTenant.plainPassword}

SOUSCRIPTION & DOTATION CONTRACTUELLE :
- Forfait STARS : ${createdTenant.planName} (${createdTenant.billingCycle === 'ANNUAL' ? 'Facturation Annuelle' : 'Facturation Mensuelle'})
- Crédits d'Intelligence (SIC) alloués : ${createdTenant.initialCredits} SIC
- Mode de règlement : ${createdTenant.paymentMethod || 'Facturation B2B'}
${createdTenant.poNumber ? `- Bon de Commande (PO) : ${createdTenant.poNumber}` : ''}

PROCÉDURE DE PREMIÈRE CONNEXION :
1. Rendez-vous sur ${window.location.origin}/login
2. Saisissez votre adresse e-mail professionnelle (${createdTenant.ownerEmail})
3. Entrez votre mot de passe temporaire ci-dessus
4. Personnalisez votre mot de passe et invitez vos collaborateurs depuis les Paramètres.

Support & Accompagnement Dédié STARS : support@stars-ap.com
=====================================================`;

    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    });
  }

  function handleReset() {
    setCreatedTenant(null);
    setOrganizationName('');
    setCustomSlug('');
    setIsSlugManuallyEdited(false);
    setRegistrationNumber('');
    setVatNumber('');
    setCity('');
    setWebsite('');
    setOwnerName('');
    setOwnerEmail('');
    setOwnerPhone('');
    setPassword(generateSecurePassword());
    setPoNumber('');
    setEditorialCharter('');
    setInternalNotes('');
  }

  // Si le tenant vient d'être créé avec succès, on affiche la fiche récapitulative
  if (createdTenant) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-success/40 bg-gradient-to-br from-surface to-surface-raised p-8 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-success/20 text-success text-2xl font-bold shadow-inner">
                ✓
              </div>
              <div>
                <span className="rounded-full bg-success/15 px-3 py-1 text-[11px] font-bold text-success">
                  TENANT B2B ACTIVÉ
                </span>
                <h2 className="mt-1 text-2xl font-bold text-white">
                  {createdTenant.name}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Workspace configuré et prêt pour l&apos;onboarding du client.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleCopyCredentials}
                className="inline-flex items-center gap-2 rounded-xl bg-start-gradient px-5 py-2.5 text-xs font-bold text-white shadow-md hover:scale-[1.02] transition"
              >
                <span>{copySuccess ? '✓ Kit Copié dans le Presse-papier !' : '📋 Copier le Kit d’Accès Client'}</span>
              </button>
              <a
                href={`/w/${createdTenant.slug}/dashboard`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-accent-cyan/40 bg-accent-cyan/10 px-4 py-2.5 text-xs font-bold text-accent-cyan hover:bg-accent-cyan/20 transition"
              >
                <span>Ouvrir le Workspace ↗</span>
              </a>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Colonne 1 : Organisation */}
            <div className="rounded-2xl border border-border/60 bg-surface/80 p-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Organisation</h4>
              <div className="mt-4 space-y-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Raison Sociale : </span>
                  <strong className="text-white">{createdTenant.name}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Slug / Espace : </span>
                  <span className="font-mono text-accent-cyan">/w/{createdTenant.slug}</span>
                </div>
                {createdTenant.registrationNumber && (
                  <div>
                    <span className="text-muted-foreground">SIREN / SIRET : </span>
                    <span className="text-foreground">{createdTenant.registrationNumber}</span>
                  </div>
                )}
                {createdTenant.country && (
                  <div>
                    <span className="text-muted-foreground">Pays / Juridiction : </span>
                    <span className="text-foreground">{createdTenant.country}</span>
                  </div>
                )}
                {createdTenant.industry && (
                  <div>
                    <span className="text-muted-foreground">Secteur : </span>
                    <span className="text-foreground">{createdTenant.industry}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Colonne 2 : Accès Dirigeant */}
            <div className="rounded-2xl border border-border/60 bg-surface/80 p-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Responsable Légal</h4>
              <div className="mt-4 space-y-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Nom &amp; Titre : </span>
                  <strong className="text-white">{createdTenant.ownerName || 'Non renseigné'}</strong>
                  {createdTenant.ownerJobTitle && <span className="text-muted-foreground"> ({createdTenant.ownerJobTitle})</span>}
                </div>
                <div>
                  <span className="text-muted-foreground">E-mail de connexion : </span>
                  <strong className="text-accent-cyan">{createdTenant.ownerEmail}</strong>
                </div>
                {createdTenant.plainPassword && (
                  <div className="rounded-lg border border-accent-cyan/30 bg-accent-cyan/10 p-2 font-mono">
                    <span className="text-muted-foreground block text-[10px]">Mot de passe temporaire :</span>
                    <span className="text-white font-bold tracking-wide select-all">{createdTenant.plainPassword}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Colonne 3 : Forfait & Crédits */}
            <div className="rounded-2xl border border-border/60 bg-surface/80 p-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Offre &amp; Dotation</h4>
              <div className="mt-4 space-y-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Forfait souscrit : </span>
                  <span className="rounded bg-accent-blue/20 px-2 py-0.5 text-accent-blue font-bold">
                    {createdTenant.planName}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Facturation : </span>
                  <span className="text-foreground">
                    {createdTenant.billingCycle === 'ANNUAL' ? 'Annuelle' : 'Mensuelle'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Portefeuille SIC initial : </span>
                  <strong className="text-accent-cyan font-mono text-sm">{createdTenant.initialCredits} SIC</strong>
                </div>
                {createdTenant.paymentMethod && (
                  <div>
                    <span className="text-muted-foreground">Règlement : </span>
                    <span className="text-foreground">{createdTenant.paymentMethod}</span>
                  </div>
                )}
                {createdTenant.poNumber && (
                  <div>
                    <span className="text-muted-foreground">Bon de Commande : </span>
                    <span className="text-foreground font-mono">{createdTenant.poNumber}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-border/60 pt-6">
            <Link
              href="/admin"
              className="text-xs font-semibold text-muted-foreground hover:text-white transition"
            >
              ← Retour au Tableau de Bord SuperAdmin
            </Link>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-xl border border-border bg-surface px-5 py-2.5 text-xs font-bold text-foreground hover:border-accent-cyan transition"
            >
              + Inscrire un autre Tenant B2B
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="rounded-2xl border border-danger/40 bg-danger/10 p-4 text-xs text-danger shadow-md">
          <strong>Erreur : </strong> {error}
        </div>
      )}

      {/* SECTION 1 : Organisation & Conformité Légale */}
      <div className="rounded-3xl border border-border/80 bg-surface p-7 shadow-xl">
        <div className="flex items-center gap-3 border-b border-border/60 pb-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-cyan/15 text-accent-cyan text-sm font-bold">
            1
          </span>
          <div>
            <h2 className="text-base font-bold text-white">Identité de l&apos;Organisation &amp; Conformité B2B</h2>
            <p className="text-xs text-muted-foreground">Raison sociale, immatriculation légale et domiciliation.</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-foreground">
              Raison Sociale de l&apos;Entreprise <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="ex: Dassault Systèmes, L'Oréal Groupe, Acme Corp"
              value={organizationName}
              onChange={(e) => handleOrgNameChange(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-xs text-foreground outline-none focus:border-accent-cyan transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground">
              Identifiant d&apos;espace STARS (Slug URL) <span className="text-danger">*</span>
            </label>
            <div className="mt-1.5 flex items-center rounded-xl border border-border bg-surface-raised px-3 py-2 text-xs text-muted-foreground focus-within:border-accent-cyan">
              <span className="select-none font-mono text-[11px]">/w/</span>
              <input
                type="text"
                required
                value={customSlug}
                onChange={(e) => {
                  setCustomSlug(e.target.value);
                  setIsSlugManuallyEdited(true);
                }}
                className="w-full bg-transparent px-1 font-mono text-xs text-white outline-none"
                placeholder="nom-organisation"
              />
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Adresse d&apos;accès : <span className="font-mono text-accent-cyan">stars-ap.com/w/{customSlug || 'organisation'}/dashboard</span>
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground">
              N° SIREN / SIRET / Registre du Commerce
            </label>
            <input
              type="text"
              placeholder="ex: 552 032 534 00018"
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-xs text-foreground outline-none focus:border-accent-cyan transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground">
              N° de TVA Intracommunautaire
            </label>
            <input
              type="text"
              placeholder="ex: FR 32 552032534"
              value={vatNumber}
              onChange={(e) => setVatNumber(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-xs text-foreground outline-none focus:border-accent-cyan transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground">Pays de Domiciliation Légale</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-xs text-foreground outline-none focus:border-accent-cyan transition"
            >
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground">Ville du Siège Social</label>
            <input
              type="text"
              placeholder="ex: Paris, Genève, Bruxelles, New York"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-xs text-foreground outline-none focus:border-accent-cyan transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground">Secteur d&apos;Activité</label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-xs text-foreground outline-none focus:border-accent-cyan transition"
            >
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground">Site Web Officiel de l&apos;Entreprise</label>
            <input
              type="url"
              placeholder="https://www.entreprise.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-xs text-foreground outline-none focus:border-accent-cyan transition"
            />
          </div>
        </div>
      </div>

      {/* SECTION 2 : Responsable Légal & Contact Clé C-Level */}
      <div className="rounded-3xl border border-border/80 bg-surface p-7 shadow-xl">
        <div className="flex items-center gap-3 border-b border-border/60 pb-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-blue/15 text-accent-blue text-sm font-bold">
            2
          </span>
          <div>
            <h2 className="text-base font-bold text-white">Dirigeant &amp; Administrateur Principal (Owner)</h2>
            <p className="text-xs text-muted-foreground">Ce compte détiendra les droits de gouvernance suprêmes sur l&apos;espace tenant.</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-foreground">
              Nom &amp; Prénom du Dirigeant <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="ex: Alexandre de Mévius"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-xs text-foreground outline-none focus:border-accent-cyan transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground">
              Fonction / Titre Officiel
            </label>
            <input
              type="text"
              placeholder="ex: Directeur Général, Chief Communications Officer, VP Marketing"
              value={ownerJobTitle}
              onChange={(e) => setOwnerJobTitle(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-xs text-foreground outline-none focus:border-accent-cyan transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground">
              Adresse E-mail Professionnelle <span className="text-danger">*</span>
            </label>
            <input
              type="email"
              required
              placeholder="alexandre@entreprise.com"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-xs text-foreground outline-none focus:border-accent-cyan transition"
            />
            <p className="mt-1 text-[10px] text-muted-foreground">
              Identifiant officiel de connexion sur <span className="text-accent-cyan">/login</span>.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground">
              Téléphone Direct / Mobile Professionnel
            </label>
            <input
              type="tel"
              placeholder="+33 6 12 34 56 78"
              value={ownerPhone}
              onChange={(e) => setOwnerPhone(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-xs text-foreground outline-none focus:border-accent-cyan transition"
            />
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-foreground">
                Mot de Passe Initial Provisionné <span className="text-danger">*</span>
              </label>
              <button
                type="button"
                onClick={handleGenerateNewPassword}
                className="text-[11px] font-bold text-accent-cyan hover:underline"
              >
                ⚡ Régénérer un mot de passe fort
              </button>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 font-mono text-xs text-white outline-none focus:border-accent-cyan transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="rounded-xl border border-border bg-surface-raised px-3 py-2.5 text-xs text-muted-foreground hover:text-white"
              >
                {showPassword ? 'Masquer' : 'Afficher'}
              </button>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Ce mot de passe temporaire sera inclus dans la fiche d&apos;onboarding à transmettre au dirigeant.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 3 : Forfait Contractuel & Crédits SIC */}
      <div className="rounded-3xl border border-border/80 bg-surface p-7 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-violet/15 text-accent-violet text-sm font-bold">
              3
            </span>
            <div>
              <h2 className="text-base font-bold text-white">Forfait Souscrit &amp; Allocation de Crédits SIC</h2>
              <p className="text-xs text-muted-foreground">Sélectionnez le palier contractuel et ajustez les crédits mensuels.</p>
            </div>
          </div>

          {/* Toggle Cycle de facturation */}
          <div className="inline-flex rounded-xl border border-border bg-surface-raised p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setBillingCycle('MONTHLY')}
              className={`rounded-lg px-3 py-1.5 transition ${
                billingCycle === 'MONTHLY' ? 'bg-surface text-white shadow' : 'text-muted-foreground hover:text-white'
              }`}
            >
              Mensuel
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('ANNUAL')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition ${
                billingCycle === 'ANNUAL' ? 'bg-start-gradient text-white shadow' : 'text-muted-foreground hover:text-white'
              }`}
            >
              <span>Annuel</span>
              <span className="rounded bg-white/20 px-1 text-[9px] font-bold">2 mois offerts</span>
            </button>
          </div>
        </div>

        {/* Grille des Plans */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {PLANS.map((plan) => {
            const isSelected = selectedPlanKey === plan.key;
            const price = billingCycle === 'ANNUAL' ? plan.annualPriceCents : plan.monthlyPriceCents;
            return (
              <div
                key={plan.key}
                onClick={() => handlePlanSelect(plan.key)}
                className={`cursor-pointer rounded-2xl border p-4 transition-all duration-200 ${
                  isSelected
                    ? 'border-accent-cyan bg-accent-cyan/10 shadow-lg ring-1 ring-accent-cyan'
                    : 'border-border bg-surface-raised/40 hover:border-border/80 hover:bg-surface-raised'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{plan.name}</span>
                  {isSelected && <span className="text-accent-cyan text-xs font-bold">✓</span>}
                </div>
                <div className="mt-2 text-sm font-extrabold text-white">
                  {plan.isCustomPricing ? 'Sur Devis' : `${formatPriceCents(price)} HT`}
                  {!plan.isCustomPricing && (
                    <span className="text-[10px] font-normal text-muted-foreground">/{billingCycle === 'ANNUAL' ? 'an' : 'mois'}</span>
                  )}
                </div>
                <div className="mt-3 rounded-lg border border-border/60 bg-surface/60 p-2 text-[10px] text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>Crédits :</span>
                    <strong className="text-accent-cyan">{plan.quotas.creditsPerMonth} SIC</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Sièges :</span>
                    <span className="text-foreground">{plan.quotas.seatsIncluded}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Réseaux :</span>
                    <span className="text-foreground">{plan.quotas.socialAccountsIncluded}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Personnalisation des Crédits SIC */}
        <div className="mt-6 rounded-2xl border border-border/80 bg-surface-raised/60 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-white">Dotation Initiale de Crédits STARS Intelligence (SIC)</h4>
              <p className="text-[11px] text-muted-foreground">
                Valeur par défaut du forfait : {selectedPlan.quotas.creditsPerMonth} SIC. Vous pouvez l&apos;ajuster pour un bonus d&apos;onboarding.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                step="10"
                value={customCredits}
                onChange={(e) => setCustomCredits(Number(e.target.value))}
                className="w-28 rounded-xl border border-border bg-surface px-3 py-2 font-mono text-sm font-bold text-accent-cyan outline-none focus:border-accent-cyan text-right"
              />
              <span className="text-xs font-bold text-white">SIC</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4 : Modalités Contractuelles & Gouvernance B2B */}
      <div className="rounded-3xl border border-border/80 bg-surface p-7 shadow-xl">
        <div className="flex items-center gap-3 border-b border-border/60 pb-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-emerald/15 text-accent-emerald text-sm font-bold">
            4
          </span>
          <div>
            <h2 className="text-base font-bold text-white">Modalités Contractuelles, Facturation &amp; Gouvernance</h2>
            <p className="text-xs text-muted-foreground">Conditions de règlement B2B, rétention des données et notes d&apos;administration.</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-foreground">Mode de Règlement Contractuel</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-xs text-foreground outline-none focus:border-accent-cyan transition"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.id} value={m.label}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground">
              Numéro de Bon de Commande Interne (PO / Purchase Order)
            </label>
            <input
              type="text"
              placeholder="ex: PO-2026-STARS-089"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-xs text-foreground outline-none focus:border-accent-cyan transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground">
              Durée de Rétention des Données d&apos;Intelligence
            </label>
            <select
              value={retentionPolicyDays}
              onChange={(e) => setRetentionPolicyDays(Number(e.target.value))}
              className="mt-1.5 w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-xs text-foreground outline-none focus:border-accent-cyan transition"
            >
              <option value="90">90 jours (Standard trimestriel)</option>
              <option value="180">180 jours (Standard semestriel)</option>
              <option value="365">365 jours (Recommandé B2B - 1 an)</option>
              <option value="730">730 jours (Conformité ETI - 2 ans)</option>
              <option value="1825">1825 jours (Archivage Enterprise - 5 ans)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground">
              Notes Internes Confidentielles (Administration STARS)
            </label>
            <input
              type="text"
              placeholder="ex: Contact négocié par le directeur commercial, remise annuelle accordée."
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-xs text-foreground outline-none focus:border-accent-cyan transition"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-foreground">
              Charte Éditoriale ou Directives de Gouvernance Initiale
            </label>
            <textarea
              rows={3}
              placeholder="Directives d'identité de marque, ton éditorial, thématiques d'exclusion, règles de compliance spécifiques au client..."
              value={editorialCharter}
              onChange={(e) => setEditorialCharter(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-xs text-foreground outline-none focus:border-accent-cyan transition"
            />
          </div>
        </div>
      </div>

      {/* Bouton de Soumission */}
      <div className="flex items-center justify-between border-t border-border/80 pt-6">
        <Link
          href="/admin"
          className="text-xs font-semibold text-muted-foreground hover:text-white transition"
        >
          Annuler et retourner au Tableau de Bord
        </Link>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-start-gradient px-8 py-3 text-sm font-bold text-white shadow-lg shadow-accent-blue/20 hover:scale-[1.02] transition disabled:opacity-50"
        >
          {isPending ? (
            <>
              <span className="animate-spin text-sm">⏳</span>
              <span>Provisionnement du Tenant B2B en cours...</span>
            </>
          ) : (
            <>
              <span>Valider &amp; Inscrire le Tenant B2B →</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
