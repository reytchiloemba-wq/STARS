'use server';

import { redirect } from 'next/navigation';
import { signIn } from '@/lib/auth';
import { registerUserWithOrganizationAndPlan, type RegisterInput } from '@/server/services/registration.service';
import type { PlanKey } from '@/config/pricing';

export async function registerAction(formData: FormData): Promise<void> {
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const organizationName = String(formData.get('organizationName') ?? '').trim();
  const rawPlanKey = String(formData.get('planKey') ?? 'discovery');
  const validPlans = ['discovery', 'creator', 'professional', 'business'] as const;
  const planKey = (validPlans.includes(rawPlanKey as (typeof validPlans)[number]) ? rawPlanKey : 'discovery') as (typeof validPlans)[number];
  const billingCycle = (String(formData.get('billingCycle') ?? 'MONTHLY')) as 'MONTHLY' | 'ANNUAL';

  let redirectTarget: string;

  try {
    const result = await registerUserWithOrganizationAndPlan({
      name,
      email,
      password,
      organizationName,
      planKey,
      billingCycle,
    });

    // Authentifier immédiatement l'utilisateur dans sa session
    try {
      await signIn('credentials', { email, password, redirect: false });
    } catch {
      // Si la session ne peut pas s'initialiser automatiquement sur le serveur,
      // l'utilisateur pourra se connecter sur /login ou Stripe complètera le parcours.
    }

    redirectTarget = result.redirectUrl;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Une erreur est survenue lors de l'inscription.";
    const query = new URLSearchParams({
      error: message,
      name,
      email,
      organizationName,
      plan: planKey,
      cycle: billingCycle,
    });
    redirectTarget = `/register?${query.toString()}`;
  }

  redirect(redirectTarget);
}
