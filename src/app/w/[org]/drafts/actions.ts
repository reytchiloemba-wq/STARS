'use server';

import { requireTenantPermission } from '@/lib/tenant';
import { EditorialService } from '@/server/services/editorial.service';
import { type ApprovalDecision } from '@prisma/client';

export async function addDraftCommentAction(
  orgSlug: string,
  draftId: string,
  body: string,
) {
  try {
    const ctx = await requireTenantPermission(orgSlug, 'draft.edit');
    const comment = await EditorialService.addComment({
      organizationId: ctx.organization.id,
      userId: ctx.userId,
      draftId,
      body,
    });
    return { ok: true, comment };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erreur commentaire' };
  }
}

export async function submitApprovalAction(
  orgSlug: string,
  draftId: string,
  decision: ApprovalDecision,
  note?: string,
) {
  try {
    const ctx = await requireTenantPermission(orgSlug, 'draft.approve');
    const approval = await EditorialService.submitApproval({
      organizationId: ctx.organization.id,
      approverId: ctx.userId,
      draftId,
      decision,
      note,
    });
    return { ok: true, approval };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Erreur approbation' };
  }
}
