import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NativeAiAdapter } from '@/server/adapters/ai/native';

describe('Agent 2 & 3 : Multi-Model AI Engine (Anthropic, Gemini, Unsplash)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('generates 5 editorial variants using Anthropic Claude 3.5 Sonnet when key is present', async () => {
    const mockAnthropicFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('api.anthropic.com')) {
        return {
          ok: true,
          json: async () => ({
            content: [
              {
                text: JSON.stringify([
                  { label: 'concise', content: 'Version courte rédigée par Claude 3.5 Sonnet.', suggestedHook: 'Accroche Claude', hashtags: ['#IA'] },
                  { label: 'expert', content: 'Version experte approfondie.', suggestedHook: 'Accroche Expert', hashtags: ['#Tech'] },
                  { label: 'executive', content: 'Version dirigeant stratégique.', suggestedHook: 'Accroche Dirigeant', hashtags: ['#Strategie'] },
                  { label: 'pedagogical', content: 'Version pédagogique claire.', suggestedHook: 'Accroche Pédago', hashtags: ['#Apprendre'] },
                  { label: 'high-engagement', content: 'Version forte engagement.', suggestedHook: 'Accroche Engagement', hashtags: ['#Debat'] },
                ]),
              },
            ],
          }),
        };
      }
      return { ok: false };
    });

    global.fetch = mockAnthropicFetch;

    const prevAnthropic = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key-2026';

    const adapter = new NativeAiAdapter();
    const variants = await adapter.generatePostVariants({
      dossierTitle: 'Souveraineté Numérique Européenne',
      dossierSummary: 'Analyse des investissements stratégiques et conformité.',
      network: 'LINKEDIN',
      tone: 'Expert & Mesuré',
    });

    expect(variants).toHaveLength(5);
    expect(variants[0]?.content).toContain('Claude 3.5 Sonnet');
    expect(variants[0]?.isDemoData).toBe(false);

    if (prevAnthropic) process.env.ANTHROPIC_API_KEY = prevAnthropic;
    else delete process.env.ANTHROPIC_API_KEY;
  });

  it('generates 5 editorial variants using Google Gemini when Anthropic is absent', async () => {
    const mockGeminiFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('generativelanguage.googleapis.com')) {
        return {
          ok: true,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify([
                        { label: 'concise', content: 'Version courte rédigée par Google Gemini.', suggestedHook: 'Accroche Gemini' },
                        { label: 'expert', content: 'Version experte Gemini.' },
                        { label: 'executive', content: 'Version dirigeant Gemini.' },
                        { label: 'pedagogical', content: 'Version pédagogique Gemini.' },
                        { label: 'high-engagement', content: 'Version forte engagement Gemini.' },
                      ]),
                    },
                  ],
                },
              },
            ],
          }),
        };
      }
      return { ok: false };
    });

    global.fetch = mockGeminiFetch;

    const prevAnthropic = process.env.ANTHROPIC_API_KEY;
    const prevOpenAI = process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const prevGemini = process.env.GEMINI_API_KEY;
    process.env.GEMINI_API_KEY = 'AIzaSyTestGeminiKey';

    const adapter = new NativeAiAdapter();
    const variants = await adapter.generatePostVariants({
      dossierTitle: 'Batteries Sodium-ion',
      dossierSummary: 'Évolution du stockage stationnaire.',
      network: 'X',
      tone: 'Innovant',
    });

    expect(variants).toHaveLength(5);
    expect(variants[0]?.content).toContain('Google Gemini');
    expect(variants[0]?.isDemoData).toBe(false);

    if (prevAnthropic) process.env.ANTHROPIC_API_KEY = prevAnthropic;
    if (prevOpenAI) process.env.OPENAI_API_KEY = prevOpenAI;
    if (prevGemini) process.env.GEMINI_API_KEY = prevGemini;
    else delete process.env.GEMINI_API_KEY;
  });

  it('queries real press photos from Unsplash API when key is configured', async () => {
    const mockUnsplashFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('api.unsplash.com')) {
        return {
          ok: true,
          json: async () => ({
            results: [
              {
                urls: {
                  regular: 'https://images.unsplash.com/photo-real-press-12345?w=1080',
                },
                alt_description: 'Centre de données moderne en Europe',
              },
            ],
          }),
        };
      }
      return { ok: false };
    });

    global.fetch = mockUnsplashFetch;

    const prevOpenAI = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const prevUnsplash = process.env.UNSPLASH_ACCESS_KEY;
    process.env.UNSPLASH_ACCESS_KEY = 'unsplash-test-access-key';

    const adapter = new NativeAiAdapter();
    const illustration = await adapter.generateIllustration('Infrastructure cloud et datacenter', '16:9');

    expect(illustration.provider).toBe('unsplash');
    expect(illustration.url).toBe('https://images.unsplash.com/photo-real-press-12345?w=1080');
    expect(illustration.isDemoData).toBe(false);

    if (prevOpenAI) process.env.OPENAI_API_KEY = prevOpenAI;
    if (prevUnsplash) process.env.UNSPLASH_ACCESS_KEY = prevUnsplash;
    else delete process.env.UNSPLASH_ACCESS_KEY;
  });
});
