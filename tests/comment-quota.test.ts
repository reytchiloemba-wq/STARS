import { describe, it, expect, vi, beforeEach } from 'vitest';

// Regression coverage for the quota-enforcement gap found during audit: the
// Comment Intelligence Hub's `commentsPerMonth` / `commentAiSuggestionsPerMonth`
// plan quotas were defined in config/pricing.ts and shown on the landing
// page, but nothing server-side ever checked them — a tenant could ingest or
// request AI suggestions without limit regardless of plan. These tests pin
// the fix in usage.service.ts + comment.service.ts: real webhook data is
// never dropped over quota, but AI enrichment is gated, and a paid comment
// pack (extraCommentsBalance) transparently covers the overage first.

interface FakeUsage {
  organizationId: string;
  periodStart: Date;
  periodEnd: Date;
  commentsIngested: number;
  aiSuggestionsGenerated: number;
  extraCommentsBalance: number;
}

let subscriptionPlanKey: string | null = 'discovery';
let usage: FakeUsage | null = null;
let comments: Array<Record<string, unknown>> = [];
let audits: Array<Record<string, unknown>> = [];
let suggestions: Array<Record<string, unknown>> = [];
let nextId = 1;

function samePeriod(a: Date, b: Date) {
  return a.getTime() === b.getTime();
}

vi.mock('@/lib/db', () => ({
  db: {
    subscription: {
      findUnique: vi.fn(async () => (subscriptionPlanKey ? { plan: { key: subscriptionPlanKey } } : null)),
    },
    usage: {
      findUnique: vi.fn(async () => usage),
      upsert: vi.fn(async ({ create, update }: { create: { organizationId: string; periodStart: Date; periodEnd: Date }; update: Partial<FakeUsage>; where: { organizationId: string } }) => {
        if (!usage) {
          usage = { commentsIngested: 0, aiSuggestionsGenerated: 0, extraCommentsBalance: 0, ...create };
        } else if (!samePeriod(usage.periodStart, create.periodStart)) {
          usage = { ...usage, ...update };
        }
        return usage;
      }),
      update: vi.fn(async ({ data }: { where: { organizationId: string }; data: Record<string, { increment?: number; decrement?: number } | number> }) => {
        if (!usage) throw new Error('no usage row');
        for (const [key, value] of Object.entries(data)) {
          const current = (usage as unknown as Record<string, number>)[key] ?? 0;
          if (typeof value === 'object' && value !== null) {
            if ('increment' in value && value.increment !== undefined) (usage as unknown as Record<string, number>)[key] = current + value.increment;
            if ('decrement' in value && value.decrement !== undefined) (usage as unknown as Record<string, number>)[key] = current - value.decrement;
          } else {
            (usage as unknown as Record<string, number>)[key] = value as number;
          }
        }
        return usage;
      }),
    },
    socialComment: {
      findUnique: vi.fn(async () => null), // no duplicate for these tests
      findFirst: vi.fn(async ({ where }: { where: { id: string; organizationId: string } }) =>
        comments.find((c) => c.id === where.id && c.organizationId === where.organizationId) ?? null,
      ),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const c = { id: `comment-${nextId++}`, isSensitive: false, ...data };
        comments.push(c);
        return c;
      }),
    },
    socialCommentAudit: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        audits.push(data);
        return data;
      }),
    },
    sLAProfile: {
      findUnique: vi.fn(async () => null), // use plan defaults
    },
    brandVoice: {
      findFirst: vi.fn(async () => null),
    },
    socialCommentSuggestion: {
      deleteMany: vi.fn(async () => ({ count: 0 })),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const s = { id: `sugg-${nextId++}`, ...data };
        suggestions.push(s);
        return s;
      }),
    },
  },
}));

const { CommentIntelligenceService } = await import('@/server/services/comments/comment.service');
const { getPlan } = await import('@/config/pricing');

beforeEach(() => {
  subscriptionPlanKey = 'discovery';
  usage = null;
  comments = [];
  audits = [];
  suggestions = [];
});

