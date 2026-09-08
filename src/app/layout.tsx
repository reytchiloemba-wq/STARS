import type { Metadata, Viewport } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://stars-platform-orpin.vercel.app'),
  title: {
    default: 'STARS — Smart Topics. Brighter Ideas.',
    template: '%s | STARS',
  },
  description: 'Plateforme mondiale d’intelligence éditoriale, veille augmentée, analyse contradictoire et publication multiréseaux.',
  keywords: [
    'intelligence éditoriale',
    'veille stratégique',
    'analyse contradictoire',
    'fact-checking',
    'LinkedIn',
    'Instagram',
    'X',
    'Facebook',
    'SaaS média',
    'brand voice',
  ],
  authors: [{ name: 'STARS Technologies' }],
  creator: 'STARS',
  publisher: 'STARS',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://stars-platform-orpin.vercel.app',
    title: 'STARS — Smart Topics. Brighter Ideas.',
    description: 'De l’actualité mondiale à une prise de parole qui compte. Veille, analyse contradictoire et publication automatisée.',
    siteName: 'STARS Platform',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'STARS — Smart Topics. Brighter Ideas.',
    description: 'De l’actualité mondiale à une prise de parole qui compte.',
    creator: '@stars_platform',
  },
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
};

export const viewport: Viewport = {
  themeColor: '#0B0F19',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable} ${plusJakartaSans.variable}`}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased selection:bg-accent-cyan/20 selection:text-accent-cyan">
        {children}
      </body>
    </html>
  );
}
