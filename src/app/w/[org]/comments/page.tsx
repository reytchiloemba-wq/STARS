import { resolveTenant } from '@/lib/tenant';
import { db } from '@/lib/db';
import { CommentIntelligenceService } from '@/server/services/comments/comment.service';
import CommentsClient from './comments-client';

export const metadata = {
  title: 'Comment Intelligence Hub | STARS',
  description: 'Boîte de réception sociale unifiée, gouvernance des interactions et suggestions Brand Voice',
};

export default async function CommentsPage({
  params,
}: {
  params: Promise<{ org: string }>;
}) {
  const { org } = await params;
  const ctx = await resolveTenant(org);

  const [commentsResult, crisisStatus, brandVoices, teamMembers] = await Promise.all([
    CommentIntelligenceService.listComments({
      organizationId: ctx.organization.id,
      inbox: 'all',
      take: 50,
    }),
    CommentIntelligenceService.detectCrisisAnomaly(ctx.organization.id),
    db.brandVoice.findMany({
      where: { organizationId: ctx.organization.id },
      select: { id: true, name: true },
    }),
    db.membership.findMany({
      where: { organizationId: ctx.organization.id },
      select: {
        id: true,
        user: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  return (
    <CommentsClient
      orgSlug={org}
      orgName={ctx.organization.name}
      initialComments={commentsResult.comments as any}
      initialTotalCount={commentsResult.totalCount}
      crisisStatus={crisisStatus}
      brandVoices={brandVoices}
      teamMembers={teamMembers}
    />
  );
}
