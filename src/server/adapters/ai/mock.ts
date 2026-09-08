import type { AiAdapter, PostVariant, PostVariantRequest } from './types';

// No LLM key is configured yet. This deterministic mock keeps the editorial
// studio fully click-through-able; wire a real provider (Anthropic, etc.)
// behind the same AiAdapter interface once ANTHROPIC_API_KEY is set.
export class MockAiAdapter implements AiAdapter {
  readonly providerName = 'start-demo-ai-adapter';

  async generatePostVariants(req: PostVariantRequest): Promise<PostVariant[]> {
    const base = `${req.dossierTitle} — ${req.dossierSummary}`;
    const labels: PostVariant['label'][] = ['concise', 'expert', 'executive', 'pedagogical', 'high-engagement'];
    return labels.map((label) => ({
      label,
      isDemoData: true,
      content: `[Démonstration — variante ${label} / ${req.network} / ton ${req.tone}]\n${base}`,
    }));
  }
}
