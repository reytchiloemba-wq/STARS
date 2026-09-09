/* eslint-disable @next/next/no-img-element */
'use client';

import { useState } from 'react';
import { type SocialNetwork } from '@prisma/client';

export default function NetworkPreview({
  network,
  content,
  imageUrl,
  authorName = 'Alexandre Dupont',
  orgName = 'STARS Intelligence',
}: {
  network: SocialNetwork;
  content: string;
  imageUrl?: string;
  authorName?: string;
  orgName?: string;
}) {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [isExpanded, setIsExpanded] = useState(false);

  const xCharCount = content.length;
  const isXOverLimit = xCharCount > 280;

  // Shorten content for preview if long
  const displayContent = !isExpanded && content.length > 380 && network !== 'X'
    ? content.slice(0, 380) + '...'
    : content;

  return (
    <div className="space-y-3">
      {/* Sélecteur de vue (Desktop vs Mobile) */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Simulateur en direct</span>
          <span>·</span>
          <span className="text-[11px]">Rendu fidèle à l&apos;algorithme</span>
        </div>
        <div className="inline-flex rounded-lg border border-border bg-surface-raised p-0.5 text-[11px]">
          <button
            type="button"
            onClick={() => setViewMode('desktop')}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition ${
              viewMode === 'desktop'
                ? 'bg-surface text-accent-cyan shadow-sm'
                : 'text-muted-foreground hover:text-white'
            }`}
          >
            <span>💻</span>
            <span>Desktop</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('mobile')}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition ${
              viewMode === 'mobile'
                ? 'bg-surface text-accent-cyan shadow-sm'
                : 'text-muted-foreground hover:text-white'
            }`}
          >
            <span>📱</span>
            <span>Mobile</span>
          </button>
        </div>
      </div>

      {/* Conteneur du simulateur */}
      <div className={`transition-all duration-300 ${viewMode === 'mobile' ? 'mx-auto max-w-sm rounded-[2.5rem] border-[8px] border-[#1e232a] bg-black p-1 shadow-2xl ring-1 ring-white/10' : ''}`}>
        
        {/* Encoche Smartphone si mode mobile */}
        {viewMode === 'mobile' && (
          <div className="mb-2 flex items-center justify-between px-6 pt-2 text-[10px] font-semibold text-white/70">
            <span>09:41</span>
            <div className="h-4 w-20 rounded-full bg-[#1e232a]"></div>
            <div className="flex items-center gap-1">
              <span>5G</span>
              <span>100%</span>
            </div>
          </div>
        )}

        {/* LINKEDIN */}
        {network === 'LINKEDIN' && (
          <div className="overflow-hidden rounded-2xl border border-[#2d333b]/80 bg-[#1b1f23] text-[#e1e4e8] shadow-xl">
            {/* Header LinkedIn */}
            <div className="flex items-center justify-between border-b border-[#2d333b]/60 p-4">
              <div className="flex items-center gap-3">
                <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-tr from-[#0A66C2] via-accent-cyan to-accent-blue font-bold text-white shadow-md">
                  {authorName.charAt(0)}
                  <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[#1b1f23] bg-success"></span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-white">{authorName}</span>
                    <span className="text-xs text-[#0A66C2]">🎯 1er</span>
                  </div>
                  <div className="text-xs text-[#8b949e]">{orgName} · Dirigeant & Analyste Stratégique</div>
                  <div className="flex items-center gap-1 text-[11px] text-[#8b949e]">
                    <span>À l&apos;instant</span>
                    <span>·</span>
                    <span>Modifié</span>
                    <span>·</span>
                    <span>🌐</span>
                  </div>
                </div>
              </div>
              <button type="button" className="inline-flex items-center gap-1 rounded-full border border-[#0A66C2] px-3 py-1 text-xs font-bold text-[#0A66C2] transition hover:bg-[#0A66C2]/15">
                <span>+</span>
                <span>Suivre</span>
              </button>
            </div>

            {/* Corps LinkedIn */}
            <div className="p-4 text-[13px] leading-relaxed whitespace-pre-line text-[#d0d7de]">
              {displayContent}
              {!isExpanded && content.length > 380 && (
                <button
                  type="button"
                  onClick={() => setIsExpanded(true)}
                  className="ml-1 font-semibold text-[#58a6ff] hover:underline"
                >
                  ...voir plus
                </button>
              )}
            </div>

            {/* Image */}
            {imageUrl && (
              <div className="border-t border-[#2d333b]/60 bg-[#161b22]">
                <img src={imageUrl} alt="Aperçu post" className="max-h-80 w-full object-cover" />
              </div>
            )}

            {/* Barre réactions */}
            <div className="flex items-center justify-between border-t border-[#2d333b]/60 px-4 py-2.5 text-xs text-[#8b949e]">
              <div className="flex items-center gap-1.5">
                <span className="flex -space-x-1">
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#0A66C2] text-[9px] text-white">👍</span>
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#34D399] text-[9px] text-white">💡</span>
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#F87171] text-[9px] text-white">❤️</span>
                </span>
                <span className="hover:text-[#58a6ff] hover:underline cursor-pointer">48 réactions</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="hover:underline cursor-pointer">12 commentaires</span>
                <span>·</span>
                <span className="hover:underline cursor-pointer">5 partages</span>
              </div>
            </div>

            {/* Boutons d'interaction */}
            <div className="grid grid-cols-4 border-t border-[#2d333b]/60 py-1 text-center text-xs font-semibold text-[#8b949e]">
              <button type="button" className="flex items-center justify-center gap-1.5 py-2 hover:bg-[#2d333b]/60 rounded-lg transition">
                <span>👍</span>
                <span>J’aime</span>
              </button>
              <button type="button" className="flex items-center justify-center gap-1.5 py-2 hover:bg-[#2d333b]/60 rounded-lg transition">
                <span>💬</span>
                <span>Commenter</span>
              </button>
              <button type="button" className="flex items-center justify-center gap-1.5 py-2 hover:bg-[#2d333b]/60 rounded-lg transition">
                <span>🔄</span>
                <span>Republier</span>
              </button>
              <button type="button" className="flex items-center justify-center gap-1.5 py-2 hover:bg-[#2d333b]/60 rounded-lg transition">
                <span>📤</span>
                <span>Envoyer</span>
              </button>
            </div>
          </div>
        )}

        {/* INSTAGRAM */}
        {network === 'INSTAGRAM' && (
          <div className="overflow-hidden rounded-2xl border border-[#262626] bg-black text-white shadow-xl">
            {/* Header Instagram */}
            <div className="flex items-center justify-between border-b border-[#262626] p-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] p-[2px]">
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-black text-xs font-bold text-white">
                    {orgName.charAt(0)}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold tracking-tight">{orgName.toLowerCase().replace(/\s+/g, '_')}</span>
                    <span className="text-[10px] text-[#0095F6]">✓</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">Audio d&apos;origine</span>
                </div>
              </div>
              <button type="button" className="text-muted-foreground hover:text-white">•••</button>
            </div>

            {/* Visuel Instagram */}
            <div className="relative flex aspect-square w-full items-center justify-center bg-[#121212] text-center overflow-hidden">
              {imageUrl ? (
                <img src={imageUrl} alt="Instagram visual" className="h-full w-full object-cover" />
              ) : (
                <div className="p-8 text-xs text-muted-foreground flex flex-col items-center gap-2">
                  <span className="text-3xl">📸</span>
                  <span>Visuel 1:1 recommandé pour Instagram</span>
                  <span className="text-[10px] text-accent-cyan">Choisissez une illustration ci-dessous</span>
                </div>
              )}
            </div>

            {/* Actions Instagram */}
            <div className="p-3.5 space-y-2">
              <div className="flex items-center justify-between text-lg">
                <div className="flex items-center gap-4">
                  <span className="cursor-pointer hover:scale-110 transition">❤️</span>
                  <span className="cursor-pointer hover:scale-110 transition">💬</span>
                  <span className="cursor-pointer hover:scale-110 transition">↗️</span>
                </div>
                <span className="cursor-pointer hover:scale-110 transition">🔖</span>
              </div>
              <div className="text-xs font-bold">142 J’aime</div>
              <div className="text-xs leading-relaxed whitespace-pre-line text-[#f5f5f5]">
                <strong className="text-white mr-1.5">{orgName.toLowerCase().replace(/\s+/g, '_')}</strong>
                {displayContent}
                {!isExpanded && content.length > 380 && (
                  <button
                    type="button"
                    onClick={() => setIsExpanded(true)}
                    className="ml-1 text-muted-foreground hover:text-white"
                  >
                    plus
                  </button>
                )}
              </div>
              <div className="text-[10px] uppercase text-muted-foreground pt-1">Il y a 3 minutes</div>
            </div>
          </div>
        )}

        {/* X (TWITTER) */}
        {network === 'X' && (
          <div className="overflow-hidden rounded-2xl border border-[#2f3336] bg-black text-white shadow-xl p-4">
            {/* Header X */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-surface-raised to-border font-bold text-white shadow-inner">
                  {authorName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-white hover:underline cursor-pointer">{authorName}</span>
                    <span className="inline-flex items-center justify-center h-3.5 w-3.5 rounded-full bg-[#1D9BF0] text-[8px] text-white">✓</span>
                    <span className="text-xs text-[#71767b]">@{orgName.toLowerCase().replace(/\s+/g, '')}</span>
                    <span className="text-xs text-[#71767b]">· 2m</span>
                  </div>
                  <div className="text-[11px] text-[#71767b]">Analyste en intelligence décisionnelle</div>
                </div>
              </div>
              <span className="font-black text-base text-white">𝕏</span>
            </div>

            {/* Corps X */}
            <div className="mt-3 text-[14px] leading-relaxed whitespace-pre-line text-[#e7e9ea]">
              {content}
            </div>

            {/* Visuel si présent */}
            {imageUrl && (
              <div className="mt-3 overflow-hidden rounded-2xl border border-[#2f3336] bg-[#16181c]">
                <img src={imageUrl} alt="Visuel X" className="max-h-72 w-full object-cover" />
              </div>
            )}

            {/* Compteur & Métriques */}
            <div className="mt-4 flex items-center justify-between border-t border-[#2f3336] pt-3 text-xs text-[#71767b]">
              <div className="flex items-center gap-5">
                <span className="flex items-center gap-1.5 hover:text-[#1D9BF0] transition cursor-pointer">
                  <span>💬</span> <span>18</span>
                </span>
                <span className="flex items-center gap-1.5 hover:text-[#00BA7C] transition cursor-pointer">
                  <span>🔄</span> <span>34</span>
                </span>
                <span className="flex items-center gap-1.5 hover:text-[#F91880] transition cursor-pointer">
                  <span>❤️</span> <span>112</span>
                </span>
                <span className="flex items-center gap-1.5 hover:text-[#1D9BF0] transition cursor-pointer">
                  <span>📊</span> <span>2.4k</span>
                </span>
              </div>
              <span className={`font-mono text-xs font-semibold ${isXOverLimit ? 'text-danger animate-pulse' : 'text-accent-cyan'}`}>
                {xCharCount} / 280
              </span>
            </div>
            {isXOverLimit && (
              <div className="mt-2 rounded-lg border border-danger/40 bg-danger/10 px-2.5 py-1 text-[11px] text-danger">
                ⚠️ Dépassement de {xCharCount - 280} caractères. Ce post sera divisé en fil de discussion (Thread) lors de la publication.
              </div>
            )}
          </div>
        )}

        {/* FACEBOOK */}
        {network === 'FACEBOOK' && (
          <div className="overflow-hidden rounded-2xl border border-[#3e4042]/80 bg-[#242526] text-[#e4e6eb] shadow-xl">
            <div className="flex items-center justify-between border-b border-[#3e4042]/60 p-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1877F2] font-bold text-white shadow-md">
                  {orgName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-white">{orgName}</span>
                    <span className="rounded-full bg-[#1877F2]/20 px-1.5 py-0.2 text-[10px] font-bold text-[#1877F2]">Page officielle</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-[#b0b3b8]">
                    <span>À l&apos;instant</span>
                    <span>·</span>
                    <span>🌐 Public</span>
                  </div>
                </div>
              </div>
              <span className="text-base font-bold text-[#1877F2]">f</span>
            </div>

            <div className="p-4 text-[13px] leading-relaxed whitespace-pre-line text-[#e4e6eb]">
              {displayContent}
              {!isExpanded && content.length > 380 && (
                <button
                  type="button"
                  onClick={() => setIsExpanded(true)}
                  className="ml-1 font-semibold text-[#4599FF] hover:underline"
                >
                  ...Afficher la suite
                </button>
              )}
            </div>

            {imageUrl && (
              <div className="border-t border-[#3e4042]/60 bg-[#18191a]">
                <img src={imageUrl} alt="Aperçu Facebook" className="max-h-80 w-full object-cover" />
              </div>
            )}

            <div className="flex items-center justify-between border-t border-[#3e4042]/60 px-4 py-2.5 text-xs text-[#b0b3b8]">
              <span className="flex items-center gap-1">
                <span>👍 ❤️ 36</span>
              </span>
              <div className="flex items-center gap-2">
                <span>11 commentaires</span>
                <span>·</span>
                <span>4 partages</span>
              </div>
            </div>

            <div className="grid grid-cols-3 border-t border-[#3e4042]/60 py-1 text-center text-xs font-semibold text-[#b0b3b8]">
              <button type="button" className="flex items-center justify-center gap-1.5 py-2 hover:bg-[#3a3b3c] rounded-lg transition">
                <span>👍</span>
                <span>J’aime</span>
              </button>
              <button type="button" className="flex items-center justify-center gap-1.5 py-2 hover:bg-[#3a3b3c] rounded-lg transition">
                <span>💬</span>
                <span>Commenter</span>
              </button>
              <button type="button" className="flex items-center justify-center gap-1.5 py-2 hover:bg-[#3a3b3c] rounded-lg transition">
                <span>↗️</span>
                <span>Partager</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
