'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';

const schema = z.object({
  company: z.string().min(1),
  jobTitle: z.string().min(1),
  companySize: z.string().optional(),
  country: z.string().optional(),
  email: z.string().email(),
  seatsNeeded: z.string().optional(),
  brandsNeeded: z.string().optional(),
  monitoringNeeds: z.string().optional(),
  networks: z.array(z.string()).optional(),
  publicationVolume: z.string().optional(),
  securityNeeds: z.string().optional(),
  message: z.string().optional(),
  consent: z.literal('on'),
});

export async function submitSalesLeadAction(formData: FormData) {
  const parsed = schema.safeParse({
    company: formData.get('company'),
    jobTitle: formData.get('jobTitle'),
    companySize: formData.get('companySize') || undefined,
    country: formData.get('country') || undefined,
    email: formData.get('email'),
    seatsNeeded: formData.get('seatsNeeded') || undefined,
    brandsNeeded: formData.get('brandsNeeded') || undefined,
    monitoringNeeds: formData.get('monitoringNeeds') || undefined,
    networks: formData.getAll('networks'),
    publicationVolume: formData.get('publicationVolume') || undefined,
    securityNeeds: formData.get('securityNeeds') || undefined,
    message: formData.get('message') || undefined,
    consent: formData.get('consent'),
  });

  if (!parsed.success) {
    redirect('/contact-sales?error=invalid');
  }

  const { consent, ...data } = parsed.data;
  await db.salesLead.create({ data: { ...data, consent: consent === 'on' } });

  redirect('/contact-sales?success=1');
}
