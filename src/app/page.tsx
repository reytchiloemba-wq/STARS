import type { Metadata } from 'next';
import LandingNav from '@/components/landing/nav';
import LandingHero from '@/components/landing/hero';
import TrustAndProblem from '@/components/landing/trust-problem';
import DualPath from '@/components/landing/dual-path';
import HowItWorks from '@/components/landing/how-it-works';
import ContradictionShowcase from '@/components/landing/contradiction';
import EditorialStudioShowcase from '@/components/landing/studio';
import AudiencesAndDifferentiators from '@/components/landing/audiences';
import LandingPricing from '@/components/landing/pricing';
import Security from '@/components/landing/security';
import Faq from '@/components/landing/faq';
import FinalCta from '@/components/landing/final-cta';
import LandingFooter from '@/components/landing/footer';
import { PLANS } from '@/config/pricing';
import { FAQ_ITEMS } from '@/config/faq';

export const metadata: Metadata = {
  title: 'STARS — Veille, analyse contradictoire et publication multiréseaux',
  description:
    "STARS surveille l'actualité mondiale, confronte les sources et les experts, génère vos contenus et les publie sur LinkedIn, Instagram, Facebook et X.",
  openGraph: {
    title: 'STARS — Smart Topics. Brighter Ideas.',
    description: 'From the World to Your Voice.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'STARS — Smart Topics. Brighter Ideas.',
    description: 'From the World to Your Voice.',
  },
};

function jsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        name: 'STARS',
        slogan: 'Smart Topics. Brighter Ideas. From the World to Your Voice.',
      },
      {
        '@type': 'SoftwareApplication',
        name: 'STARS',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        offers: PLANS.filter((p) => !p.isCustomPricing && p.monthlyPriceCents !== null).map((p) => ({
          '@type': 'Offer',
          name: p.name,
          price: (p.monthlyPriceCents! / 100).toFixed(2),
          priceCurrency: 'EUR',
          description: p.tagline,
        })),
      },
      {
        '@type': 'FAQPage',
        mainEntity: FAQ_ITEMS.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer },
        })),
      },
    ],
  };
}

export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd()) }} />
      <LandingNav />
      <LandingHero />
      <TrustAndProblem />
      <DualPath />
      <HowItWorks />
      <ContradictionShowcase />
      <EditorialStudioShowcase />
      <AudiencesAndDifferentiators />
      <LandingPricing />
      <Security />
      <Faq />
      <FinalCta />
      <LandingFooter />
    </>
  );
}
