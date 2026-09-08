import LegalPage from '@/components/legal-page';
import { PLANS } from '@/config/pricing';

export default function ConditionsPage() {
  return (
    <LegalPage title="Conditions générales d'utilisation et de vente">
      <h2>Abonnement</h2>
      <p>
        L&apos;abonnement STARS appartient à l&apos;organisation (tenant), pas à un utilisateur isolé. Les forfaits actuels
        sont : {PLANS.map((p) => p.name).join(', ')}.
      </p>
      <h2>Essai gratuit</h2>
      <p>Les essais Professional et Business durent 14 jours et ne nécessitent pas de carte bancaire.</p>
      <h2>Résiliation</h2>
      <p>
        Résiliable à tout moment depuis le portail de facturation. L&apos;accès est conservé jusqu&apos;à la fin de la
        période déjà payée ; vos données restent accessibles en lecture pendant une période de grâce avant suppression.
      </p>
      <h2>Contenus générés</h2>
      <p>Vous restez propriétaire des contenus créés dans STARS et responsable de leur validation avant publication.</p>
    </LegalPage>
  );
}
