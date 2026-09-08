import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreditReason } from '@prisma/client';

interface FakeWallet {
  id: string;
  organizationId: string;
  balance: number;
}
interface FakeTransaction {
  id: string;
  organizationId: string;
  walletId: string;
  amount: number;
  reason: CreditReason;
  balanceAfter: number;
  createdAt: Date;
}

let wallets: FakeWallet[] = [];
let transactions: FakeTransaction[] = [];
let nextId = 1;

vi.mock('@/lib/db', () => ({
  db: {
    creditWallet: {
      findUnique: vi.fn(async ({ where }: { where: { organizationId: string } }) =>
        wallets.find((w) => w.organizationId === where.organizationId) ?? null,
      ),
      create: vi.fn(async ({ data }: { data: { organizationId: string; balance: number } }) => {
        const wallet: FakeWallet = { id: `wallet-${nextId++}`, organizationId: data.organizationId, balance: data.balance };
        wallets.push(wallet);
        return wallet;
      }),
      // Mirrors the production guard: only decrements if balance >= amount,
      // and reports how many rows matched — exactly like a real
      // `UPDATE ... WHERE id = ? AND balance >= ?` would via rowCount.
      updateMany: vi.fn(async ({ where, data }: { where: { id: string; balance: { gte: number } }; data: { balance: { decrement: number } } }) => {
        const wallet = wallets.find((w) => w.id === where.id);
        if (!wallet || wallet.balance < where.balance.gte) return { count: 0 };
        wallet.balance -= data.balance.decrement;
        return { count: 1 };
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: { balance: { increment: number } } }) => {
        const wallet = wallets.find((w) => w.id === where.id);
        if (!wallet) throw new Error('not found');
        wallet.balance += data.balance.increment;
        return wallet;
      }),
      findUniqueOrThrow: vi.fn(async ({ where }: { where: { id: string } }) => {
        const wallet = wallets.find((w) => w.id === where.id);
        if (!wallet) throw new Error('not found');
        return wallet;
      }),
    },
    creditTransaction: {
      create: vi.fn(async ({ data }: { data: Omit<FakeTransaction, 'id' | 'createdAt'> }) => {
        const tx: FakeTransaction = { id: `tx-${nextId++}`, createdAt: new Date(), ...data };
        transactions.push(tx);
        return tx;
      }),
      findMany: vi.fn(async ({ where }: { where: { organizationId: string } }) =>
        transactions.filter((t) => t.organizationId === where.organizationId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
      ),
    },
  },
}));

const { debitCredits, grantCredits, getBalance, InsufficientCreditsError } = await import(
  '@/server/services/credits.service'
);

function fakeCtx(organizationId: string) {
  return { userId: 'user-1', organization: { id: organizationId } } as never;
}

beforeEach(() => {
  wallets = [];
  transactions = [];
});

describe('credits.service — atomic wallet debit', () => {
  it('creates a zero-balance wallet on first access', async () => {
    expect(await getBalance('org-x')).toBe(0);
  });

  it('debits successfully when the balance covers the cost, and records a transaction', async () => {
    wallets.push({ id: 'w1', organizationId: 'org-a', balance: 10 });
    const balance = await debitCredits(fakeCtx('org-a'), 3, CreditReason.ANALYSIS_DEEP);
    expect(balance).toBe(7);
    expect(transactions).toHaveLength(1);
    expect(transactions[0]?.amount).toBe(-3);
    expect(transactions[0]?.balanceAfter).toBe(7);
  });

  it('rejects a debit that would drive the balance negative, and leaves the balance untouched', async () => {
    wallets.push({ id: 'w2', organizationId: 'org-b', balance: 2 });
    await expect(debitCredits(fakeCtx('org-b'), 6, CreditReason.ANALYSIS_STRATEGIC)).rejects.toThrow(InsufficientCreditsError);
    expect(wallets.find((w) => w.organizationId === 'org-b')?.balance).toBe(2);
    expect(transactions).toHaveLength(0);
  });

  it('reports the exact shortfall on the thrown error', async () => {
    wallets.push({ id: 'w3', organizationId: 'org-c', balance: 1 });
    try {
      await debitCredits(fakeCtx('org-c'), 6, CreditReason.ANALYSIS_STRATEGIC);
      throw new Error('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(InsufficientCreditsError);
      expect((err as InstanceType<typeof InsufficientCreditsError>).balance).toBe(1);
      expect((err as InstanceType<typeof InsufficientCreditsError>).required).toBe(6);
    }
  });

  it("a second debit fails once the guarded first debit has already spent the balance (guard's core race-safety property)", async () => {
    wallets.push({ id: 'w4', organizationId: 'org-d', balance: 5 });
    const ctx = fakeCtx('org-d');
    await expect(debitCredits(ctx, 3, CreditReason.ANALYSIS_DEEP)).resolves.toBe(2);
    await expect(debitCredits(ctx, 3, CreditReason.ANALYSIS_DEEP)).rejects.toThrow(InsufficientCreditsError);
    expect(wallets.find((w) => w.organizationId === 'org-d')?.balance).toBe(2);
  });

  it('never lets two tenants share or leak balance from one to the other', async () => {
    wallets.push({ id: 'w5', organizationId: 'org-e', balance: 10 });
    wallets.push({ id: 'w6', organizationId: 'org-f', balance: 1 });
    await debitCredits(fakeCtx('org-e'), 5, CreditReason.ANALYSIS_DEEP);
    expect(wallets.find((w) => w.organizationId === 'org-f')?.balance).toBe(1);
  });
});

describe('credits.service — grants', () => {
  it('increases the balance and records a positive transaction', async () => {
    wallets.push({ id: 'w7', organizationId: 'org-g', balance: 0 });
    const balance = await grantCredits('org-g', 50, CreditReason.MONTHLY_ALLOWANCE);
    expect(balance).toBe(50);
    expect(transactions[0]?.amount).toBe(50);
  });
});
