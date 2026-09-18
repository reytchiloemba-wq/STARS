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

  async generateIllustration(
    prompt: string,
    aspectRatio: '16:9' | '1:1' | '4:5' | '9:16' = '16:9',
  ) {
    const fallbackUrl =
      aspectRatio === '1:1'
        ? 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop'
        : aspectRatio === '4:5'
        ? 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=800&auto=format&fit=crop'
        : aspectRatio === '9:16'
        ? 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=1080&auto=format&fit=crop'
        : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop';

    return {
      url: fallbackUrl,
      altText: `Illustration générée pour : ${prompt}`,
      provider: 'mock-engine',
      model: 'deterministic-mock',
      isDemoData: true,
    };
  }
}
