# STARS — Smart Topics. Brighter Ideas. From the World to Your Voice.

A multi-tenant SaaS: architecture, database, authentication, RBAC, multi-tenant
isolation, design system, a working app shell (login → create organization →
STARS Direct search → STARS Explore → dossier view → team invites), a
STARS-Credits billing system wired to Stripe, and a full marketing landing
page with pricing.

## Stack

Next.js 16 (App Router) · TypeScript (strict) · Tailwind CSS · PostgreSQL ·
Prisma · NextAuth (Auth.js v5, credentials) · Stripe · Vitest.

External integrations that need a provider's own credentials (news ingestion,
AI/RAG, LinkedIn/Meta/X publishing) sit behind adapter interfaces in
`src/server/adapters/*` with mock implementations for now — see **What's real
vs. demo data** below. Billing is a real, working Stripe integration once a
key is supplied.

## Setup

```bash
cp .env.example .env        # fill in DATABASE_URL etc. (defaults match docker-compose.yml)
docker compose up -d        # starts Postgres + Redis
npm install
npm run db:push             # create the schema (use db:migrate once you want tracked migrations)
npm run db:seed             # loads plans (from src/config/pricing.ts), taxonomy, and a demo tenant
npm run dev
```

Demo login: `demo@stars.app` / `demo12345` (organization slug: `demo`).
Or register a new organization at `/register` — it lands on the Discovery
plan with its free monthly STARS Credits already granted.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint (flat config, `eslint-config-next`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test` | Vitest — isolation, RBAC, pricing config, and credit-wallet suites |
| `npm run db:push` / `db:migrate` | Sync/migrate the Prisma schema |
| `npm run db:seed` | Load plans (from pricing config), taxonomy, demo tenant |
| `npm run db:studio` | Prisma Studio |

## Pricing — one config, three consumers

`src/config/pricing.ts` is the **single source of truth** for every price and
quota. It feeds:

1. the public landing page pricing section (`src/components/landing/pricing.tsx`),
2. the in-app billing center plan cards (`src/components/billing-plans.tsx`),
3. `prisma/seed.ts`, which materializes it into `Plan` rows that the app's
   entitlement checks (and the Stripe webhook handler, which looks up a
   `Plan` by `key`) actually read.

**To change a price or quota**: edit `src/config/pricing.ts`, then run
`npm run db:seed` again (it's an upsert) to sync the `Plan` table. There is no
second place to update — the landing page and the app cannot drift apart.

`tests/pricing.test.ts` asserts the structural invariants (annual = 10×
monthly, exactly one "most-popular" plan, Enterprise has no fixed self-serve
price, Founders-promo plans actually exist, etc.).

### STARS Credits

AI-costed operations (analyses, illustrations, dossier refreshes, briefings)
spend **STARS Credits** from a per-organization wallet
(`src/server/services/credits.service.ts`). The debit is a single atomic
`UPDATE ... WHERE balance >= amount`
(`db.creditWallet.updateMany`) — see that file's comment for why this is
race-safe without needing a manual row lock, and `tests/credits.test.ts` for
the behavioral proof. Ordinary publishing/scheduling does **not** spend
credits (only generation does) — see `CREDIT_COSTS` in the pricing config.

## Billing — Stripe, ready for a real key

`src/server/adapters/billing/stripe.ts` implements real subscription checkout,
credit-pack checkout, the Stripe customer portal, and invoice listing —
**no pre-created Stripe Products/Prices are required**: amounts are sent
inline via `price_data`, straight from `src/config/pricing.ts`. Drop a test
key (`sk_test_...`) into `STRIPE_SECRET_KEY` and the full checkout flow works
immediately.

- `src/app/w/[org]/settings/billing/page.tsx` — the in-app billing center:
  current plan, seats, credit balance, credit-transaction history, invoices,
  plan upgrade/downgrade, credit-pack purchase, and a link into the Stripe
  customer portal.
- `src/app/api/webhooks/stripe/route.ts` — verifies the Stripe signature,
  deduplicates via `ProcessedWebhookEvent` (Stripe retries deliveries, so the
  same event id can arrive more than once — this table makes every handler
  idempotent), and handles `checkout.session.completed`,
  `customer.subscription.updated/deleted`, and `invoice.payment_failed`.
- Trials (`trial_period_days`, Professional/Business only) use
  `payment_method_collection: 'if_required'` so "14 days, no card" is actually
  true rather than aspirational copy.
- **Not implemented**: this webhook route has not been exercised against a
  live Stripe account in this sandbox (no network egress here) — test it with
  `stripe listen --forward-to localhost:3000/api/webhooks/stripe` and the
  Stripe CLI's trigger commands before relying on it in production. Coupons
  rely on Stripe's native promotion codes (`allow_promotion_codes: true`) —
  create the "STARS Founders" code directly in the Stripe Dashboard/API,
  there is no custom Coupon model to keep in sync.

## Infrastructure & Connexions — the Super Admin cockpit

`/admin/infrastructure` (Super Admin only, gated by `requireSuperAdmin()` in
`src/lib/super-admin.ts`) is where every third-party provider is configured
for the whole platform — tenants never see this page or its credentials
(spec §4-5). Two levels, strictly separated:

- **Level A — global infrastructure**: `src/config/providers.ts` is the
  catalog (Meta, LinkedIn, X, Brave/Tavily/GNews/NewsAPI/RSS, Firecrawl,
  Anthropic/OpenAI/Gemini, Unsplash/Pexels, Ayrshare, S3), seeded into
  `IntegrationProvider`. A Super Admin enters credentials per provider in the
  cockpit; they're encrypted with **real AES-256-GCM** (`src/lib/crypto.ts`,
  key from `TOKEN_ENCRYPTION_KEY`) into `GlobalIntegration.credentialsEnc` —
  the plaintext is never returned again, only a masked fingerprint
  (`••••••••A7F2`) and a rotation trail (`SecretVersion`). **"Tester" runs a
  real network call** where one is possible (Anthropic/OpenAI/Gemini list
  their models; Brave/Tavily/Unsplash/Firecrawl make a real minimal request;
  RSS fetches a real public feed) — a provider only ever shows
  **OPERATIONAL** after that call actually succeeds, never optimistically.
  Social (Meta/LinkedIn/X) is the one category that genuinely can't be
  server-tested without a user completing OAuth consent, so it honestly
  reports "format valid, awaiting a live connection" instead of faking a
  test result.
- **Level B — tenant authorizations**: `/w/[org]/settings/social` lets each
  tenant connect their *own* accounts through the app(s) the Super Admin
  configured. Real OAuth 2.0 Authorization Code + PKCE
  (`src/server/services/oauth.service.ts`,
  `src/app/api/oauth/[network]/{start,callback}/route.ts`): a `state` +
  PKCE verifier is minted and stored tenant-scoped (`OAuthState`, 10-minute
  TTL, single-use), the browser is redirected to the real provider
  authorize URL, and the callback validates `state` before exchanging the
  code for tokens — a forged/expired/replayed `state` is rejected
  (`tests/oauth.test.ts` proves all three), and the org id never appears in
  the redirect URI itself (it travels only inside the server-side `state`
  row), so it can't be tampered with client-side. Tokens land in the
  existing `SocialAccount` model, now genuinely encrypted (the previous
  "chiffrement symbolique" placeholder in `social.service.ts` is superseded
  by this flow for anything going through OAuth).
- **AI routing** (`src/server/services/ai-router.service.ts`): resolves a
  task (`CLASSIFICATION`, `THESIS_ANTITHESIS`, `STRATEGIC_ANALYSIS`, …) to a
  configured `GlobalIntegration` via `ProviderRoutingRule`, falling back from
  primary → fallback → "nothing configured, use the demo adapter" — it never
  fabricates a routing result.
- **FinOps**: `CostRecord` accrues per integration (and optionally per
  tenant); the cockpit's overview tab sums it live. `IntegrationIncident`
  logs every failed test.
- **Not implemented**: budget thresholds/auto-cutoffs (§19), the webhook
  receiver console (§21 — only the Stripe webhook exists today), and MFA on
  sensitive cockpit operations (§5) — the guard is real (`requireSuperAdmin`)
  but single-factor, matching the rest of this codebase's auth. None of this
  has been exercised against real provider credentials in this sandbox (no
  API keys were available) — `tests/crypto.test.ts`,
  `tests/super-admin.test.ts`, and `tests/oauth.test.ts` verify the security
  properties (encryption round-trip/tamper detection, access control,
  CSRF/replay/expiry) independently of any live provider.

## Audit findings and fixes (2026-09-08)

A full audit focused on the publication pipeline found and fixed a critical
bug, plus several smaller honesty/UI issues:

- **CRITICAL — fabricated publish success.** `EditorialService.publishOrSchedule`
  (added after the Phase-1 foundation, outside this session) marked every
  `Publication`/`PublicationTarget` as `PUBLISHED` with a fake
  `externalPostId` (`post-${Date.now()}-...`) **without ever calling a social
  network API** — it didn't even import the connector layer. A real customer
  would have believed their content reached LinkedIn/X/Meta when nothing was
  ever sent. Fixed: it now calls a real per-network connector
  (`src/server/adapters/social/real.ts` — genuine `fetch` calls to LinkedIn's
  UGC Post API, Meta's Graph API feed/media endpoints, and X's v2 tweets
  endpoint) and only marks `PUBLISHED` after that call actually succeeds;
  a real failure is recorded as `FAILED` with the provider's own error
  message. Verified live against the real Supabase DB and the real X API: a
  publish attempt with a deliberately fake token was correctly rejected by
  `api.x.com` and recorded as `FAILED` with X's real error text — see
  `tests/publication.test.ts` for the pinned regression coverage (6 tests,
  including that a tenant cannot target another tenant's social account).
  The old `MockSocialConnector` (which always returned `success: false`,
  correctly, but was simply never called) was removed as superseded.
- **Fabricated analytics presented as real.** `/w/[org]/analytics` computed
  "impressions"/"engagement" from a formula that scaled with the tenant's
  real publish count (`48200 + publishedCount * 1250`) — making invented
  numbers *look* derived from real activity — with no real analytics
  ingestion behind them (`AnalyticsSnapshot` exists in the schema but nothing
  writes to it) and no "Démonstration" label, plus invented
  hyper-specific "recommendations" ("your Tuesday LinkedIn posts get 35% more
  engagement") presented as personalized insight. Fixed: the page now shows
  only genuinely DB-backed counts (published/scheduled/failed/connected
  accounts) as real numbers, with the illustrative platform-performance table
  clearly marked `Démonstration` and no longer tied to real activity by a
  formula.
- **Fabricated source citations.** `RadarService.generateBriefing` (spends 2
  real STARS Credits per generation) attributed invented facts to real-sounding
  institutions — "Journal Officiel de l'Union Européenne", "Observatoire
  International des Infrastructures Cloud" — while its UI claimed to
  "synthétise les sources vérifiées." This is exactly the kind of citation
  fabrication the rest of the app is built to prevent. Fixed: sources are now
  honestly labeled "Démonstration — aucune source réelle," the briefing title
  and executive summary say so explicitly, and both `/w/[org]/radar` and
  `/w/[org]/briefings` show a `Démonstration` badge.
- **Two undefined Tailwind classes.** `accent-purple` (used for "scheduled"
  badges in the publications and drafts lists) was never defined in
  `tailwind.config.ts` (only cyan/blue/violet/magenta/orange exist) — the
  badges silently rendered with no color at all. Fixed to `accent-violet`.
- **Broken hover-glow shadows.** `shadow-glow-{cyan,violet,magenta}/NN`
  (an opacity modifier on a custom named `boxShadow` token) isn't valid
  Tailwind — the opacity-modifier syntax only works on color-palette-based
  utilities, not raw box-shadow strings, so the modifier silently dropped the
  whole utility across the dashboard, sidebar, and landing page. Fixed by
  removing the invalid `/NN` suffix (the token already bakes in its own alpha).

## Landing page

`src/app/page.tsx` assembles the sections in `src/components/landing/*`:
hero (with a lightweight, `prefers-reduced-motion`-aware animated preview),
trust bar, problem statement, the STARS Direct/Explore dual entry point,
"how it works," a thesis/antithesis showcase, the editorial studio pitch,
audience segments, a differentiators table, the pricing section (monthly/
annual toggle, per-seat estimate, Founders-promo badge), a security summary,
an FAQ accordion, a final CTA, and a footer. SEO: per-page metadata, Open
Graph/Twitter cards, `Organization`/`SoftwareApplication`/`FAQPage` JSON-LD in
`src/app/page.tsx`, plus `src/app/robots.ts` and `src/app/sitemap.ts`.

No fabricated testimonials or client logos are included, per the product
brief — that section is simply omitted until real ones exist.

## What's real vs. demo data

- **Real**: user auth, organization creation, membership/RBAC, workspace
  routing (`/w/<org-slug>/...`), the Prisma schema and its tenant isolation
  guarantees, the invite flow (invitation rows — no email is actually sent
  yet), the full pricing/credits/Stripe billing system described above, the
  Enterprise contact form (`src/app/contact-sales`, saves a `SalesLead` row).
- **Demo data, clearly labeled in the UI** (`isDemoData` flag / "Démonstration"
  badge): everything returned by STARS Direct and STARS Explore — dossier
  content, sources, claims, thesis/antithesis, expert quotes, AI post
  variants. These come from `src/server/adapters/news/mock.ts` and
  `src/server/adapters/ai/mock.ts`.
- **Real network calls, will fail honestly without real OAuth credentials**:
  social publishing (`src/server/adapters/social/real.ts`) genuinely calls
  LinkedIn/Meta/X's APIs — see **Audit findings** above. It will report a
  real failure (wrong/missing token, unconfigured app) rather than a
  fabricated success; it cannot succeed until a tenant completes real OAuth
  via `/w/[org]/settings/social`, which itself needs the Super Admin to
  configure a real app in `/admin/infrastructure` first.
- **Demo, now honestly labeled**: `/w/[org]/radar` and `/w/[org]/briefings`
  (`RadarService`) — fixed illustrative content, no real signal-detection or
  briefing pipeline exists. `/w/[org]/analytics` shows real counts plus a
  clearly separate `Démonstration`-labeled illustrative table.
- **Templates pending real content**: the four legal pages under
  `src/app/legal/*` and `src/app/status` are explicitly marked as drafts
  needing legal/ops review — not fabricated legal text presented as final.

## Multi-tenant isolation — how it's enforced

- Every tenant-owned Prisma model carries a mandatory `organizationId`,
  including the new `CreditWallet`/`CreditTransaction` tables.
- `src/lib/tenant.ts` — `resolveTenant(orgSlug)` is the **only** sanctioned way
  to determine "which tenant is this request for". It re-derives the
  authenticated user from the session, looks up the organization by slug, and
  requires a `Membership` row proving that exact user belongs to that exact
  organization — it never trusts a client-supplied `organizationId` directly.
  `requireTenantPermission()` layers an RBAC check on top (billing actions
  require the `billing.manage` permission); `assertJobTenant()` is the
  equivalent guard for background jobs/webhooks.
- `tests/isolation.test.ts` proves this with two fixture tenants; `tests/credits.test.ts`
  additionally proves one tenant's wallet balance can never be read or spent
  by another. `npm run test` runs both — CI should block merges on failure.
- Once a live Postgres is used in earnest, add Row-Level Security policies
  keyed on `organizationId` as a second, DB-level enforcement layer (the
  Prisma-level guard above is required regardless; RLS is defense in depth).

## Architecture Complète des Modules STARS

### 1. Studio Éditorial & Diffusion (`/w/[org]/studio`)
- Génération des 5 variantes éditoriales par réseau (Concise, Experte, Dirigeant, Pédagogique, Forte en engagement).
- Outils de retouche rapide : régénération de l'accroche, raccourcissement, masquage des sources, modification directe mot à mot.
- Studio d'illustration multi-formats : génération IA (ratios 1:1, 4:5, 16:9, prompts, alt-text, badge obligatoire « Généré par IA »), banques d'images autorisées et import utilisateur.
- Aperçus fidèles en miroir temps réel pour LinkedIn, Instagram, X (avec fil/thread et compteur de caractères) et Facebook.
- Validation explicite humaine et modal de diffusion/programmation avec gestion des fuseaux horaires.

### 2. Brouillons & Circuit de Validation (`/w/[org]/drafts`)
- Gestion des statuts éditoriaux : `IDEA`, `DRAFT`, `READY_FOR_REVIEW`, `CHANGES_REQUESTED`, `APPROVED`, `SCHEDULED`, `PUBLISHED`.
- Historique exhaustif des versions et horodatage.
- Fil de discussion et commentaires internes par brouillon.
- Circuit d'approbation d'équipe (`APPROVED`, `CHANGES_REQUESTED`, `REJECTED`).

### 3. Calendrier Éditorial & Publications (`/w/[org]/calendar` & `/w/[org]/publications`)
- Calendrier interactif des publications passées et programmées, avec filtres par réseau social.
- Journal des diffusions horodaté, clés d'idempotence, identifiants externes et statuts par réseau.

### 4. Brand Voice Studio (`/w/[org]/brand-voice`)
- Mémoire éditoriale de marque par tenant : valeurs, ton, vocabulaire de prédilection, termes proscrits, curseur d'audace (1 à 5), signatures et hashtags prédéfinis.
- Prise en charge multimarque avec isolation stricte.

### 5. Radar Mondial, Signaux Faibles & Briefings (`/w/[org]/radar` & `/w/[org]/briefings`)
- Détection des signaux faibles, ruptures et vélocité des tendances.
- Carte des narratifs régionaux comparant le traitement en Europe, Amérique du Nord, Asie-Pacifique et Afrique.
- Content Gap (questions stratégiques sous-traitées) et détecteur d'angles saturés.
- Générateur de briefings exécutifs (quotidien, hebdomadaire, mensuel) avec consommation de crédits et recommandations d'action.

### 6. Alertes & Watchlists (`/w/[org]/alerts`)
- Surveillance continue d'entreprises cibles, de personnalités clés, de mots-clés et de territoires.
- Activation et désactivation instantanée des déclencheurs.

### 7. Gouvernance des Sources & Fiches Experts (`/w/[org]/sources` & `/w/[org]/experts`)
- Annuaire des experts identifiés (chercheurs, analystes, dirigeants) avec déclarations d'intérêts et citations associées.
- Gouvernance des médias avec indices de transparence (0 à 100), politiques de correction et statuts de vérification.

### 8. Taxonomie des 40+ Domaines (`/w/[org]/domains`)
- Personnalisation par organisation des domaines suivis, filtres avancés, mots-clés, exclusions et territoires cibles.

### 9. Analytics & Dashboard Exécutif (`/w/[org]/analytics` & `/w/[org]/dashboard`)
- Tableaux de bord de performance : impressions, portée, interactions, taux d'engagement moyen, temps économisé et recommandations explicables.
- Dashboard exécutif combinant barre de recherche STARS Direct rapide, KPIs prioritaires, signaux du radar, alertes actives et solde de crédits STARS.

### 10. Super Administration Globale STARS (`/admin`)
- Espace réservé aux Super Admins (`isSuperAdmin`) avec vue consolidée des tenants, statut d'activité, attribution manuelle de crédits et audit logs système.
- `/admin/infrastructure` — cockpit « Infrastructure & Connexions » : catalogue de fournisseurs (réseaux sociaux, actualités/recherche, extraction Web, IA, illustrations, publication, stockage), coffre de secrets chiffré (AES-256-GCM), test de connectivité réel par fournisseur, connecteur principal/secours, coûts cumulés, incidents et audit — voir section dédiée ci-dessus.

### 11. Connexions sociales des tenants (`/w/[org]/settings/social`)
- OAuth 2.0 + PKCE réel vers l'application globale configurée par le Super Admin — le tenant ne voit ni ne saisit jamais de secret d'application.

## Tests & Isolation Multi-Tenant
- `tests/isolation.test.ts` : Vérification des barrières d'accès tenant et de la résolution de session.
- `tests/editorial-isolation.test.ts` : Preuve de l'étanchéité stricte des brouillons, brand voices, alertes et publications entre organisations.
- `tests/credits.test.ts` : Débits atomiques et protection contre les soldes négatifs.
- `tests/pricing.test.ts` : Invariants tarifaires et cohérence landing page / app / Stripe.
- `tests/rbac.test.ts` : Matrice granulaire des permissions selon les 11 rôles STARS.
- `tests/crypto.test.ts` : Chiffrement/déchiffrement AES-256-GCM du coffre de secrets, détection d'altération, rejet sans clé.
- `tests/super-admin.test.ts` : Un tenant authentifié ne peut jamais accéder au cockpit d'infrastructure globale.
- `tests/oauth.test.ts` : Un `state` OAuth falsifié, rejoué ou expiré est rejeté ; le flux ne réussit qu'après un échange de jeton réel confirmé par le fournisseur.
- `tests/publication.test.ts` : Une publication n'est marquée `PUBLISHED` qu'après succès réel du connecteur réseau — jamais de statut ou d'identifiant de post fabriqué, y compris en cas d'échec de déchiffrement du jeton ou de compte social d'un autre tenant.
