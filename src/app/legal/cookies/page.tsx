import LegalPage from '@/components/legal-page';

export default function CookiesPage() {
  return (
    <LegalPage title="Gestion des cookies">
      <h2>Cookies essentiels</h2>
      <p>Utilisés pour l&apos;authentification et le maintien de votre session — nécessaires au fonctionnement de STARS.</p>
      <h2>Mesure d&apos;audience</h2>
      <p>
        Activée uniquement avec votre consentement. Aucun contenu privé ou recherche confidentielle n&apos;est transmis à
        un outil tiers.
      </p>
      <h2>Gérer votre consentement</h2>
      <p>[Bandeau de consentement à intégrer avant mise en production.]</p>
    </LegalPage>
  );
}
