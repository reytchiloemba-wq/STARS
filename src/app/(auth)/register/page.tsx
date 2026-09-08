import { registerAction } from '../actions';

const ERROR_MESSAGES: Record<string, string> = {
  invalid: 'Champs invalides. Vérifiez votre saisie (mot de passe : 8 caractères minimum).',
  exists: 'Un compte existe déjà avec cet e-mail.',
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-start-glow px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-xl">
        <h1 className="bg-start-gradient bg-clip-text text-2xl font-bold text-transparent">STARS</h1>
        <p className="mt-1 text-sm text-muted-foreground">Créer votre organisation</p>

        {error && (
          <p className="mt-4 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            {ERROR_MESSAGES[error] ?? 'Une erreur est survenue.'}
          </p>
        )}

        <form action={registerAction} className="mt-6 space-y-4">
          <Field label="Votre nom" name="name" type="text" required />
          <Field label="Nom de l'organisation" name="organizationName" type="text" required />
          <Field label="E-mail professionnel" name="email" type="email" required />
          <Field label="Mot de passe" name="password" type="password" required minLength={8} />

          <button
            type="submit"
            className="w-full rounded-xl bg-start-gradient px-4 py-2.5 font-medium text-white transition hover:opacity-90"
          >
            Créer mon espace STARS
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Déjà un compte ? <a href="/login" className="text-accent-cyan hover:underline">Se connecter</a>
        </p>
      </div>
    </main>
  );
}

function Field(props: { label: string; name: string; type: string; required?: boolean; minLength?: number }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-muted-foreground">{props.label}</span>
      <input
        name={props.name}
        type={props.type}
        required={props.required}
        minLength={props.minLength}
        className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-foreground outline-none focus:border-accent-cyan"
      />
    </label>
  );
}
