'use server';

import { redirect } from 'next/navigation';

export async function registerAction(_formData: FormData): Promise<void> {
  // L'inscription en libre-service est désactivée : les tenants sont créés par l'administrateur STARS.
  redirect('/contact-sales');
}

