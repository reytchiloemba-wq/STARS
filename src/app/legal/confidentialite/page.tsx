import LegalPage from '@/components/legal-page';

export default function ConfidentialitePage() {
  return (
    <LegalPage title="Politique de confidentialité">
      <h2>Données collectées</h2>
      <p>Compte, organisation, recherches et contenus créés dans le cadre de votre utilisation de STARS.</p>
      <h2>Isolation multi-tenant</h2>
      <p>
        Les données de votre organisation ne sont jamais accessibles à une autre organisation cliente. Cette isolation
        est vérifiée par des tests automatisés (voir la documentation technique du projet).
      </p>
      <h2>Utilisation par l&apos;IA</h2>
      <p>
        Vos données privées ne sont jamais utilisées pour entraîner un modèle mutualisé sans votre consentement
        explicite, documenté et révocable.
      </p>
      <h2>Vos droits</h2>
      <p>Accès, rectification, export et suppression de vos données, conformément au RGPD.</p>
    </LegalPage>
  );
}
