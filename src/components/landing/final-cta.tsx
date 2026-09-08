export default function FinalCta() {
  return (
    <section className="bg-start-glow py-20">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
          Le monde produit l&apos;information. STARS vous aide à en faire une voix.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Découvrez les sujets qui comptent, confrontez les perspectives et publiez avec crédibilité.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <a href="/register" className="rounded-xl bg-start-gradient px-6 py-3 font-medium text-white">
            Commencer gratuitement
          </a>
          <a href="/contact-sales" className="rounded-xl border border-border px-6 py-3 font-medium hover:border-accent-cyan">
            Demander une démonstration
          </a>
        </div>
      </div>
    </section>
  );
}
