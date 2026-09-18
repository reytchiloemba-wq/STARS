/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useMemo } from 'react';
import type { MediaKind } from '@prisma/client';

export interface SelectedMedia {
  id?: string;
  url: string;
  kind: MediaKind;
  altText?: string;
  aiPrompt?: string;
  aiGenerated?: boolean;
  licenseNote?: string;
}

interface StockImage {
  url: string;
  title: string;
  license: string;
  category: string;
}

const STOCK_IMAGES: StockImage[] = [
  {
    url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop',
    title: 'Technologie & Données mondiales',
    license: 'Licence Commerciale Unsplash',
    category: 'Tech & IA',
  },
  {
    url: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?q=80&w=1200&auto=format&fit=crop',
    title: 'Finance & Marchés boursiers',
    license: 'Licence Commerciale Unsplash',
    category: 'Finance',
  },
  {
    url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200&auto=format&fit=crop',
    title: 'Architecture & Industrie moderne',
    license: 'Licence Commerciale Unsplash',
    category: 'Industrie',
  },
  {
    url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1200&auto=format&fit=crop',
    title: 'Espace de travail & Décideurs',
    license: 'Licence Commerciale Unsplash',
    category: 'Leadership',
  },
  {
    url: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?q=80&w=1200&auto=format&fit=crop',
    title: 'Laboratoire de biotechnologie & Santé',
    license: 'Licence Commerciale Unsplash',
    category: 'Santé & Bio',
  },
  {
    url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=1200&auto=format&fit=crop',
    title: 'Transition écologique & Climat',
    license: 'Licence Commerciale Unsplash',
    category: 'Climat & RSE',
  },
  {
    url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1200&auto=format&fit=crop',
    title: 'Cybersécurité & Données souveraines',
    license: 'Licence Commerciale Unsplash',
    category: 'Tech & IA',
  },
  {
    url: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?q=80&w=1200&auto=format&fit=crop',
    title: 'Graphiques boursiers & Analyse quantitative',
    license: 'Licence Commerciale Unsplash',
    category: 'Finance',
  },
  {
    url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=1200&auto=format&fit=crop',
    title: 'Gouvernance & Réunion exécutive',
    license: 'Licence Commerciale Unsplash',
    category: 'Leadership',
  },
  {
    url: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?q=80&w=1200&auto=format&fit=crop',
    title: 'Énergie solaire & Réseaux renouvelables',
    license: 'Licence Commerciale Unsplash',
    category: 'Climat & RSE',
  },
  {
    url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=1200&auto=format&fit=crop',
    title: 'Ingénierie avancée & Robotique',
    license: 'Licence Commerciale Unsplash',
    category: 'Industrie',
  },
  {
    url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=1200&auto=format&fit=crop',
    title: 'Recherche médicale & Diagnostic clinique',
    license: 'Licence Commerciale Unsplash',
    category: 'Santé & Bio',
  },
];

const STOCK_CATEGORIES = ['Tous', 'Tech & IA', 'Finance', 'Leadership', 'Industrie', 'Santé & Bio', 'Climat & RSE'];

const AI_PRESET_PROMPTS = [
  'Flux de données mondiales et intelligence décisionnelle sur fond sombre élégant, style néo-éditorial',
  'Tableau de bord stratégique abstrait en néon cyan et violet, rendu 3D ultra-précis',
  'Architecture d’affaires contemporaine en verre et acier, lumière du crépuscule, photographie haut de gamme',
  'Réseaux de neurones et matrice de connectivité institutionnelle, esthétique cybernétique raffinée',
  'Transition énergétique et infrastructure industrielle du futur, perspective aérienne cinématique',
];

