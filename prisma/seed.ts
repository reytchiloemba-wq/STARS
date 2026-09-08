import { PrismaClient, RoleName, CreditReason } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PLANS } from '../src/config/pricing';
import { PROVIDERS } from '../src/config/providers';

const db = new PrismaClient();

// Global taxonomy — administrable later without code changes (spec §5).
const CATEGORIES = [
  'general', 'politique', 'geopolitique', 'economie', 'finance', 'marches', 'entreprises',
  'entrepreneuriat', 'immobilier', 'construction', 'industrie', 'supply-chain', 'logistique',
  'achats', 'energie', 'environnement', 'climat', 'intelligence-artificielle', 'cybersecurite',
  'technologies', 'sciences', 'sante', 'droit', 'reglementation', 'ressources-humaines', 'emploi',
  'management', 'education', 'agriculture', 'mobilite', 'transports', 'defense', 'societe',
  'culture', 'medias', 'luxe', 'mode', 'sport', 'afrique', 'europe', 'ameriques', 'asie-pacifique',
  'moyen-orient',
] as const;

const LABELS: Record<string, string> = {
  general: 'Actualité générale', politique: 'Politique', geopolitique: 'Géopolitique', economie: 'Économie',
  finance: 'Finance', marches: 'Marchés', entreprises: 'Entreprises', entrepreneuriat: 'Entrepreneuriat',
  immobilier: 'Immobilier', construction: 'Construction', industrie: 'Industrie', 'supply-chain': 'Supply chain',
  logistique: 'Logistique', achats: 'Achats', energie: 'Énergie', environnement: 'Environnement', climat: 'Climat',
  'intelligence-artificielle': 'Intelligence artificielle', cybersecurite: 'Cybersécurité', technologies: 'Technologies',
  sciences: 'Sciences', sante: 'Santé', droit: 'Droit', reglementation: 'Réglementation',
  'ressources-humaines': 'Ressources humaines', emploi: 'Emploi', management: 'Management', education: 'Éducation',
  agriculture: 'Agriculture', mobilite: 'Mobilité', transports: 'Transports', defense: 'Défense', societe: 'Société',
  culture: 'Culture', medias: 'Médias', luxe: 'Luxe', mode: 'Mode', sport: 'Sport', afrique: 'Afrique',
  europe: 'Europe', ameriques: 'Amériques', 'asie-pacifique': 'Asie-Pacifique', 'moyen-orient': 'Moyen-Orient',
};

async function main() {
  // Plan rows are materialized FROM src/config/pricing.ts — that file is the
  // single source of truth. Re-run `npm run db:seed` after editing it.
  console.log('Seeding plans from src/config/pricing.ts…');
  for (const plan of PLANS) {
    const data = {
      name: plan.name,
      monthlyPriceCents: plan.monthlyPriceCents ?? 0,
      annualPriceCents: plan.annualPriceCents ?? 0,
      quotas: plan.quotas as object,
    };
    await db.plan.upsert({ where: { key: plan.key }, create: { key: plan.key, ...data }, update: data });
  }

  console.log('Seeding global taxonomy…');
  for (const key of CATEGORIES) {
    await db.category.upsert({
      where: { key },
      create: { key, label: LABELS[key] ?? key },
      update: { label: LABELS[key] ?? key },
    });
  }

  console.log('Seeding demo tenant…');
  const passwordHash = await bcrypt.hash('demo12345', 12);
  const demoUser = await db.user.upsert({
    where: { email: 'demo@stars.app' },
    create: { email: 'demo@stars.app', name: 'Démo STARS', passwordHash },
    update: {},
  });

  const demoOrg = await db.organization.upsert({
    where: { slug: 'demo' },
    create: {
      slug: 'demo',
      name: 'Organisation Démonstration',
      ownerId: demoUser.id,
      status: 'TRIAL',
      country: 'FR',
      language: 'fr',
    },
    update: {},
  });

  await db.membership.upsert({
    where: { organizationId_userId: { organizationId: demoOrg.id, userId: demoUser.id } },
    create: { organizationId: demoOrg.id, userId: demoUser.id, role: RoleName.OWNER },
    update: {},
  });

  const discoveryPlan = await db.plan.findUniqueOrThrow({ where: { key: 'discovery' } });
  await db.subscription.upsert({
    where: { organizationId: demoOrg.id },
    create: {
      organizationId: demoOrg.id,
      planId: discoveryPlan.id,
      status: 'TRIALING',
      billingCycle: 'MONTHLY',
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
    update: {},
  });

  console.log('Granting the demo tenant its Discovery monthly credit allowance…');
  const discoveryConfig = PLANS.find((p) => p.key === 'discovery')!;
  const wallet = await db.creditWallet.upsert({
    where: { organizationId: demoOrg.id },
    create: { organizationId: demoOrg.id, balance: discoveryConfig.quotas.creditsPerMonth },
    update: {},
  });
  const alreadyGranted = await db.creditTransaction.findFirst({
    where: { organizationId: demoOrg.id, reason: CreditReason.MONTHLY_ALLOWANCE },
  });
  if (!alreadyGranted) {
    await db.creditTransaction.create({
      data: {
        organizationId: demoOrg.id,
        walletId: wallet.id,
        amount: discoveryConfig.quotas.creditsPerMonth,
        reason: CreditReason.MONTHLY_ALLOWANCE,
        balanceAfter: wallet.balance,
      },
    });
  }

  // Super Admin — the ONLY sanctioned way to grant global /admin access in
  // this codebase is a direct database write (this seed step); there is no
  // self-service signup path to isSuperAdmin, by design (spec: no silent
  // privilege escalation). Dev-only fixed credentials, same pattern as the
  // demo tenant above — rotate/remove before any real deployment.
  console.log('Seeding infrastructure provider catalog from src/config/providers.ts…');
  for (const provider of PROVIDERS) {
    await db.integrationProvider.upsert({
      where: { key: provider.key },
      create: {
        key: provider.key,
        name: provider.name,
        category: provider.category,
        description: provider.description,
        docsUrl: provider.docsUrl || null,
        isOAuth: provider.isOAuth,
        isPrimaryCapable: provider.isPrimaryCapable,
      },
      update: {
        name: provider.name,
        category: provider.category,
        description: provider.description,
        docsUrl: provider.docsUrl || null,
        isOAuth: provider.isOAuth,
        isPrimaryCapable: provider.isPrimaryCapable,
      },
    });
  }

  console.log('Seeding Super Admin account…');
  const adminPasswordHash = await bcrypt.hash('admin12345', 12);
  await db.user.upsert({
    where: { email: 'admin@stars.app' },
    create: { email: 'admin@stars.app', name: 'Super Admin STARS', passwordHash: adminPasswordHash, isSuperAdmin: true },
    update: { isSuperAdmin: true },
  });

  console.log('\nDone.');
  console.log('Demo login:        demo@stars.app / demo12345 (organization slug: demo)');
  console.log('Super Admin login: admin@stars.app / admin12345 (/admin)');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
