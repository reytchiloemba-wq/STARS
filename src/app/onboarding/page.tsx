import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { createOrganizationForUser } from '@/server/services/organization.service';

async function createOrgAction(formData: FormData) {
  'use server';
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect('/login');

  const name = String(formData.get('organizationName') ?? '').trim();
  if (!name) return;

  const org = await createOrganizationForUser(userId!, name);
  redirect(`/w/${org.slug}/dashboard`);
}

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  return (
    <main className="flex min-h-screen items-center justify-center bg-start-glow px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-xl">
        <h1 className="text-xl font-semibold">Créez votre première organisation</h1>
        <form action={createOrgAction} className="mt-6 space-y-4">
          <input
            name="organizationName"
            required
            placeholder="Nom de l'organisation"
            className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2"
          />
          <button type="submit" className="w-full rounded-xl bg-start-gradient px-4 py-2.5 font-medium text-white">
            Continuer
          </button>
        </form>
      </div>
    </main>
  );
}
