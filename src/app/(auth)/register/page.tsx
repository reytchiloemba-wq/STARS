import type { Metadata } from 'next';
import RegisterClient from './register-client';
import type { PlanKey } from '@/config/pricing';

export const metadata: Metadata = {
  title: 'Inscription & Abonnement en ligne — STARS',
  description:
    'Créez votre organisation et activez votre abonnement STARS en ligne. Choisissez votre forfait Discovery, Creator, Professional ou Business.',
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{
    plan?: string;
    cycle?: string;
    name?: string;
    email?: string;
    organizationName?: string;
    error?: string;
    cancelled?: string;
  }>;
}) {
  const {
    plan,
    cycle,
    name,
    email,
    organizationName,
    error,
    cancelled,
  } = await searchParams;

  const validPlanKey: PlanKey | undefined =
    plan === 'discovery' || plan === 'creator' || plan === 'professional' || plan === 'business'
      ? (plan as PlanKey)
      : undefined;

  const validCycle = cycle === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY';

  return (
    <main className="min-h-screen bg-start-glow flex items-center justify-center">
      <RegisterClient
        initialPlan={validPlanKey}
        initialCycle={validCycle}
        initialName={name}
        initialEmail={email}
        initialOrg={organizationName}
        errorMessage={error}
        isCancelled={cancelled === '1'}
      />
    </main>
  );
}
