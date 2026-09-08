import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
  const paths = ['/', '/login', '/register', '/contact-sales', '/status', '/legal/mentions-legales', '/legal/confidentialite', '/legal/cookies', '/legal/conditions'];
  return paths.map((path) => ({ url: `${base}${path}`, lastModified: new Date() }));
}
