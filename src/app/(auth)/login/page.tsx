import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';
import { signIn } from '@/lib/auth';
import { listOrganizationsForUser } from '@/server/services/organization.service';
import { db } from '@/lib/db';

async function loginAction(formData: FormData) {
  'use server';
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  try {
    await signIn('credentials', { email, password, redirect: false });
  } catch (err) {
    if (err instanceof AuthError) {
      redirect('/login?error=invalid');
    }
    throw err;
  }

  const user = await db.user.findUnique({ where: { email } });
  const orgs = user ? await listOrganizationsForUser(user.id) : [];
  const target = orgs[0]?.organization.slug;
  redirect(target ? `/w/${target}/dashboard` : '/onboarding');
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; oauthError?: string; callbackUrl?: string }>;
}) {
  const { error, oauthError } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-start-glow px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-xl">
        <h1 className="bg-start-gradient bg-clip-text text-2xl font-bold text-transparent">STARS</h1>
        <p className="mt-1 text-sm text-muted-foreground">From the World to Your Voice.</p>

        {error && (
          <p className="mt-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            E-mail ou mot de passe incorrect.
          </p>
        )}

        {oauthError && (
          <p className="mt-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {oauthError}
          </p>
        )}

        <form action={loginAction} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm text-muted-foreground">E-mail</span>
            <input name="email" type="email" required className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 outline-none focus:border-accent-cyan" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-muted-foreground">Mot de passe</span>
            <input name="password" type="password" required className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 outline-none focus:border-accent-cyan" />
          </label>
          <button type="submit" className="w-full rounded-xl bg-start-gradient px-4 py-2.5 font-medium text-white transition hover:opacity-90">
            Se connecter
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Pas encore de compte ? <a href="/register" className="text-accent-cyan hover:underline">Créer une organisation</a>
        </p>
      </div>
    </main>
  );
}