describe('Comment/suggestion quota enforcement (audit regression)', () => {
  it('allows ingestion and fully analyzes comments within the plan quota', async () => {
    const { comment, quotaExceeded } = await CommentIntelligenceService.ingestComment({
      organizationId: 'org-a',
      platform: 'X' as never,
      externalCommentId: 'c1',
      authorName: 'Alice',
      content: 'Bravo pour ce travail !',
    });

    expect(quotaExceeded).toBeUndefined();
    expect(comment.category).toBe('COMPLIMENT');
    expect(comment.status).not.toBe('TO_QUALIFY');
  });

  it('never drops a real inbound comment once the monthly quota is exhausted, but skips AI enrichment', async () => {
    const limit = getPlan('discovery').quotas.commentsPerMonth;
    usage = {
      organizationId: 'org-a',
      periodStart: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)),
      periodEnd: new Date(),
      commentsIngested: limit, // already at the cap
      aiSuggestionsGenerated: 0,
      extraCommentsBalance: 0,
    };

    const { comment, quotaExceeded } = await CommentIntelligenceService.ingestComment({
      organizationId: 'org-a',
      platform: 'X' as never,
      externalCommentId: 'c-over-quota',
      authorName: 'Bob',
      content: 'Bravo pour ce travail !',
    });

    expect(quotaExceeded).toBe(true);
    expect(comment.status).toBe('TO_QUALIFY');
    // The raw comment IS still persisted — real customer data is never lost.
    expect(comments.some((c) => c.externalCommentId === 'c-over-quota')).toBe(true);
    // But it was never run through classification — no category/priority assigned.
    expect(comment.category).toBeUndefined();
  });

  it('consumes a purchased comment pack before blocking ingestion once the monthly plan quota is spent', async () => {
    const limit = getPlan('discovery').quotas.commentsPerMonth;
    usage = {
      organizationId: 'org-a',
      periodStart: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)),
      periodEnd: new Date(),
      commentsIngested: limit,
      aiSuggestionsGenerated: 0,
      extraCommentsBalance: 5, // a pack was purchased
    };

    const { comment, quotaExceeded } = await CommentIntelligenceService.ingestComment({
      organizationId: 'org-a',
      platform: 'X' as never,
      externalCommentId: 'c-covered-by-pack',
      authorName: 'Carol',
      content: 'Bravo pour ce travail !',
    });

    expect(quotaExceeded).toBeUndefined();
    expect(comment.category).toBe('COMPLIMENT'); // fully analyzed, pack absorbed the overage
    expect(usage!.extraCommentsBalance).toBe(4);
  });

  it('blocks new Response Copilot suggestions once the monthly AI-suggestion quota is spent', async () => {
    const limit = getPlan('discovery').quotas.commentAiSuggestionsPerMonth;
    usage = {
      organizationId: 'org-a',
      periodStart: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)),
      periodEnd: new Date(),
      commentsIngested: 0,
      aiSuggestionsGenerated: limit,
      extraCommentsBalance: 0,
    };
    comments.push({ id: 'comment-safe', organizationId: 'org-a', isSensitive: false, categoryReason: null });

    await expect(
      CommentIntelligenceService.generateReplySuggestions({ organizationId: 'org-a', commentId: 'comment-safe' }),
    ).rejects.toThrow(/Quota de \d+ suggestions IA/);
  });

  it('CRITICAL: never blocks the sensitive-topic safety escalation behind a quota — governance always wins over billing', async () => {
    const limit = getPlan('discovery').quotas.commentAiSuggestionsPerMonth;
    usage = {
      organizationId: 'org-a',
      periodStart: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)),
      periodEnd: new Date(),
      commentsIngested: 0,
      aiSuggestionsGenerated: limit, // already exhausted
      extraCommentsBalance: 0,
    };
    comments.push({ id: 'comment-sensitive', organizationId: 'org-a', isSensitive: true, categoryReason: 'Risque juridique' });

    const result = await CommentIntelligenceService.generateReplySuggestions({
      organizationId: 'org-a',
      commentId: 'comment-sensitive',
    });

    expect(result).toHaveLength(1);
    expect(result[0]!.suggestedReply).toMatch(/gouvernance STARS/);
  });
});
