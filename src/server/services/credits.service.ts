import { db } from '@/lib/db';
import { CreditReason } from '@prisma/client';
import type { TenantContext } from '@/lib/tenant';

export class InsufficientCreditsError extends Error {
  constructor(
    public readonly balance: number,
    public readonly required: number,
  ) {
    super(`Insufficient STARS Credits: balance ${balance}, required ${required}`);
    this.name = 'InsufficientCreditsError';
  }
}

async function getOrCreateWallet(organizationId: string) {
  const existing = await db.creditWallet.findUnique({ where: { organizationId } });
  if (existing) return existing;
  return db.creditWallet.create({ data: { organizationId, balance: 0 } });
}

export async function getBalance(organizationId: string): Promise<number> {
  const wallet = await getOrCreateWallet(organizationId);
  return wallet.balance;
}

/**
 * Atomically debit `amount` credits from the tenant's wallet.
 *
 * The `updateMany` guard (`balance: { gte: amount }`) is what makes this
 * race-safe: two concurrent debits can never both succeed and drive the
 * balance negative, because only one `UPDATE ... WHERE balance >= amount`
 * can match a given row before the other sees the decremented value.
 */
export async function debitCredits(
  ctx: TenantContext,
  amount: number,
  reason: CreditReason,
  metadata?: Record<string, unknown>,
): Promise<number> {
  const wallet = await getOrCreateWallet(ctx.organization.id);

  const result = await db.creditWallet.updateMany({
    where: { id: wallet.id, balance: { gte: amount } },
    data: { balance: { decrement: amount } },
  });

  if (result.count === 0) {
    const fresh = await db.creditWallet.findUniqueOrThrow({ where: { id: wallet.id } });
    throw new InsufficientCreditsError(fresh.balance, amount);
  }

  const fresh = await db.creditWallet.findUniqueOrThrow({ where: { id: wallet.id } });

  await db.creditTransaction.create({
    data: {
      organizationId: ctx.organization.id,
      walletId: wallet.id,
      amount: -amount,
      reason,
      balanceAfter: fresh.balance,
      metadata: metadata as object | undefined,
    },
  });

  return fresh.balance;
}

export async function debitCreditsForOrg(
  organizationId: string,
  amount: number,
  reason: CreditReason,
  metadata?: Record<string, unknown>,
): Promise<number> {
  const wallet = await getOrCreateWallet(organizationId);

  const result = await db.creditWallet.updateMany({
    where: { id: wallet.id, balance: { gte: amount } },
    data: { balance: { decrement: amount } },
  });

  if (result.count === 0) {
    const fresh = await db.creditWallet.findUniqueOrThrow({ where: { id: wallet.id } });
    throw new InsufficientCreditsError(fresh.balance, amount);
  }

  const fresh = await db.creditWallet.findUniqueOrThrow({ where: { id: wallet.id } });

  await db.creditTransaction.create({
    data: {
      organizationId,
      walletId: wallet.id,
      amount: -amount,
      reason,
      balanceAfter: fresh.balance,
      metadata: metadata as object | undefined,
    },
  });

  return fresh.balance;
}

export const deductCredits = debitCreditsForOrg;

/** Grant credits (monthly allowance renewal, purchased pack, manual adjustment). */
export async function grantCredits(
  organizationId: string,
  amount: number,
  reason: CreditReason,
  metadata?: Record<string, unknown>,
) {
  const wallet = await getOrCreateWallet(organizationId);

  const updated = await db.creditWallet.update({
    where: { id: wallet.id },
    data: { balance: { increment: amount } },
  });

  await db.creditTransaction.create({
    data: {
      organizationId,
      walletId: wallet.id,
      amount,
      reason,
      balanceAfter: updated.balance,
      metadata: metadata as object | undefined,
    },
  });

  return updated.balance;
}

export async function listRecentTransactions(organizationId: string, take = 20) {
  return db.creditTransaction.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    take,
  });
}
