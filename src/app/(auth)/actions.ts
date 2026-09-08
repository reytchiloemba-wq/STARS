'use server';

import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { signIn } from '@/lib/auth';
import { createOrganizationForUser } from '@/server/services/organization.service';

const registerSchema = z.object({
  name: z.string().min(1),
  organizationName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function registerAction(formData: FormData): Promise<void> {
  const parsed = registerSchema.safeParse({
    name: formData.get('name'),
    organizationName: formData.get('organizationName'),
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    redirect('/register?error=invalid');
  }

  const { name, organizationName, email, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    redirect('/register?error=exists');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await db.user.create({ data: { name, email, passwordHash } });
  const organization = await createOrganizationForUser(user.id, organizationName);

  await signIn('credentials', { email, password, redirect: false });
  redirect(`/w/${organization.slug}/dashboard`);
}
