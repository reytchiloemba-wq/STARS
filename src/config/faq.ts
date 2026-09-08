// Shared by the landing page FAQ accordion and its FAQPage JSON-LD — one
// list, so the visible copy and the structured data can never drift apart.
export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'STARS remplace-t-il un journaliste ?',
    answer:
      "Non. STARS organise les sources, distingue les faits des opinions et confronte les points de vue, mais la vérification finale et la décision éditoriale restent humaines — chaque publication passe par une validation avant diffusion.",
  },
  {
    question: 'Comment STARS sélectionne-t-il les sources ?',
    answer:
      "STARS s'appuie sur des flux et API légalement accessibles (sources officielles, médias partenaires, institutions, publications scientifiques) et classe chaque source par type et niveau de transparence. Aucune source n'est utilisée en violation de ses conditions d'accès.",
  },
  {
    question: 'STARS invente-t-il des citations ?',
    answer:
      "Non. Chaque citation d'expert renvoie à un article source réel avec son URL. Si les données disponibles sont insuffisantes pour une conclusion fiable, STARS l'indique explicitement plutôt que de combler les manques.",
  },
  {
    question: "Qu'est-ce qu'un STARS Credit ?",
    answer:
      "L'unité de consommation des opérations coûteuses en IA : analyse directe, actualisation d'un dossier, génération d'illustration, variantes supplémentaires, briefing automatisé. La publication ordinaire ne consomme pas de crédits.",
  },
  {
    question: 'Puis-je modifier le post généré ?',
    answer: 'Oui, entièrement. Chaque mot, chaque source affichée et chaque visuel restent modifiables avant publication.',
  },
  {
    question: 'Puis-je retirer les sources du post final ?',
    answer: "Oui, l'affichage des sources dans le post publié est une option que vous contrôlez au moment de la préparation.",
  },
  {
    question: 'Quels réseaux sont pris en charge ?',
    answer: 'LinkedIn, Instagram, Facebook et X, via leurs API officielles et un flux OAuth propre à votre organisation.',
  },
  {
    question: 'Puis-je annuler à tout moment ?',
    answer: "Oui, en autonomie depuis le portail de facturation. Vous conservez l'accès jusqu'à la fin de la période déjà payée.",
  },
  {
    question: 'Mes données sont-elles isolées des autres clients STARS ?',
    answer:
      "Oui. Chaque organisation cliente (tenant) a ses propres recherches, sources privées, brouillons, comptes sociaux et factures — vérifié par des tests d'isolation automatisés, pas seulement par un filtre d'affichage.",
  },
  {
    question: 'Puis-je gérer plusieurs marques ?',
    answer: "Oui, à partir de l'offre Professional : plusieurs marques avec leur propre Brand Voice, comptes sociaux et calendrier.",
  },
  {
    question: 'Que se passe-t-il si mes crédits sont épuisés ?',
    answer:
      "Les nouvelles analyses et générations sont mises en pause proprement — vos contenus déjà créés restent accessibles. Vous pouvez acheter un pack de crédits ou changer de forfait à tout moment.",
  },
  {
    question: "L'essai nécessite-t-il une carte bancaire ?",
    answer: "Non. Les essais Professional et Business de 14 jours démarrent sans carte bancaire.",
  },
  {
    question: 'Les prix incluent-ils la TVA ?',
    answer: "Les prix affichés sont hors taxes (HT). La TVA applicable est ajoutée au moment du paiement selon votre pays.",
  },
];
