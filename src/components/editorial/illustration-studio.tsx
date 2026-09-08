/* eslint-disable @next/next/no-img-element */
'use client';

import { useState } from 'react';
import type { MediaKind } from '@prisma/client';

export interface SelectedMedia {
  url: string;
  kind: MediaKind;
  altText?: string;
  aiPrompt?: string;
  aiGenerated?: boolean;
}

const STOCK_IMAGES = [
  {
    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop',
    title: 'Technologie & Données mondiales',
    license: 'Unsplash Commercial License',
  },
  {
    url: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?q=80&w=1200&auto=format&fit=crop',
    title: 'Finance & Marchés mondiaux',
    license: 'Unsplash Commercial License',
  },
  {
    url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200&auto=format&fit=crop',
    title: 'Architecture & Industrie moderne',
    license: 'Unsplash Commercial License',
  },
  {
    url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1200&auto=format&fit=crop',
    title: 'Espace de travail & Décideurs',
    license: 'Unsplash Commercial License',
  },
];

export default function IllustrationStudio({
  onSelectMedia,
  selectedMedia,
}: {
  onSelectMedia: (media: SelectedMedia | null) => void;
  selectedMedia: SelectedMedia | null;
}) {
  const [tab, setTab] = useState<'AI' | 'STOCK' | 'UPLOAD'>('AI');
  const [aiPrompt, setAiPrompt] = useState('Analyse stratégique et flux de données mondiales sur fond sombre élégant, style technologique néo-éditorial');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '4:5' | '16:9'>('16:9');
  const [altText, setAltText] = useState('Graphique d’intelligence stratégique illustrant les tendances');
  const [customUrl, setCustomUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  function handleGenerateAi() {
    setIsGenerating(true);
    setTimeout(() => {
      // Image illustrative générée
      const generatedUrl = aspectRatio === '1:1'
        ? 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop'
        : aspectRatio === '4:5'
        ? 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=800&auto=format&fit=crop'
        : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop';

      onSelectMedia({
        url: generatedUrl,
        kind: 'AI_GENERATED',
        aiPrompt,
        altText,
        aiGenerated: true,
      });
      setIsGenerating(false);
    }, 800);
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Studio d&apos;Illustration</h3>
          <p className="text-xs text-muted-foreground">
            Enrichissez votre publication avec une image vérifiée ou une illustration IA conforme.
          </p>
        </div>
        {selectedMedia && (
          <button
            type="button"
            onClick={() => onSelectMedia(null)}
            className="text-xs text-danger hover:underline"
          >
            Retirer l&apos;image
          </button>
        )}
      </div>

      {/* Onglets */}
      <div className="mt-4 flex gap-2 border-b border-border pb-2 text-xs">
        <button
          type="button"
          onClick={() => setTab('AI')}
          className={`rounded-lg px-3 py-1.5 font-medium transition ${
            tab === 'AI' ? 'bg-surface-raised text-accent-cyan' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          ✨ Génération IA (2 crédits)
        </button>
        <button
          type="button"
          onClick={() => setTab('STOCK')}
          className={`rounded-lg px-3 py-1.5 font-medium transition ${
            tab === 'STOCK' ? 'bg-surface-raised text-accent-cyan' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          📷 Banque d&apos;images autorisées
        </button>
        <button
          type="button"
          onClick={() => setTab('UPLOAD')}
          className={`rounded-lg px-3 py-1.5 font-medium transition ${
            tab === 'UPLOAD' ? 'bg-surface-raised text-accent-cyan' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          🔗 URL externe / Import
        </button>
      </div>

      {/* Tab AI */}
      {tab === 'AI' && (
        <div className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Prompt de génération éditorial :</label>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-xl border border-border bg-surface-raised p-3 text-xs outline-none focus:border-accent-cyan"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Format / Ratio adapté :</label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as '1:1' | '4:5' | '16:9')}
                className="mt-1 w-full rounded-xl border border-border bg-surface-raised p-2.5 text-xs outline-none"
              >
                <option value="16:9">16:9 (Paysage — LinkedIn, X, Facebook)</option>
                <option value="1:1">1:1 (Carré — Instagram & aperçus compacts)</option>
                <option value="4:5">4:5 (Portrait vertical — Instagram feed)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">Texte alternatif (Accessibilité RGPD/WCAG) :</label>
              <input
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-surface-raised p-2.5 text-xs outline-none focus:border-accent-cyan"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              🛡️ Respect de la charte : pas de photo-vérité trompeuse, étiquetage « Généré par IA » automatique.
            </span>
            <button
              type="button"
              onClick={handleGenerateAi}
              disabled={isGenerating}
              className="rounded-xl bg-start-gradient px-4 py-2 text-xs font-semibold text-white shadow transition hover:opacity-90 disabled:opacity-50"
            >
              {isGenerating ? 'Génération en cours…' : 'Générer l’illustration (2 crédits)'}
            </button>
          </div>
        </div>
      )}

      {/* Tab Stock */}
      {tab === 'STOCK' && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {STOCK_IMAGES.map((img, i) => (
            <div
              key={i}
              onClick={() =>
                onSelectMedia({
                  url: img.url,
                  kind: 'STOCK_IMAGE',
                  altText: img.title,
                })
              }
              className={`group cursor-pointer overflow-hidden rounded-xl border p-1 transition ${
                selectedMedia?.url === img.url ? 'border-accent-cyan ring-2 ring-accent-cyan/30' : 'border-border hover:border-accent-cyan'
              }`}
            >
              <img src={img.url} alt={img.title} className="h-24 w-full rounded-lg object-cover" />
              <div className="mt-1.5 px-1">
                <div className="truncate text-[11px] font-medium text-foreground">{img.title}</div>
                <div className="text-[10px] text-muted-foreground">{img.license}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab Upload */}
      {tab === 'UPLOAD' && (
        <div className="mt-4 flex gap-2">
          <input
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            placeholder="Collez une URL d'image directe (ex: https://.../image.jpg)"
            className="flex-1 rounded-xl border border-border bg-surface-raised px-3 py-2 text-xs outline-none focus:border-accent-cyan"
          />
          <button
            type="button"
            onClick={() => {
              if (customUrl.trim()) {
                onSelectMedia({
                  url: customUrl.trim(),
                  kind: 'USER_UPLOAD',
                  altText: 'Image importée par l’utilisateur',
                });
              }
            }}
            className="rounded-xl border border-border px-4 py-2 text-xs font-medium hover:bg-surface-raised"
          >
            Appliquer
          </button>
        </div>
      )}

      {/* Aperçu de l'image sélectionnée */}
      {selectedMedia && (
        <div className="mt-4 flex items-center gap-4 rounded-xl border border-accent-cyan/30 bg-surface-raised p-3">
          <img src={selectedMedia.url} alt="Sélection" className="h-14 w-20 rounded-lg object-cover" />
          <div className="flex-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">Image sélectionnée</span>
              {selectedMedia.aiGenerated && (
                <span className="rounded bg-accent-magenta/20 px-1.5 py-0.5 text-[10px] font-bold text-accent-magenta">
                  Généré par IA
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Alt : {selectedMedia.altText || 'Aucun texte alternatif'}</p>
          </div>
        </div>
      )}
    </div>
  );
}
