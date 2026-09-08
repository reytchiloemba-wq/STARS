import Link from 'next/link';
import { submitSalesLeadAction } from './actions';

const NETWORKS = ['LinkedIn', 'Instagram', 'Facebook', 'X'];

export default async function ContactSalesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { error, success } = await searchParams;

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-6 py-16">
      <Link href="/" className="bg-start-gradient bg-clip-text text-lg font-bold text-transparent">
        STARS
      </Link>
      <h1 className="mt-6 text-3xl font-bold tracking-tight">Parler à un expert STARS</h1>
      <p className="mt-2 text-muted-foreground">
        Une infrastructure d&apos;intelligence éditoriale conçue pour votre organisation. Décrivez votre besoin, un expert
        STARS vous recontacte pour qualifier votre projet Enterprise.
      </p>

      {success && (
        <p className="mt-6 rounded-lg border border-success/40 bg-success/10 px-4 py-3 text-sm text-success">
          Merci ! Votre demande a bien été enregistrée, un expert STARS vous recontactera prochainement.
        </p>
      )}
      {error && (
        <p className="mt-6 rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          Merci de vérifier les champs obligatoires.
        </p>
      )}

      <form action={submitSalesLeadAction} className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field name="company" label="Entreprise" required />
        <Field name="jobTitle" label="Fonction" required />
        <Field name="companySize" label="Effectif" />
        <Field name="country" label="Pays" />
        <Field name="email" label="E-mail professionnel" type="email" required />
        <Field name="seatsNeeded" label="Nombre d'utilisateurs" />
        <Field name="brandsNeeded" label="Nombre de marques" />
        <Field name="publicationVolume" label="Volume de publications prévu" />

        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm text-muted-foreground">Réseaux utilisés</label>
          <div className="flex flex-wrap gap-4">
            {NETWORKS.map((n) => (
              <label key={n} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="networks" value={n} /> {n}
              </label>
            ))}
          </div>
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm text-muted-foreground">Besoins de veille</label>
          <textarea name="monitoringNeeds" rows={2} className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm" />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm text-muted-foreground">Besoins de sécurité / conformité</label>
          <textarea name="securityNeeds" rows={2} className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm" />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm text-muted-foreground">Message</label>
          <textarea name="message" rows={3} className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm" />
        </div>

        <label className="flex items-start gap-2 text-sm text-muted-foreground sm:col-span-2">
          <input type="checkbox" name="consent" required className="mt-1" />
          J&apos;accepte d&apos;être contacté par l&apos;équipe STARS au sujet de ma demande.
        </label>

        <button
          type="submit"
          className="rounded-xl bg-start-gradient px-6 py-3 font-medium text-white sm:col-span-2"
        >
          Envoyer ma demande
        </button>
      </form>
    </main>
  );
}

function Field({ name, label, type = 'text', required }: { name: string; label: string; type?: string; required?: boolean }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-muted-foreground">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-foreground outline-none focus:border-accent-cyan"
      />
    </label>
  );
}
