'use client';

import { useState, useTransition } from 'react';
import type { SocialNetwork, BrandVoice, SocialAccount, Draft } from '@prisma/client';
import { generateVariantsAction, saveDraftAction, publishOrScheduleAction, attachIllustrationAction } from './actions';
import type { PostVariantItem } from '@/server/services/editorial.service';
import NetworkPreview from '@/components/editorial/network-preview';
import IllustrationStudio, { type SelectedMedia } from '@/components/editorial/illustration-studio';

const NETWORKS: { id: SocialNetwork; name: string; icon: string }[] = [
  { id: 'LINKEDIN', name: 'LinkedIn', icon: '💼' },
  { id: 'X', name: 'X / Twitter', icon: '𝕏' },
  { id: 'INSTAGRAM', name: 'Instagram', icon: '📸' },
  { id: 'FACEBOOK', name: 'Facebook', icon: '👥' },
];

const NETWORK_CHAR_LIMITS: Record<SocialNetwork, number> = {
  LINKEDIN: 3000,
  X: 280,
  INSTAGRAM: 2200,
  FACEBOOK: 5000,
};

const OBJECTIVES = [
  'Informer & décrypter',
  'Partager une analyse d’expert',
  'Exprimer une vision de dirigeant',
  'Ouvrir un débat & engager',
  'Alerter sur un risque stratégique',
  'Valoriser une opportunité de marché',
];

const TONES = [
  'Dirigeant & Visionnaire',
  'Expert & Technique',
  'Journalistique & Neutre',
  'Pédagogique & Accessible',
  'Direct & Impactant',
  'Inspirant',
];

