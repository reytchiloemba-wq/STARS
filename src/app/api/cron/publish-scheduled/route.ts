import { NextResponse } from 'next/server';
import { EditorialService } from '@/server/services/editorial.service';

// The actual executor for scheduled publications (spec §16: "reprise en
// cas d'échec" / a schedule must eventually run). Triggered by Vercel Cron
// (see vercel.json) — NOT reachable by a normal tenant request, guarded by
// CRON_SECRET (Vercel automatically sends `Authorization: Bearer
// <CRON_SECRET>` for its own cron invocations; see
// https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs).
//
// Before this route existed, `Publication.status = 'SCHEDULED'` was a dead
// end: nothing ever transitioned it to PUBLISHED/FAILED, so any scheduled
// post — including one scheduled by accident (an empty datetime-local
// input rounding to "now") — sat there forever, silently never reaching
// the real network. This is what actually executes it.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const result = await EditorialService.executeDueSchedules();
  return NextResponse.json(result);
}