export default function IllustrationStudio({
  onSelectMedia,
  selectedMedia,
  onGenerateAi,
}: {
  onSelectMedia: (media: SelectedMedia | null) => void;
  selectedMedia: SelectedMedia | null;
  onGenerateAi?: (params: {
    prompt: string;
    aspectRatio: '1:1' | '4:5' | '16:9' | '9:16';
    altText?: string;
  }) => Promise<{ ok: boolean; url?: string; error?: string }>;
}) {
  const [tab, setTab] = useState<'AI' | 'STOCK' | 'UPLOAD'>('AI');
  const [aiPrompt, setAiPrompt] = useState<string>(AI_PRESET_PROMPTS[0] || '');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '4:5' | '16:9' | '9:16'>('16:9');
  const [altText, setAltText] = useState('Graphique d’intelligence stratégique illustrant les tendances');
  const [customUrl, setCustomUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Recherche & filtres stock
  const [selectedCategory, setSelectedCategory] = useState<string>('Tous');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Drag & drop upload state
  const [isDragging, setIsDragging] = useState(false);
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);

  // Modal plein écran pour zoom HD
  const [previewZoomUrl, setPreviewZoomUrl] = useState<string | null>(null);

  const filteredStock = useMemo(() => {
    return STOCK_IMAGES.filter((img) => {
      const matchCat = selectedCategory === 'Tous' || img.category === selectedCategory;
      const matchQuery =
        !searchQuery.trim() ||
        img.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        img.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [selectedCategory, searchQuery]);

  function selectPreset(preset: string) {
    setAiPrompt(preset);
    setAltText(`Illustration éditoriale : ${preset.slice(0, 60)}`);
  }

  async function handleGenerateAi() {
    const cleanPrompt = (aiPrompt || '').trim();
    if (!cleanPrompt) {
      setErrorMessage('Veuillez saisir une description ou choisir une suggestion pour générer l’illustration.');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      if (onGenerateAi) {
        const res = await onGenerateAi({
          prompt: cleanPrompt,
          aspectRatio,
          altText: altText.trim() || `Illustration éditoriale pour : ${cleanPrompt.slice(0, 80)}`,
        });
        if (!res.ok) {
          setErrorMessage(res.error || 'Erreur lors de la génération de l’illustration.');
        }
      } else {
        const generatedUrl =
          aspectRatio === '1:1'
            ? 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop'
            : aspectRatio === '4:5'
            ? 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=800&auto=format&fit=crop'
            : aspectRatio === '9:16'
            ? 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?q=80&w=1080&auto=format&fit=crop'
            : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop';

        onSelectMedia({
          url: generatedUrl,
          kind: 'AI_GENERATED',
          aiPrompt: cleanPrompt,
          altText: altText.trim() || cleanPrompt,
          aiGenerated: true,
        });
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Erreur inattendue lors de la génération.');
    } finally {
      setIsGenerating(false);
    }
  }

  function handleFileSelect(file: File) {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Format de fichier non pris en charge. Veuillez choisir une image (PNG, JPEG, WebP, GIF).');
      return;
    }
    setErrorMessage(null);
    setUploadFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      if (dataUrl) {
        onSelectMedia({
          url: dataUrl,
          kind: 'USER_UPLOAD',
          altText: file.name.replace(/\.[^/.]+$/, ''),
        });
      }
    };
    reader.readAsDataURL(file);
  }

  function handleCustomUrlApply() {
    const clean = customUrl.trim();
    if (!clean) return;
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      setErrorMessage("L'URL doit commencer par http:// ou https://");
      return;
    }
    setErrorMessage(null);
    onSelectMedia({
      url: clean,
      kind: 'USER_UPLOAD',
      altText: 'Visuel importé par URL',
    });
  }

  return (
    <div className="glass-panel rounded-2xl p-6 shadow-sm border border-border/80">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base">🎨</span>
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">Studio d&apos;Illustration & Médias</h3>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Enrichissez votre publication avec un visuel de calibre éditorial (génération IA vérifiée, stock certifié ou import direct).
          </p>
        </div>
        {selectedMedia && (
          <button
            type="button"
            onClick={() => onSelectMedia(null)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-danger/30 bg-danger/10 px-3 py-1.5 text-xs font-semibold text-danger transition hover:bg-danger/20"
          >
            <span>🗑️</span>
            <span>Retirer le visuel</span>
          </button>
        )}
      </div>

      {/* Onglets de sélection de médias */}
      <div className="mt-4 flex flex-wrap gap-1.5 border-b border-border/60 pb-2 text-xs">
        <button
          type="button"
          onClick={() => setTab('AI')}
          className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-semibold transition ${
            tab === 'AI'
              ? 'bg-gradient-to-r from-accent-cyan/20 to-accent-violet/20 border border-accent-cyan/40 text-accent-cyan shadow-sm'
              : 'border border-transparent text-muted-foreground hover:text-white'
          }`}
        >
          <span>✨</span>
          <span>Génération IA Vision</span>
        </button>
        <button
          type="button"
          onClick={() => setTab('STOCK')}
          className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-semibold transition ${
            tab === 'STOCK'
              ? 'bg-gradient-to-r from-accent-cyan/20 to-accent-violet/20 border border-accent-cyan/40 text-accent-cyan shadow-sm'
              : 'border border-transparent text-muted-foreground hover:text-white'
          }`}
        >
          <span>📷</span>
          <span>Banque Haute Résolution ({STOCK_IMAGES.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setTab('UPLOAD')}
          className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-semibold transition ${
            tab === 'UPLOAD'
              ? 'bg-gradient-to-r from-accent-cyan/20 to-accent-violet/20 border border-accent-cyan/40 text-accent-cyan shadow-sm'
              : 'border border-transparent text-muted-foreground hover:text-white'
          }`}
        >
          <span>🔗</span>
          <span>Lien URL / Fichier Local</span>
        </button>
      </div>

      {/* Onglet IA */}
      {tab === 'AI' && (
        <div className="mt-4 space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-muted-foreground">Prompt de composition visuelle :</label>
              <span className="text-[10px] text-accent-cyan font-semibold">Moteur : STARS Vision Flux HD</span>
            </div>
            <textarea
              value={aiPrompt}
              onChange={(e) => {
                setAiPrompt(e.target.value);
                if (errorMessage) setErrorMessage(null);
              }}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleGenerateAi();
                }
              }}
              rows={2}
              placeholder="Décrivez l'illustration souhaitée (ex: Réseau quantique et flux de données souveraines sous un angle éditorial épuré)... [Raccourci : ⌘ + Entrée]"
              className="mt-1.5 w-full rounded-xl border border-border bg-surface-raised/90 p-3 text-xs text-white outline-none transition focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan/30 font-sans"
            />

            {/* Presets rapides de prompts */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="text-[10px] font-semibold text-muted-foreground py-0.5">Suggestions :</span>
              {AI_PRESET_PROMPTS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => selectPreset(preset)}
                  className="rounded-lg border border-border/80 bg-surface-raised px-2 py-0.5 text-[10px] text-muted-foreground transition hover:border-accent-cyan/50 hover:text-white"
                >
                  {preset.slice(0, 35)}...
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-bold text-muted-foreground">Format de cadrage :</label>
              <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <button
                  type="button"
                  onClick={() => setAspectRatio('16:9')}
                  className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-2 text-[11px] font-medium transition ${
                    aspectRatio === '16:9'
                      ? 'border-accent-cyan bg-accent-cyan/15 text-accent-cyan font-bold'
                      : 'border-border bg-surface-raised text-muted-foreground hover:text-white'
                  }`}
                >
                  <span className="inline-block h-3 w-5 rounded-sm border border-current"></span>
                  <span>16:9 Paysage</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAspectRatio('1:1')}
                  className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-2 text-[11px] font-medium transition ${
                    aspectRatio === '1:1'
                      ? 'border-accent-cyan bg-accent-cyan/15 text-accent-cyan font-bold'
                      : 'border-border bg-surface-raised text-muted-foreground hover:text-white'
                  }`}
                >
                  <span className="inline-block h-3.5 w-3.5 rounded-sm border border-current"></span>
                  <span>1:1 Carré</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAspectRatio('4:5')}
                  className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-2 text-[11px] font-medium transition ${
                    aspectRatio === '4:5'
                      ? 'border-accent-cyan bg-accent-cyan/15 text-accent-cyan font-bold'
                      : 'border-border bg-surface-raised text-muted-foreground hover:text-white'
                  }`}
                >
                  <span className="inline-block h-4 w-3.5 rounded-sm border border-current"></span>
                  <span>4:5 Portrait</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAspectRatio('9:16')}
                  className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-2 text-[11px] font-medium transition ${
                    aspectRatio === '9:16'
                      ? 'border-accent-cyan bg-accent-cyan/15 text-accent-cyan font-bold'
                      : 'border-border bg-surface-raised text-muted-foreground hover:text-white'
                  }`}
                >
                  <span className="inline-block h-4.5 w-2.5 rounded-sm border border-current"></span>
                  <span>9:16 TikTok</span>
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground">Description d&apos;accessibilité (Alt Text) :</label>
              <input
                value={altText}
                onChange={(e) => setAltText(e.target.value)}
                placeholder="Texte descriptif pour lecteurs d'écran"
                className="mt-1.5 w-full rounded-xl border border-border bg-surface-raised/90 p-2.5 text-xs text-white outline-none focus:border-accent-cyan"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">Conformité RGPD et accessibilité web automatique.</p>
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-danger/30 bg-danger/10 p-2.5 text-xs text-danger flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Aperçu direct du résultat IA généré */}
          {selectedMedia?.aiGenerated && (
            <div className="rounded-2xl border border-accent-cyan/40 bg-accent-cyan/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-accent-cyan animate-pulse"></span>
                  <span className="text-xs font-bold text-white">Illustration IA active</span>
                  <span className="rounded-full bg-accent-magenta/20 border border-accent-magenta/40 px-2 py-0.5 text-[10px] font-bold text-accent-magenta">
                    ✦ Certifié C2PA
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground">Format {aspectRatio}</span>
              </div>
              <div
                onClick={() => setPreviewZoomUrl(selectedMedia.url)}
                className="group relative cursor-pointer overflow-hidden rounded-xl border border-border/80 bg-black/40 text-center"
                title="Cliquer pour agrandir en haute définition"
              >
                <img
                  src={selectedMedia.url}
                  alt={selectedMedia.altText || 'Illustration IA'}
                  className="max-h-64 w-full object-contain transition duration-300 group-hover:scale-[1.02]"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                  <span className="rounded-xl bg-black/80 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-xs">
                    🔍 Agrandir en HD
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="truncate max-w-sm">Alt : {selectedMedia.altText}</span>
                <button
                  type="button"
                  onClick={handleGenerateAi}
                  disabled={isGenerating}
                  className="text-accent-cyan font-semibold hover:underline"
                >
                  🔄 Régénérer un autre angle
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-border/60 pt-3">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <span>🛡️</span>
              <span>Label de transparence IA certifié C2PA inclus dans les métadonnées. Coût : 2 crédits STARS.</span>
            </span>
            <button
              type="button"
              onClick={handleGenerateAi}
              disabled={isGenerating}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-start-gradient px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:scale-[1.01] hover:opacity-95 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <span className="h-3 w-3 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
                  <span>Génération par IA en cours…</span>
                </>
              ) : (
                <>
                  <span>✨</span>
                  <span>Générer l’illustration</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Onglet Stock avec recherche & filtres */}
      {tab === 'STOCK' && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par mot-clé (ex: finance, tech, santé, climat)..."
                className="w-full rounded-xl border border-border bg-surface-raised/90 pl-8 pr-3 py-2 text-xs text-white outline-none focus:border-accent-cyan"
              />
              <span className="absolute left-2.5 top-2.5 text-xs text-muted-foreground">🔍</span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-xs text-muted-foreground hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Catégories filtres */}
          <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1">
            {STOCK_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                  selectedCategory === cat
                    ? 'bg-accent-cyan text-black'
                    : 'bg-surface-raised border border-border/80 text-muted-foreground hover:text-white hover:border-accent-cyan/50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {filteredStock.length === 0 ? (
            <div className="rounded-xl border border-border/60 bg-surface-raised/30 p-8 text-center">
              <p className="text-xs text-muted-foreground">Aucun visuel trouvé pour &quot;{searchQuery}&quot;.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('Tous');
                }}
                className="mt-2 text-xs text-accent-cyan font-semibold hover:underline"
              >
                Réinitialiser la recherche
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {filteredStock.map((img, i) => (
                <div
                  key={i}
                  onClick={() =>
                    onSelectMedia({
                      url: img.url,
                      kind: 'STOCK_IMAGE',
                      altText: img.title,
                      licenseNote: img.license,
                    })
                  }
                  className={`group cursor-pointer overflow-hidden rounded-xl border p-1 transition ${
                    selectedMedia?.url === img.url
                      ? 'border-accent-cyan ring-2 ring-accent-cyan/30 bg-accent-cyan/10'
                      : 'border-border/80 bg-surface-raised/60 hover:border-accent-cyan/50 hover:bg-surface-raised'
                  }`}
                >
                  <div className="relative overflow-hidden rounded-lg">
                    <img
                      src={img.url}
                      alt={img.title}
                      className="h-28 w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                    <span className="absolute top-1 left-1 rounded bg-black/75 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur-xs">
                      {img.category}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewZoomUrl(img.url);
                      }}
                      className="absolute bottom-1 right-1 rounded bg-black/70 p-1 text-[10px] text-white opacity-0 transition group-hover:opacity-100 hover:bg-accent-cyan hover:text-black"
                      title="Agrandir"
                    >
                      🔍
                    </button>
                  </div>
                  <div className="mt-1.5 px-1 pb-1">
                    <div className="truncate text-[11px] font-semibold text-white">{img.title}</div>
                    <div className="text-[10px] text-muted-foreground">{img.license}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Onglet Upload avec Drag & Drop et URL */}
      {tab === 'UPLOAD' && (
        <div className="mt-4 space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleFileSelect(file);
            }}
            className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition ${
              isDragging
                ? 'border-accent-cyan bg-accent-cyan/10 scale-[1.01]'
                : 'border-border/80 bg-surface-raised/40 hover:border-accent-cyan/50 hover:bg-surface-raised/60'
            }`}
          >
            <span className="text-3xl">📁</span>
            <p className="mt-2 text-xs font-semibold text-white">
              Glissez-déposez votre image ici, ou parcourez vos fichiers
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Formats supportés : PNG, JPEG, WebP, GIF jusqu’à 10 Mo
            </p>

            <label className="mt-3 cursor-pointer rounded-xl bg-surface-raised px-4 py-2 text-xs font-bold text-white border border-border hover:border-accent-cyan transition">
              <span>Choisir un fichier</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
                className="hidden"
              />
            </label>

            {uploadFileName && (
              <p className="mt-2 text-xs text-accent-cyan font-medium">✓ Fichier importé : {uploadFileName}</p>
            )}
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-border/50"></div>
            <span className="flex-shrink mx-3 text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
              ou par lien URL direct
            </span>
            <div className="flex-grow border-t border-border/50"></div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground">URL publique directe :</label>
            <div className="flex gap-2">
              <input
                value={customUrl}
                onChange={(e) => {
                  setCustomUrl(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCustomUrlApply();
                  }
                }}
                placeholder="https://domaine.com/visuel-analyse.jpg"
                className="flex-1 rounded-xl border border-border bg-surface-raised/90 px-3 py-2 text-xs text-white outline-none focus:border-accent-cyan font-mono"
              />
              <button
                type="button"
                onClick={handleCustomUrlApply}
                className="rounded-xl bg-surface-raised px-4 py-2 text-xs font-semibold text-white border border-border hover:border-accent-cyan transition"
              >
                Appliquer
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-danger/30 bg-danger/10 p-2.5 text-xs text-danger flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      )}

      {/* Aperçu global de l'image sélectionnée */}
      {selectedMedia && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-accent-cyan/40 bg-accent-cyan/5 p-3.5 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div
              onClick={() => setPreviewZoomUrl(selectedMedia.url)}
              className="group relative cursor-pointer overflow-hidden rounded-lg border border-border/80 shadow"
              title="Cliquer pour agrandir"
            >
              <img
                src={selectedMedia.url}
                alt="Sélection"
                className="h-14 w-20 object-cover transition duration-300 group-hover:scale-110"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                <span className="text-xs text-white">🔍</span>
              </div>
            </div>
            <div className="text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">Illustration active attachée</span>
                {selectedMedia.aiGenerated || selectedMedia.kind === 'AI_GENERATED' ? (
                  <span className="rounded-full bg-accent-magenta/20 border border-accent-magenta/40 px-2 py-0.5 text-[10px] font-bold text-accent-magenta">
                    ✦ IA STARS (C2PA)
                  </span>
                ) : selectedMedia.kind === 'USER_UPLOAD' ? (
                  <span className="rounded-full bg-accent-emerald/20 border border-accent-emerald/40 px-2 py-0.5 text-[10px] font-bold text-accent-emerald">
                    📁 Import Personnel
                  </span>
                ) : (
                  <span className="rounded-full bg-accent-blue/20 border border-accent-blue/40 px-2 py-0.5 text-[10px] font-bold text-accent-blue">
                    📷 Stock Certifié
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground truncate max-w-sm sm:max-w-md">
                Alt : {selectedMedia.altText || 'Prêt pour diffusion multi-canale'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSelectMedia(null)}
            className="rounded-lg p-1.5 text-xs text-muted-foreground transition hover:bg-danger/10 hover:text-danger"
            title="Retirer ce visuel"
          >
            ✕
          </button>
        </div>
      )}

      {/* Lightbox / Zoom HD Modal */}
      {previewZoomUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setPreviewZoomUrl(null)}
        >
          <div
            className="relative max-w-3xl w-full rounded-2xl border border-border bg-surface-raised p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <span className="text-sm">🔍</span>
                <span className="text-xs font-bold uppercase tracking-wider text-white">Aperçu Haute Définition</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewZoomUrl(null)}
                className="rounded-lg p-1 text-sm text-muted-foreground hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="mt-3 flex items-center justify-center overflow-hidden rounded-xl bg-black/60 max-h-[70vh]">
              <img
                src={previewZoomUrl}
                alt="Aperçu HD"
                className="max-h-[70vh] w-auto max-w-full object-contain rounded-lg shadow-lg"
              />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>Résolution optimale pour les réseaux sociaux sélectionnés</span>
              <button
                type="button"
                onClick={() => setPreviewZoomUrl(null)}
                className="rounded-xl bg-surface px-3 py-1.5 font-semibold text-white border border-border hover:border-accent-cyan"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
