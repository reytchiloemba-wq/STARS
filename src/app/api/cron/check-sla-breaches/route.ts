import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { CommentIntelligenceService } from '@/server/services/comments/comment.service';

// Runs the Comment Intelligence Hub's SLA "avant et après dépassement"
// alerting (spec §13) across every tenant. Same CRON_SECRET auth pattern as
// /api/cron/publish-scheduled — see that route for why (Vercel Cron sends
// `Authorization: Bearer <CRON_SECRET>` automatically). Triggered by the
// same GitHub Actions workflow as the scheduled-publication executor, since
// Vercel's Hobby plan only allows a daily native cron.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const orgs = await db.organization.findMany({ select: { id: true } });
  const results = await Promise.all(
    orgs.map(async (org) => {
      const result = await CommentIntelligenceService.checkSlaBreaches(org.id);
      return { organizationId: org.id, ...result };
    }),
  );

  const totals = results.reduce(
    (acc, r) => ({
      breachedCount: acc.breachedCount + r.breachedCount,
      warnedCount: acc.warnedCount + r.warnedCount,
      checkedCount: acc.checkedCount + r.checkedCount,
    }),
    { breachedCount: 0, warnedCount: 0, checkedCount: 0 },
  );

  return NextResponse.json({ organizationsChecked: orgs.length, ...totals });
}
