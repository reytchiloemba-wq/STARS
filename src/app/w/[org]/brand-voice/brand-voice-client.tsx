'use client';

import { useState, useTransition } from 'react';
import type { BrandVoice, Brand } from '@prisma/client';
import { createBrandVoiceAction, deleteBrandVoiceAction } from './actions';

export default function BrandVoiceClient({
  org,
  brandVoices: initialVoices,
}: {
  org: string;
  brandVoices: (BrandVoice & { brand: Brand | null })[];
}) {
  const [voices, setVoices] = useState(initialVoices);
  const [showModal, setShowModal] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Form states
  const [name, setName] = useState('');
  const [sector, setSector] = useState('');
  const [audience, setAudience] = useState('');
  const [valuesStr, setValuesStr] = useState('Excellence, Transparence, Innovation');
  const [tone, setTone] = useState('Dirigeant & Visionnaire');
  const [prefVocab, setPrefVocab] = useState('Souveraineté, Efficacité, Création de valeur');
  const [forbiddenTerms, setForbiddenTerms] = useState('Buzzword, Révolutionnaire, Révolution');
  const [boldness, setBoldness] = useState<number>(3);
  const [signature, setSignature] = useState('— L’équipe Stratégie & Innovation');
  const [hashtagsStr, setHashtagsStr] = useState('#IntelligenceÉditoriale #Stratégie #Innovation');
  const [callToAction, setCallToAction] = useState('Et vous, quelle est votre vision sur ce défi ? Partageons nos analyses.');
  const [error, setError] = useState<string | null>(null);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await createBrandVoiceAction(org, {
        name: name.trim(),
        sector: sector.trim() || undefined,
        audience: audience.trim() || undefined,
        values: valuesStr.split(',').map((s) => s.trim()).filter(Boolean),
        tone: tone.trim() || undefined,
        preferredVocabulary: prefVocab.split(',').map((s) => s.trim()).filter(Boolean),
        forbiddenTerms: forbiddenTerms.split(',').map((s) => s.trim()).filter(Boolean),
        boldnessLevel: boldness,
        signature: signature.trim() || undefined,
        hashtags: hashtagsStr.split(' ').map((s) => s.trim()).filter(Boolean),
        callToAction: callToAction.trim() || undefined,
      });

      if (res.ok && res.brandVoice) {
        setVoices([res.brandVoice as unknown as (BrandVoice & { brand: Brand | null }), ...voices]);
        setShowModal(false);
        setName('');
      } else {
        setError(res.error || 'Erreur lors de la création');
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const res = await deleteBrandVoiceAction(org, id);
      if (res.ok) {
        setVoices(voices.filter((v) => v.id !== id));
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="rounded-xl bg-start-gradient px-4 py-2.5 text-xs font-semibold text-white shadow hover:opacity-90"
        >
          + Créer une Brand Voice
        </button>
      </div>

      {voices.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-12 text-center">
          <span className="text-3xl">🎙️</span>
          <h3 className="mt-3 text-base font-semibold text-foreground">Aucune Brand Voice configurée</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Configurez votre première identité éditoriale pour que l’IA s’adapte automatiquement à votre style.
          </p>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="mt-4 rounded-xl bg-start-gradient px-4 py-2 text-xs font-semibold text-white shadow"
          >
            Créer ma première Brand Voice
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {voices.map((v) => (
            <div key={v.id} className="rounded-2xl border border-border bg-surface p-5 shadow-sm space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-foreground">{v.name}</h3>
                  <div className="text-xs text-muted-foreground">{v.sector || 'Secteur non spécifié'}</div>
                </div>
                <span className="rounded-full bg-accent-cyan/10 px-2 py-0.5 text-[11px] font-bold text-accent-cyan">
                  Audace {v.boldnessLevel}/5
                </span>
              </div>

              <div className="text-xs space-y-1 text-muted-foreground">
                <p><span className="font-semibold text-foreground">Ton :</span> {v.tone || 'Neutre'}</p>
                <p><span className="font-semibold text-foreground">Cible :</span> {v.audience || 'Professionnels'}</p>
                {v.preferredVocabulary.length > 0 && (
                  <p className="line-clamp-1">
                    <span className="font-semibold text-foreground">Vocabulaire :</span> {v.preferredVocabulary.join(', ')}
                  </p>
                )}
                {v.forbiddenTerms.length > 0 && (
                  <p className="line-clamp-1 text-danger/80">
                    <span className="font-semibold text-danger">Proscrits :</span> {v.forbiddenTerms.join(', ')}
                  </p>
                )}
                {v.signature && (
                  <p className="italic"><span className="font-semibold text-foreground not-italic">Signature :</span> {v.signature}</p>
                )}
              </div>

              <div className="border-t border-border pt-3 flex justify-between items-center text-xs">
                <span className="text-[11px] text-muted-foreground">
                  {v.hashtags.length} hashtags prédéfinis
                </span>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleDelete(v.id)}
                  className="text-danger hover:underline disabled:opacity-50"
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Création Brand Voice */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-2xl">
            <h3 className="text-base font-bold text-foreground">Nouvelle Brand Voice</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Paramétrez les critères éditoriaux qui guideront toutes les générations de contenu de cette voix.
            </p>

            {error && <p className="mt-3 rounded-lg border border-danger/40 bg-danger/10 p-2 text-xs text-danger">{error}</p>}

            <form onSubmit={handleCreate} className="mt-4 space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Nom de la Brand Voice *</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex : Voix Leadership Corporate"
                  className="mt-1 w-full rounded-xl border border-border bg-surface-raised p-2.5 text-xs outline-none focus:border-accent-cyan"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Secteur d&apos;activité</label>
                  <input
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    placeholder="Ex : FinTech, SaaS, Industrie"
                    className="mt-1 w-full rounded-xl border border-border bg-surface-raised p-2.5 text-xs outline-none focus:border-accent-cyan"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Audience cible</label>
                  <input
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    placeholder="Ex : DSI, Investisseurs, PME"
                    className="mt-1 w-full rounded-xl border border-border bg-surface-raised p-2.5 text-xs outline-none focus:border-accent-cyan"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Tonalité éditoriale</label>
                <input
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  placeholder="Ex : Dirigeant, Pédagogique, Analytique"
                  className="mt-1 w-full rounded-xl border border-border bg-surface-raised p-2.5 text-xs outline-none focus:border-accent-cyan"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Niveau d&apos;audace (1 à 5)</label>
                <div className="mt-1 flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={boldness}
                    onChange={(e) => setBoldness(parseInt(e.target.value))}
                    className="flex-1 accent-accent-cyan"
                  />
                  <span className="font-bold text-xs text-accent-cyan">{boldness} / 5</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Vocabulaire privilégié (séparé par virgules)</label>
                <input
                  value={prefVocab}
                  onChange={(e) => setPrefVocab(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-surface-raised p-2.5 text-xs outline-none focus:border-accent-cyan"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Termes interdits / proscrits (séparé par virgules)</label>
                <input
                  value={forbiddenTerms}
                  onChange={(e) => setForbiddenTerms(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-surface-raised p-2.5 text-xs outline-none focus:border-accent-cyan"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Signature ou appel à l&apos;action standard</label>
                <input
                  value={callToAction}
                  onChange={(e) => setCallToAction(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-surface-raised p-2.5 text-xs outline-none focus:border-accent-cyan"
                />
              </div>

              <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-medium hover:bg-surface-raised"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-start-gradient px-5 py-2 text-xs font-bold text-white shadow hover:opacity-90 disabled:opacity-50"
                >
                  {isPending ? 'Enregistrement…' : 'Enregistrer la Brand Voice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
