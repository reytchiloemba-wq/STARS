import { describe, it, expect, beforeEach } from 'vitest';
import { CommentIntelligenceService } from '@/server/services/comments/comment.service';
import { db } from '@/lib/db';
import { PLANS, getPlan } from '@/config/pricing';
import { SocialNetwork } from '@prisma/client';

describe('STARS Comment Intelligence Hub & Governance', () => {
  let testOrgId: string;
  let testUserId: string;

  beforeEach(async () => {
    // Récupération ou création d'une organisation et d'un utilisateur de test
    const org = await db.organization.findFirst({
      include: { owner: true },
    });

    if (org && org.owner) {
      testOrgId = org.id;
      testUserId = org.owner.id;
    } else {
      const createdOrg = await db.organization.create({
        data: {
          slug: `test-comment-org-${Date.now()}`,
          name: 'Comment Test Org',
          owner: {
            create: {
              email: `owner-${Date.now()}@stars.app`,
              passwordHash: 'dummy',
            },
          },
        },
        include: { owner: true },
      });
      testOrgId = createdOrg.id;
      testUserId = createdOrg.owner!.id;
    }
  });

  describe('Pricing Quotas & Economics', () => {
    it('defines comment quotas and AI suggestion allowances across all 5 tiers', () => {
      const discovery = getPlan('discovery');
      const creator = getPlan('creator');
      const professional = getPlan('professional');
      const business = getPlan('business');
      const enterprise = getPlan('enterprise');

      expect(discovery.quotas.commentsPerMonth).toBe(25);
      expect(discovery.quotas.commentAiSuggestionsPerMonth).toBe(5);

      expect(creator.quotas.commentsPerMonth).toBe(500);
      expect(creator.quotas.commentAiSuggestionsPerMonth).toBe(150);

      expect(professional.quotas.commentsPerMonth).toBe(3000);
      expect(professional.quotas.commentAiSuggestionsPerMonth).toBe(1000);

      expect(business.quotas.commentsPerMonth).toBe(15000);
      expect(business.quotas.commentAiSuggestionsPerMonth).toBe(5000);

      expect(enterprise.quotas.commentsPerMonth).toBe(-1); // Sur-mesure
      expect(enterprise.quotas.commentAiSuggestionsPerMonth).toBe(-1);
    });
  });

  describe('NLP Classification & Semantic Intelligence', () => {
    it('classifies legal threats and complaints as sensitive with high confidence', () => {
      const analysis = CommentIntelligenceService.analyzeContentNLP(
        'Notre avocat va vous attaquer en justice pour diffamation et escroc.',
      );
      expect(analysis.isSensitive).toBe(true);
      expect(analysis.category).toBe('LEGAL_RISK');
      expect(analysis.sentiment).toBe('NEGATIVE');
      expect(analysis.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('classifies pricing and demo requests as commercial buying intent', () => {
      const analysis = CommentIntelligenceService.analyzeContentNLP(
        'Bonjour, quels sont vos tarifs et comment réserver une démo pour notre équipe ?',
      );
      expect(analysis.isSensitive).toBe(false);
      expect(analysis.category).toBe('BUYING_INTENT');
      expect(analysis.sentiment).toBe('POSITIVE');
    });

    it('classifies service praise as compliments', () => {
      const analysis = CommentIntelligenceService.analyzeContentNLP(
        'Bravo et félicitations pour cette analyse magnifique, un travail remarquable !',
      );
      expect(analysis.isSensitive).toBe(false);
      expect(analysis.category).toBe('COMPLIMENT');
      expect(analysis.sentiment).toBe('POSITIVE');
    });
  });

  describe('Priority Scoring & SLA Calculation', () => {
    it('calculates CRITICAL priority score (>=80) for sensitive crisis comments', () => {
      const priority = CommentIntelligenceService.calculatePriorityScore({
        sentiment: 'NEGATIVE',
        category: 'LEGAL_RISK',
        isSensitive: true,
        content: 'Mise en demeure immédiate ?',
      });

      expect(priority.score).toBeGreaterThanOrEqual(80);
      expect(priority.level).toBe('CRITICAL');
      expect(priority.factors['sensitivity_alert']).toBeDefined();
    });

    it('assigns 30-minute SLA for CRITICAL priority and 24h for LOW priority', () => {
      const now = new Date('2026-01-01T12:00:00Z');
      const criticalSla = CommentIntelligenceService.calculateSlaDueDate('CRITICAL', now);
      const lowSla = CommentIntelligenceService.calculateSlaDueDate('LOW', now);

      expect(criticalSla.getTime() - now.getTime()).toBe(30 * 60 * 1000);
      expect(lowSla.getTime() - now.getTime()).toBe(24 * 60 * 60 * 1000);
    });
  });

  describe('Deduplication & Multi-Tenant Ingestion', () => {
    it('guarantees idempotency via organizationId + platform + externalCommentId deduplication', async () => {
      const uniqueExtId = `test_ext_${Date.now()}_dedup`;

      const first = await CommentIntelligenceService.ingestComment({
        organizationId: testOrgId,
        platform: 'LINKEDIN',
        externalCommentId: uniqueExtId,
        authorName: 'Jean Dupont',
        content: 'Très intéressant, je souhaite en savoir plus sur vos fonctionnalités.',
      });

      expect(first.isDuplicate).toBe(false);
      expect(first.comment.id).toBeDefined();

      // Second ingestion with identical key
      const second = await CommentIntelligenceService.ingestComment({
        organizationId: testOrgId,
        platform: 'LINKEDIN',
        externalCommentId: uniqueExtId,
        authorName: 'Jean Dupont',
        content: 'Très intéressant, je souhaite en savoir plus sur vos fonctionnalités.',
      });

      expect(second.isDuplicate).toBe(true);
      expect(second.comment.id).toBe(first.comment.id);
    });
  });

  describe('Human Governance & Sensitive Topic Safety Guard', () => {
    it('locks automated public replies when comment is marked sensitive', async () => {
      const uniqueExtId = `test_ext_${Date.now()}_sensitive`;

      const { comment } = await CommentIntelligenceService.ingestComment({
        organizationId: testOrgId,
        platform: 'FACEBOOK',
        externalCommentId: uniqueExtId,
        authorName: 'Cabinet Juridique Associés',
        content: 'Vous avez détourné nos données, notre avocat saisit le tribunal de commerce.',
      });

      expect(comment.isSensitive).toBe(true);
      expect(comment.status).toBe('ESCALATED');

      const suggestions = await CommentIntelligenceService.generateReplySuggestions({
        organizationId: testOrgId,
        commentId: comment.id,
      });

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0]!.label).toContain('Escalade Spécialiste Requise');
      expect(suggestions[0]!.suggestedReply).toContain('toute réponse automatique publique est neutralisée');
    });

    it('generates 5 distinct Brand Voice variants when comment is safe', async () => {
      const uniqueExtId = `test_ext_${Date.now()}_safe`;

      const { comment } = await CommentIntelligenceService.ingestComment({
        organizationId: testOrgId,
        platform: 'X',
        externalCommentId: uniqueExtId,
        authorName: 'Marc Innov',
        content: 'Quel est votre point de vue sur l’open source face aux modèles propriétaires ?',
      });

      const suggestions = await CommentIntelligenceService.generateReplySuggestions({
        organizationId: testOrgId,
        commentId: comment.id,
      });

      expect(suggestions.length).toBe(5);
      const keys = suggestions.map((s) => s.variantKey);
      expect(keys).toContain('short');
      expect(keys).toContain('expert');
      expect(keys).toContain('commercial');
      expect(keys).toContain('educational');
      expect(keys).toContain('empathic');
    });
  });

  describe('Internal Notes Isolation & Audit Trails', () => {
    it('creates private internal notes strictly isolated from public replies', async () => {
      const uniqueExtId = `test_ext_${Date.now()}_note`;

      const { comment } = await CommentIntelligenceService.ingestComment({
        organizationId: testOrgId,
        platform: 'INSTAGRAM',
        externalCommentId: uniqueExtId,
        authorName: 'Claire V.',
        content: 'J’aimerais en savoir plus sur votre offre entreprise.',
      });

      const note = await CommentIntelligenceService.addInternalNote({
        organizationId: testOrgId,
        commentId: comment.id,
        authorId: testUserId,
        body: 'Client VIP potentiel (DG groupe bancaire). Traitement prioritaire demandé par la direction.',
      });

      expect(note.id).toBeDefined();
      expect(note.body).toContain('Client VIP');

      // Verify comment public reply is still null
      const freshComment = await db.socialComment.findUnique({
        where: { id: comment.id },
      });
      expect(freshComment?.replyContent).toBeNull();
    });

    it('logs status transitions in the audit trail', async () => {
      const uniqueExtId = `test_ext_${Date.now()}_audit`;

      const { comment } = await CommentIntelligenceService.ingestComment({
        organizationId: testOrgId,
        platform: 'LINKEDIN',
        externalCommentId: uniqueExtId,
        authorName: 'Julien T.',
        content: 'Merci pour ce partage.',
      });

      await CommentIntelligenceService.transitionStatus({
        organizationId: testOrgId,
        commentId: comment.id,
        toStatus: 'REPLIED',
        actorUserId: testUserId,
        replyContent: 'Avec grand plaisir Julien !',
        reason: 'Réponse officielle envoyée',
      });

      const audits = await db.socialCommentAudit.findMany({
        where: { commentId: comment.id },
        orderBy: { createdAt: 'desc' },
      });

      expect(audits.length).toBeGreaterThanOrEqual(2);
      expect(audits[0]!.toStatus).toBe('REPLIED');
    });
  });

  describe('Strategic Conversions: Lead CRM & Editorial Drafts', () => {
    it('converts a promising comment into a CRM Lead', async () => {
      const uniqueExtId = `test_ext_${Date.now()}_lead`;

      const { comment } = await CommentIntelligenceService.ingestComment({
        organizationId: testOrgId,
        platform: 'LINKEDIN',
        externalCommentId: uniqueExtId,
        authorName: 'Guillaume Roussel',
        content: 'Nous cherchons une solution pour nos 200 consultants, pouvons-nous convenir d’un échange ?',
      });

      const { updated, targetId } = await CommentIntelligenceService.convertToOpportunity({
        organizationId: testOrgId,
        commentId: comment.id,
        actorUserId: testUserId,
        type: 'LEAD',
      });

      expect(updated.convertedToType).toBe('LEAD');
      expect(updated.assignedTeam).toBe('SALES');
      expect(targetId).toContain('crm_lead_');
    });

    it('converts a comment question into a STARS Editorial Studio Draft', async () => {
      const uniqueExtId = `test_ext_${Date.now()}_draft`;

      const { comment } = await CommentIntelligenceService.ingestComment({
        organizationId: testOrgId,
        platform: 'X',
        externalCommentId: uniqueExtId,
        authorName: 'Nathalie B.',
        content: 'Comment concilier frugalité énergétique et entraînement intensif de modèles ?',
      });

      const { updated, draft } = await CommentIntelligenceService.convertToPublication({
        organizationId: testOrgId,
        commentId: comment.id,
        actorUserId: testUserId,
      });

      expect(updated.convertedToType).toBe('PUBLICATION');
      expect(draft.id).toBeDefined();
      expect(draft.status).toBe('IDEA');
      expect(draft.network).toBe('X');
      expect(draft.currentContent).toContain('Nathalie B.');
    });
  });
});
