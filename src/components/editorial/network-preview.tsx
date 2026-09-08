/* eslint-disable @next/next/no-img-element */
'use client';

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
  const xCharCount = content.length;
  const isXOverLimit = xCharCount > 280;

  if (network === 'LINKEDIN') {
    return (
      <div className="overflow-hidden rounded-2xl border border-border bg-[#1b1f23] text-[#e1e4e8] shadow-md">
        {/* Header LinkedIn */}
        <div className="flex items-center justify-between border-b border-[#2d333b] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-accent-cyan to-accent-blue font-bold text-white">
              {authorName.charAt(0)}
            </div>
            <div>
              <div className="text-sm font-semibold text-white">{authorName}</div>
              <div className="text-xs text-muted-foreground">{orgName} · Dirigeant & Analyste</div>
              <div className="text-[11px] text-muted-foreground">À l&apos;instant · 🌐</div>
            </div>
          </div>
          <span className="rounded-full bg-[#2d333b] px-2 py-0.5 text-xs text-accent-cyan font-medium">LinkedIn</span>
        </div>

        {/* Corps LinkedIn */}
        <div className="p-4 text-sm leading-relaxed whitespace-pre-line">
          {content}
        </div>

        {/* Image */}
        {imageUrl && (
          <div className="border-t border-[#2d333b]">
            <img src={imageUrl} alt="Aperçu post" className="max-h-72 w-full object-cover" />
          </div>
        )}

        {/* Barre réactions */}
        <div className="flex items-center justify-between border-t border-[#2d333b] px-4 py-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span>👍 💡 ❤️</span>
            <span>42 réactions</span>
          </div>
          <div>8 commentaires · 4 partages</div>
        </div>

        <div className="grid grid-cols-4 border-t border-[#2d333b] py-1 text-center text-xs font-medium text-muted-foreground">
          <button type="button" className="py-2 hover:bg-[#2d333b] rounded">👍 J’aime</button>
          <button type="button" className="py-2 hover:bg-[#2d333b] rounded">💬 Commenter</button>
          <button type="button" className="py-2 hover:bg-[#2d333b] rounded">🔄 Republier</button>
          <button type="button" className="py-2 hover:bg-[#2d333b] rounded">📤 Envoyer</button>
        </div>
      </div>
    );
  }

  if (network === 'INSTAGRAM') {
    return (
      <div className="overflow-hidden rounded-2xl border border-border bg-[#121212] text-white shadow-md">
        {/* Header Instagram */}
        <div className="flex items-center justify-between border-b border-[#262626] p-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] p-[2px]">
              <div className="flex h-full w-full items-center justify-center rounded-full bg-black text-xs font-bold">
                {orgName.charAt(0)}
              </div>
            </div>
            <span className="text-xs font-semibold">{orgName.toLowerCase().replace(/\s+/g, '_')}</span>
          </div>
          <span className="text-xs text-muted-foreground">Instagram</span>
        </div>

        {/* Visuel Instagram */}
        <div className="flex aspect-square w-full items-center justify-center bg-[#1a1a1a] text-center">
          {imageUrl ? (
            <img src={imageUrl} alt="Instagram visual" className="h-full w-full object-cover" />
          ) : (
            <div className="p-6 text-xs text-muted-foreground">
              [Visuel 1:1 recommandé pour Instagram — Choisissez ou générez une illustration ci-dessous]
            </div>
          )}
        </div>

        {/* Actions Instagram */}
        <div className="p-3">
          <div className="flex items-center justify-between text-lg">
            <div className="flex items-center gap-3">
              <span>❤️</span>
              <span>💬</span>
              <span>↗️</span>
            </div>
            <span>🔖</span>
          </div>
          <div className="mt-2 text-xs font-semibold">128 J’aime</div>
          <div className="mt-1 text-xs leading-relaxed whitespace-pre-line text-[#e0e0e0]">
            <span className="font-semibold text-white">{orgName.toLowerCase().replace(/\s+/g, '_')} </span>
            {content}
          </div>
        </div>
      </div>
    );
  }

  if (network === 'X') {
    return (
      <div className="overflow-hidden rounded-2xl border border-border bg-black text-white shadow-md p-4">
        {/* Header X */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-raised font-bold text-white">
              {authorName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-1 text-sm font-bold">
                {authorName}
                <span className="text-accent-cyan">✓</span>
              </div>
              <div className="text-xs text-muted-foreground">@{orgName.toLowerCase().replace(/\s+/g, '')}</div>
            </div>
          </div>
          <span className="text-sm font-bold text-muted-foreground">𝕏</span>
        </div>

        {/* Corps X */}
        <div className="mt-3 text-sm leading-relaxed whitespace-pre-line">
          {content}
        </div>

        {/* Visuel si présent */}
        {imageUrl && (
          <div className="mt-3 overflow-hidden rounded-xl border border-border">
            <img src={imageUrl} alt="Visuel X" className="max-h-64 w-full object-cover" />
          </div>
        )}

        {/* Compteur de caractères */}
        <div className="mt-4 flex items-center justify-between border-t border-[#2f3336] pt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>💬 12</span>
            <span>🔄 28</span>
            <span>❤️ 95</span>
            <span>📊 1.4k</span>
          </div>
          <span className={`font-mono text-xs font-semibold ${isXOverLimit ? 'text-danger' : 'text-accent-cyan'}`}>
            {xCharCount} / 280 {isXOverLimit && '(Fil / Thread requis)'}
          </span>
        </div>
      </div>
    );
  }

  // FACEBOOK
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-[#242526] text-[#e4e6eb] shadow-md">
      <div className="flex items-center justify-between border-b border-[#3e4042] p-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-blue font-bold text-white">
            {orgName.charAt(0)}
          </div>
          <div>
            <div className="text-sm font-semibold text-white">{orgName}</div>
            <div className="text-[11px] text-muted-foreground">À l&apos;instant · 🌐 Public</div>
          </div>
        </div>
        <span className="text-xs font-bold text-[#1877f2]">Facebook</span>
      </div>

      <div className="p-4 text-sm leading-relaxed whitespace-pre-line">
        {content}
      </div>

      {imageUrl && (
        <div className="border-t border-[#3e4042]">
          <img src={imageUrl} alt="Aperçu Facebook" className="max-h-72 w-full object-cover" />
        </div>
      )}

      <div className="flex items-center justify-between border-t border-[#3e4042] px-4 py-2 text-xs text-muted-foreground">
        <span>👍 ❤️ 24</span>
        <span>7 commentaires · 2 partages</span>
      </div>

      <div className="grid grid-cols-3 border-t border-[#3e4042] py-1 text-center text-xs font-medium text-muted-foreground">
        <button type="button" className="py-2 hover:bg-[#3a3b3c] rounded">👍 J’aime</button>
        <button type="button" className="py-2 hover:bg-[#3a3b3c] rounded">💬 Commenter</button>
        <button type="button" className="py-2 hover:bg-[#3a3b3c] rounded">↗️ Partager</button>
      </div>
    </div>
  );
}