export default function StudioClient({
  org,
  brandVoices,
  socialAccounts,
  initialDraft,
  initialTitle = '',
  initialSummary = '',
}: {
  org: string;
  brandVoices: BrandVoice[];
  socialAccounts: SocialAccount[];
  initialDraft: (Draft & { versions?: { content: string; createdAt: Date }[] }) | null;
  initialTitle?: string;
  initialSummary?: string;
}) {
  const [network, setNetwork] = useState<SocialNetwork>(initialDraft?.network ?? 'LINKEDIN');
  const [topicTitle, setTopicTitle] = useState(initialTitle);
  const [summary, setSummary] = useState(initialSummary);
  const [objective, setObjective] = useState(initialDraft?.objective ?? OBJECTIVES[0]);
  const [tone, setTone] = useState(initialDraft?.tone ?? TONES[0]);
  const [selectedBrandVoiceId, setSelectedBrandVoiceId] = useState<string>(
    initialDraft?.brandVoiceId ?? (brandVoices[0]?.id || ''),
  );
  const [includeSources, setIncludeSources] = useState(true);

  const [variants, setVariants] = useState<PostVariantItem[]>([]);
  const [activeVariantLabel, setActiveVariantLabel] = useState<string>('concise');
  const [editedContent, setEditedContent] = useState<string>(initialDraft?.currentContent ?? '');
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia | null>(null);
  const [copied, setCopied] = useState(false);

  const [savedDraftId, setSavedDraftId] = useState<string | null>(initialDraft?.id ?? null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Modal de programmation / publication
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>(
    socialAccounts.filter((a) => a.network === network).map((a) => a.id),
  );
  const [scheduleDate, setScheduleDate] = useState<string>('');

  function handleGenerateVariants() {
    if (!topicTitle.trim()) {
      setStatusMessage({ type: 'error', text: 'Veuillez renseigner le sujet à traiter.' });
      return;
    }
    setStatusMessage(null);
    startTransition(async () => {
      const res = await generateVariantsAction(org, {
        topicTitle,
        summary: summary || topicTitle,
        network,
        objective,
        tone,
        brandVoiceId: selectedBrandVoiceId || undefined,
        includeSources,
        sourceUrls: ['https://stars.app/sources/verified'],
      });

      if (res.ok && res.variants && res.variants.length > 0) {
        setVariants(res.variants);
        const first = res.variants[0];
        if (first) {
          setActiveVariantLabel(first.label);
          setEditedContent(first.content);
        }
        setStatusMessage({ type: 'success', text: '5 variantes générées avec succès.' });
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Erreur lors de la génération des variantes.' });
      }
    });
  }

  function selectVariant(v: PostVariantItem) {
    setActiveVariantLabel(v.label);
    setEditedContent(v.content);
  }

  function handleSaveDraft() {
    if (!editedContent.trim()) return;
    setStatusMessage(null);
    startTransition(async () => {
      const res = await saveDraftAction(org, {
        draftId: savedDraftId || undefined,
        network,
        objective,
        tone,
        brandVoiceId: selectedBrandVoiceId || undefined,
        content: editedContent,
        variantLabel: activeVariantLabel,
      });

      if (res.ok && res.draftId) {
        setSavedDraftId(res.draftId);
        if (selectedMedia) {
          await attachIllustrationAction(org, {
            draftId: res.draftId,
            kind: selectedMedia.kind,
            url: selectedMedia.url,
            altText: selectedMedia.altText,
            aiPrompt: selectedMedia.aiPrompt,
            aiGenerated: selectedMedia.aiGenerated,
          });
        }
        setStatusMessage({ type: 'success', text: 'Brouillon enregistré avec succès.' });
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Erreur lors de la sauvegarde.' });
      }
    });
  }

  function handlePublishOrSchedule() {
    if (!savedDraftId) {
      // Auto-save first
      startTransition(async () => {
        const res = await saveDraftAction(org, {
          network,
          objective,
          tone,
          brandVoiceId: selectedBrandVoiceId || undefined,
          content: editedContent,
          variantLabel: activeVariantLabel,
        });
        if (res.ok && res.draftId) {
          setSavedDraftId(res.draftId);
          completePublish(res.draftId);
        } else {
          setStatusMessage({ type: 'error', text: 'Impossible d’enregistrer le brouillon avant publication.' });
        }
      });
    } else {
      completePublish(savedDraftId);
    }
  }

  function completePublish(draftId: string) {
    startTransition(async () => {
      const res = await publishOrScheduleAction(org, {
        draftId,
        socialAccountIds: selectedAccounts,
        scheduledAt: scheduleDate ? new Date(scheduleDate).toISOString() : undefined,
      });

      if (res.ok) {
        setShowPublishModal(false);
        setStatusMessage({
          type: 'success',
          text: scheduleDate
            ? 'Publication programmée dans le calendrier éditorial !'
            : 'Publication transmise avec succès aux réseaux sélectionnés.',
        });
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Échec de la publication.' });
      }
    });
  }

  return (
    <div className="space-y-8">
      {statusMessage && (
        <div
          className={`rounded-xl border p-4 text-sm font-medium ${
            statusMessage.type === 'success'
              ? 'border-success/40 bg-success/10 text-success'
              : 'border-danger/40 bg-danger/10 text-danger'
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Configuration du Post */}
      <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="text-base font-semibold text-foreground">1. Paramétrage éditorial</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Réseau cible</label>
            <div className="mt-1 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {NETWORKS.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    setNetwork(n.id);
                    setSelectedAccounts(socialAccounts.filter((a) => a.network === n.id).map((a) => a.id));
                  }}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-semibold transition ${
                    network === n.id
                      ? 'border-accent-cyan bg-accent-cyan/10 text-accent-cyan'
                      : 'border-border bg-surface-raised text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span>{n.icon}</span>
                  <span>{n.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Objectif éditorial</label>
            <select
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-surface-raised px-3 py-2.5 text-xs outline-none focus:border-accent-cyan"
            >
              {OBJECTIVES.map((obj) => (
                <option key={obj} value={obj}>
                  {obj}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Tonalité recherchée</label>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-surface-raised px-3 py-2.5 text-xs outline-none focus:border-accent-cyan"
            >
              {TONES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Mémoire Brand Voice</label>
            <select
              value={selectedBrandVoiceId}
              onChange={(e) => setSelectedBrandVoiceId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-surface-raised px-3 py-2.5 text-xs outline-none focus:border-accent-cyan"
            >
              <option value="">Voix standard STARS</option>
              {brandVoices.map((bv) => (
                <option key={bv.id} value={bv.id}>
                  {bv.name} ({bv.sector || 'Général'})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Titre du sujet analysé</label>
            <input
              value={topicTitle}
              onChange={(e) => setTopicTitle(e.target.value)}
              placeholder="Ex : L'impact de la nouvelle directive sur les emballages"
              className="mt-1 w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-xs outline-none focus:border-accent-cyan"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Synthèse des faits ou notes complémentaires</label>
            <input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Ex : Éléments de contexte issus du dossier ou faits essentiels..."
              className="mt-1 w-full rounded-xl border border-border bg-surface-raised px-3.5 py-2.5 text-xs outline-none focus:border-accent-cyan"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={includeSources}
              onChange={(e) => setIncludeSources(e.target.checked)}
              className="rounded accent-accent-cyan"
            />
            <span>Inclure automatiquement les mentions des sources vérifiées en fin de post</span>
          </label>

          <button
            type="button"
            onClick={handleGenerateVariants}
            disabled={isPending}
            className="rounded-xl bg-start-gradient px-5 py-2.5 text-xs font-semibold text-white shadow-md transition hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? 'Génération des 5 variantes en cours…' : '✨ Générer les 5 variantes pour ' + network}
          </button>
        </div>
      </section>

      {/* Édition & Aperçu en miroir */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Éditeur de post & Variantes (7 colonnes) */}
        <div className="space-y-6 lg:col-span-7">
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground">2. Studio de rédaction & Variantes</h3>
              {savedDraftId && (
                <span className="text-xs text-muted-foreground">
                  Brouillon ID : <span className="font-mono text-accent-cyan">{savedDraftId.slice(0, 8)}</span>
                </span>
              )}
            </div>

            {/* Onglets des 5 variantes */}
            {variants.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5 border-b border-border pb-3">
                {variants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => selectVariant(v)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      activeVariantLabel === v.label
                        ? 'bg-start-gradient text-white shadow'
                        : 'border border-border bg-surface-raised text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            )}

            {/* Zone d'édition */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Texte du post (entièrement modifiable) :</span>
                <div className="flex items-center gap-3">
                  <span className={`font-mono text-xs ${editedContent.length > (NETWORK_CHAR_LIMITS[network] || 3000) ? 'text-danger font-bold' : 'text-muted-foreground'}`}>
                    {editedContent.length} / {NETWORK_CHAR_LIMITS[network] || 3000} car.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (!editedContent) return;
                      navigator.clipboard.writeText(editedContent);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-raised px-2.5 py-0.5 text-[11px] font-semibold text-accent-cyan transition hover:border-accent-cyan"
                  >
                    {copied ? '✓ Copié !' : '📋 Copier'}
                  </button>
                </div>
              </div>
              <textarea
                rows={12}
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                placeholder="Rédigez ou sélectionnez une variante générée ci-dessus..."
                className="mt-1.5 w-full rounded-xl border border-border bg-surface-raised p-4 text-sm leading-relaxed outline-none focus:border-accent-cyan font-sans"
              />
            </div>

            {/* Outils de retouche rapide */}
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setEditedContent((prev) => `⚡ Alerte Décideurs : ${topicTitle}\n\n` + prev.replace(/^.*?\n\n/, ''));
                }}
                className="rounded-lg border border-border px-2.5 py-1 text-muted-foreground hover:text-foreground"
              >
                🔄 Changer l&apos;accroche
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditedContent((prev) => prev.slice(0, Math.floor(prev.length * 0.75)));
                }}
                className="rounded-lg border border-border px-2.5 py-1 text-muted-foreground hover:text-foreground"
              >
                ✂️ Raccourcir de 25%
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditedContent((prev) => prev.replace(/\n\n📌 Sources vérifiées[\s\S]*$/, ''));
                }}
                className="rounded-lg border border-border px-2.5 py-1 text-muted-foreground hover:text-foreground"
              >
                🚫 Retirer les sources
              </button>
            </div>

            {/* Boutons d'action */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isPending || !editedContent.trim()}
                className="rounded-xl border border-border px-4 py-2.5 text-xs font-semibold transition hover:bg-surface-raised disabled:opacity-50"
              >
                💾 Enregistrer le brouillon
              </button>

              <button
                type="button"
                onClick={() => setShowPublishModal(true)}
                disabled={isPending || !editedContent.trim()}
                className="flex items-center gap-1.5 rounded-xl bg-start-gradient px-5 py-2.5 text-xs font-bold text-white shadow transition hover:opacity-90 disabled:opacity-50"
              >
                <span>🚀 Programmer ou Publier</span>
                <span>→</span>
              </button>
            </div>
          </div>

          {/* Studio d'Illustration */}
          <IllustrationStudio onSelectMedia={setSelectedMedia} selectedMedia={selectedMedia} />
        </div>

        {/* Aperçu en direct fidèle au réseau (5 colonnes) */}
        <div className="lg:col-span-5">
          <div className="sticky top-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                📱 Aperçu fidèle en temps réel
              </h3>
              <span className="rounded bg-surface-raised px-2 py-0.5 text-xs font-bold text-accent-cyan">
                {network}
              </span>
            </div>

            <NetworkPreview
              network={network}
              content={editedContent || 'Rédigez ou générez du contenu pour visualiser le rendu final ici...'}
              imageUrl={selectedMedia?.url}
              orgName="STARS Intelligence"
            />

            <div className="rounded-xl border border-border bg-surface p-4 text-xs text-muted-foreground">
              <div className="font-semibold text-foreground">💡 Recommandations STARS pour {network} :</div>
              <ul className="mt-1.5 list-inside list-disc space-y-1">
                {network === 'LINKEDIN' && (
                  <>
                    <li>Saut de ligne après l&apos;accroche pour susciter le clic « voir plus ».</li>
                    <li>Limiter à 3 à 5 hashtags pertinents en fin de post.</li>
                    <li>Conclure par une question ouverte pour alimenter l&apos;algorithme d&apos;engagement.</li>
                  </>
                )}
                {network === 'X' && (
                  <>
                    <li>Rester sous les 280 caractères ou structurer en fil de discussion.</li>
                    <li>Utiliser 1 image forte ou capture de données clés.</li>
                  </>
                )}
                {network === 'INSTAGRAM' && (
                  <>
                    <li>Visuel 1:1 ou 4:5 indispensable.</li>
                    <li>Mettre l&apos;accent sur la narration et les anecdotes concrètes.</li>
                  </>
                )}
                {network === 'FACEBOOK' && (
                  <>
                    <li>Ton conversationnel et contextualisé.</li>
                    <li>Favoriser l&apos;appel au partage d&apos;expérience.</li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Publication & Programmation */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-foreground">Validation & Diffusion multi-réseaux</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Vérifiez les comptes cibles et choisissez entre publication immédiate ou programmation dans le calendrier.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Comptes connectés autorisés ({network}) :
                </label>
                {socialAccounts.length === 0 ? (
                  <div className="mt-1 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
                    Aucun compte social réel connecté pour {network}. En mode démonstration, une publication simulée avec identifiant externe sera enregistrée.
                  </div>
                ) : (
                  <div className="mt-2 space-y-2">
                    {socialAccounts.map((acc) => (
                      <label key={acc.id} className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedAccounts.includes(acc.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAccounts([...selectedAccounts, acc.id]);
                            } else {
                              setSelectedAccounts(selectedAccounts.filter((id) => id !== acc.id));
                            }
                          }}
                          className="rounded accent-accent-cyan"
                        />
                        <span>{acc.displayName} ({acc.network})</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Date et heure de programmation (optionnel) :
                </label>
                <input
                  type="datetime-local"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-surface-raised p-2.5 text-xs text-foreground outline-none focus:border-accent-cyan"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Laissez vide pour publier immédiatement après confirmation.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-surface-raised p-3 text-xs text-muted-foreground">
                <div className="font-semibold text-foreground">Garantie éditoriale STARS :</div>
                <p className="mt-0.5">
                  Aucune publication ne part sans votre accord exprès. Les données et historiques sont tracés et consultables dans l&apos;onglet Publications.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                className="rounded-xl border border-border px-4 py-2 text-xs font-medium hover:bg-surface-raised"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handlePublishOrSchedule}
                disabled={isPending}
                className="rounded-xl bg-start-gradient px-5 py-2 text-xs font-bold text-white shadow hover:opacity-90 disabled:opacity-50"
              >
                {isPending
                  ? 'Traitement en cours…'
                  : scheduleDate
                  ? 'Confirmer la programmation'
                  : 'Confirmer la diffusion immédiate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
