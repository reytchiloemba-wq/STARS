import { db } from '@/lib/db';

export interface CreateBrandVoiceInput {
  organizationId: string;
  brandId?: string;
  name: string;
  sector?: string;
  audience?: string;
  values: string[];
  tone?: string;
  preferredVocabulary: string[];
  forbiddenTerms: string[];
  technicalLevel?: string;
  boldnessLevel?: number;
  signature?: string;
  hashtags: string[];
  callToAction?: string;
}

export class BrandVoiceService {
  static async list(organizationId: string) {
    return db.brandVoice.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: { brand: true },
    });
  }

  static async getById(organizationId: string, id: string) {
    return db.brandVoice.findFirst({
      where: { id, organizationId },
      include: { brand: true },
    });
  }

  static async create(input: CreateBrandVoiceInput) {
    return db.brandVoice.create({
      data: {
        organizationId: input.organizationId,
        brandId: input.brandId,
        name: input.name,
        sector: input.sector,
        audience: input.audience,
        values: input.values,
        tone: input.tone,
        preferredVocabulary: input.preferredVocabulary,
        forbiddenTerms: input.forbiddenTerms,
        technicalLevel: input.technicalLevel,
        boldnessLevel: input.boldnessLevel ?? 3,
        signature: input.signature,
        hashtags: input.hashtags,
        callToAction: input.callToAction,
      },
    });
  }

  static async update(organizationId: string, id: string, input: Partial<CreateBrandVoiceInput>) {
    const existing = await db.brandVoice.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new Error('Brand Voice introuvable');

    return db.brandVoice.update({
      where: { id },
      data: {
        name: input.name,
        sector: input.sector,
        audience: input.audience,
        values: input.values,
        tone: input.tone,
        preferredVocabulary: input.preferredVocabulary,
        forbiddenTerms: input.forbiddenTerms,
        technicalLevel: input.technicalLevel,
        boldnessLevel: input.boldnessLevel,
        signature: input.signature,
        hashtags: input.hashtags,
        callToAction: input.callToAction,
      },
    });
  }

  static async delete(organizationId: string, id: string) {
    const existing = await db.brandVoice.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new Error('Brand Voice introuvable');

    return db.brandVoice.delete({ where: { id } });
  }
}
