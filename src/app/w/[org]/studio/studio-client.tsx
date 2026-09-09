'use client';

import { useState, useTransition } from 'react';
import type { SocialNetwork, BrandVoice, SocialAccount, Draft } from '@prisma/client';
import {
  generateVariantsAction,
  saveDraftAction,
  publishOrScheduleAction,
  attachIllustrationAction,
  type PublishTargetResult,
} from './actions';
import type { PostVariantItem } from '@/server/services/editorial.service';
import NetworkPreview from '@/components/editorial/network-preview';
import IllustrationStudio, { type SelectedMedia } from '@/components/editorial/illustration-studio';

interface NetworkSpec {
  id: SocialNetwork;
  name: string;
  icon: string;
  brandColor: string;
  glowClass: string;
  badgeText: string;
  charLimit: number;
  idealLength: string;
  recommendations: string[];
}

const NETWORKS_SPECS: Record<SocialNetwork, NetworkSpec> = {
  LINKEDIN: {
    id: 'LINKEDIN',
    name: 'LinkedIn',
    icon: '💼',
    brandColor: '#0A66C2',
    glowClass: 'border-[#0A66C2] bg-[#0A66C2]/10 shadow-[0_0_20px_-5px_rgba(10,102,194,0.4)]',
    badgeText: 'Professionnel B2B',
    charLimit: 3000,
    idealLength: '1 200 à 1 800 caractères',
    recommendations: [
      'Accroche percutante en 2 lignes avant le clic « voir plus »',
      '3 à 5 hashtags stratégiques ciblés en fin de prise de parole',
      'Question ouverte finale invitant aux retours d’expérience',
      'Ton expert ou leadership d’opinion recommandé',
    ],
  },
  X: {
    id: 'X',
    name: 'X (Twitter)',
    icon: '𝕏',
    brandColor: '#FFFFFF',
    glowClass: 'border-white/80 bg-white/10 shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]',
    badgeText: 'Viralité & Débat',
    charLimit: 280,
    idealLength: '240 à 275 caractères',
    recommendations: [
      'Formule courte et directe, sans verbiage superflu',
      'Intégration d’une donnée clé ou chiffre choc en début de post',
      'Maximum 1 à 2 hashtags pour maximiser la portée organique',
      'Découpage en thread automatique si dépassement de 280 caractères',
    ],
  },
  INSTAGRAM: {
    id: 'INSTAGRAM',
    name: 'Instagram Pro',
    icon: '📸',
    brandColor: '#E1306C',
    glowClass: 'border-[#E1306C] bg-[#E1306C]/10 shadow-[0_0_20px_-5px_rgba(225,48,108,0.4)]',
    badgeText: 'Visuel & Brand',
    charLimit: 2200,
    idealLength: '800 à 1 400 caractères',
    recommendations: [
      'Visuel 1:1 ou 4:5 haute définition obligatoire',
      'Première phrase captivante visible sous l’image dans le feed',
      'Storytelling humain et leçons d’action concrètes',
      'Espace aéré avec retours à la ligne réguliers',
    ],
  },
  FACEBOOK: {
    id: 'FACEBOOK',
    name: 'Facebook Pages',
    icon: '👥',
    brandColor: '#1877F2',
    glowClass: 'border-[#1877F2] bg-[#1877F2]/10 shadow-[0_0_20px_-5px_rgba(24,119,242,0.4)]',
    badgeText: 'Communauté & Partage',
    charLimit: 5000,
    idealLength: '500 à 1 000 caractères',
    recommendations: [
      'Ton conversationnel, chaleureux et engageant',
      'Contextualisation accessible au plus grand nombre',
      'Appel clair au partage ou à la réaction dans les commentaires',
      'Format média adapté pour maximiser le taux de clics',
    ],
  },
};

const OBJECTIVES = [
  'Informer & Décrypter une tendance',
  'Partager une analyse d’expert exclusive',
  'Exprimer une vision stratégique de dirigeant',
  'Ouvrir un débat & susciter l’engagement',
  'Alerter sur un risque critique de marché',
  'Valoriser une opportunité commerciale majeure',
];

const TONES = [
  'Dirigeant & Visionnaire (Inspirant, sobre, mesuré)',
  'Expert & Technique (Factuel, sourcé, précis)',
  'Journalistique & Neutre (Investigation, rigueur)',
  'Pédagogique & Didactique (Accessible, exemples clairs)',
  'Direct & Impactant (Sans détour, verbes d’action)',
  'Leader d’Opinion (Audacieux, prise de position)',
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
  const [publishResults, setPublishResults] = useState<PublishTargetResult[] | null>(null);
  const [isPending, startTransition] = useTransition();

  // Modal de programmation / publication
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>(
    socialAccounts.filter((a) => a.network === network && a.status === 'ACTIVE').map((a) => a.id),
  );
  const [scheduleDate, setScheduleDate] = useState<string>('');
  const [wantsToSchedule, setWantsToSchedule] = useState(false);
  const [minScheduleDate] = useState(() => new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16));

  const activeSpec = NETWORKS_SPECS[network];
  const charLimit = activeSpec.charLimit;
  const charCount = editedContent.length;
  const isOverLimit = charCount > charLimit;
  const charPercentage = Math.min(100, Math.round((charCount / charLimit) * 100));

  // Nombre de comptes connectés pour le réseau sélectionné
  const connectedForNetwork = socialAccounts.filter((a) => a.network === network && a.status === 'ACTIVE');

  function handleGenerateVariants() {
    if (!topicTitle.trim()) {
      setStatusMessage({ type: 'error', text: 'Veuillez renseigner le sujet à analyser avant de lancer la génération.' });
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
        sourceUrls: ['https://stars-ap.com/sources/verified'],
      });

      if (res.ok && res.variants && res.variants.length > 0) {
        setVariants(res.variants);
        const first = res.variants[0];
        if (first) {
          setActiveVariantLabel(first.label);
          setEditedContent(first.content);
        }
        setStatusMessage({ type: 'success', text: '5 variantes stratégiques calibrées avec succès pour ' + activeSpec.name });
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
        setStatusMessage({ type: 'success', text: 'Brouillon sauvegardé et synchronisé.' });
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Erreur lors de la sauvegarde.' });
      }
    });
  }

  function handlePublishOrSchedule() {
    if (!savedDraftId) {
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
        scheduledAt: wantsToSchedule && scheduleDate ? new Date(scheduleDate).toISOString() : undefined,
      });

      setShowPublishModal(false);
      setPublishResults(res.results ?? null);

      if (res.scheduled) {
        setStatusMessage({ type: 'success', text: 'Publication programmée avec succès dans votre calendrier éditorial !' });
        return;
      }

      const successCount = res.results?.filter((r) => r.success).length ?? 0;
      const totalCount = res.results?.length ?? 0;

      if (res.ok && totalCount > 0 && successCount === totalCount) {
        setStatusMessage({ type: 'success', text: `Diffusion réussie sur ${successCount} compte(s) officiel(s).` });
      } else if (successCount > 0 && successCount < totalCount) {
        setStatusMessage({
          type: 'error',
          text: `Publication partielle : ${successCount}/${totalCount} compte(s) réussi(s). Détails ci-dessous.`,
        });
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Échec de la publication.' });
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Alerte d'état globale */}
      {statusMessage && (
        <div
          className={`flex items-start justify-between gap-3 rounded-2xl border p-4.5 text-xs font-medium shadow-md backdrop-blur-md transition-all ${
            statusMessage.type === 'success'
              ? 'border-success/40 bg-success/15 text-success'
              : 'border-danger/40 bg-danger/15 text-danger'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-current/20 font-bold">
              {statusMessage.type === 'success' ? '✓' : '⚠️'}
            </span>
            <div>
              <p className="font-semibold text-white">{statusMessage.text}</p>
              {publishResults && publishResults.length > 0 && (
                <ul className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                  {publishResults.map((r, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span>{r.success ? '✅' : '❌'}</span>
                      <span className="text-foreground">
                        <strong>{r.network}</strong> — {r.accountName} :{' '}
                        {r.success ? (r.externalPostId ? `ID : ${r.externalPostId}` : 'Programmé') : r.errorMessage}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-muted-foreground hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* ÉTAPE 1 : Cadrage Stratégique & Réseau Cible */}
      <section className="glass-panel rounded-3xl p-6 sm:p-8 shadow-xl border border-border/80 relative overflow-hidden">
        <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-accent-cyan/5 blur-3xl -z-10"></div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-cyan/15 text-xs font-bold text-accent-cyan border border-accent-cyan/30">
              01
            </span>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Cadrage Stratégique & Canal de Diffusion
              </h2>
              <p className="text-xs text-muted-foreground">
                Sélectionnez le réseau cible, la tonalité d’autorité et la mémoire de marque.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground">Comptes liés :</span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${connectedForNetwork.length > 0 ? 'bg-success/15 border border-success/30 text-success' : 'bg-surface-raised border border-border text-muted-foreground'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${connectedForNetwork.length > 0 ? 'bg-success animate-pulse' : 'bg-muted-foreground'}`}></span>
              {connectedForNetwork.length > 0 ? `${connectedForNetwork.length} actif(s)` : 'Mode Simulation'}
            </span>
          </div>
        </div>

        {/* Sélecteur de réseaux 4 colonnes avec styles branded */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(Object.keys(NETWORKS_SPECS) as SocialNetwork[]).map((netId) => {
            const spec = NETWORKS_SPECS[netId];
            const isSelected = network === netId;
            const hasConnected = socialAccounts.some((a) => a.network === netId && a.status === 'ACTIVE');

            return (
              <button
                key={netId}
                type="button"
                onClick={() => {
                  setNetwork(netId);
                  setSelectedAccounts(socialAccounts.filter((a) => a.network === netId && a.status === 'ACTIVE').map((a) => a.id));
                }}
                className={`group relative flex flex-col justify-between rounded-2xl p-4 text-left transition-all duration-200 ${
                  isSelected
                    ? `${spec.glowClass} ring-1 ring-white/20`
                    : 'glass-card border-border/80 bg-surface-raised/40 hover:border-border hover:bg-surface-raised/70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl transition duration-200 group-hover:scale-110">{spec.icon}</span>
                  {hasConnected && (
                    <span className="rounded-full bg-success/20 border border-success/40 px-1.5 py-0.2 text-[9px] font-bold text-success">
                      Lié
                    </span>
                  )}
                </div>

                <div className="mt-4">
                  <div className="text-sm font-bold text-white">{spec.name}</div>
                  <div className="text-[11px] text-muted-foreground">{spec.badgeText}</div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2 text-[10px] text-muted-foreground">
                  <span>Max {spec.charLimit} car.</span>
                  {isSelected && <span className="font-bold text-accent-cyan">● Actif</span>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Formulaire de cadrage du sujet */}
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="text-xs font-bold text-muted-foreground">Objectif de communication</label>
              <select
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-surface-raised/90 px-3 py-2.5 text-xs text-white outline-none transition focus:border-accent-cyan"
              >
                {OBJECTIVES.map((obj) => (
                  <option key={obj} value={obj}>
                    {obj}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground">Posture & Tonalité</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-surface-raised/90 px-3 py-2.5 text-xs text-white outline-none transition focus:border-accent-cyan"
              >
                {TONES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground">Mémoire de Marque (Brand Voice)</label>
              <select
                value={selectedBrandVoiceId}
                onChange={(e) => setSelectedBrandVoiceId(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-surface-raised/90 px-3 py-2.5 text-xs text-white outline-none transition focus:border-accent-cyan"
              >
                <option value="">Voix officielle STARS (Neutre & Haute Précision)</option>
                {brandVoices.map((bv) => (
                  <option key={bv.id} value={bv.id}>
                    {bv.name} ({bv.sector || 'Général'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-bold text-muted-foreground">Sujet ou Angle d&apos;Analyse :</label>
              <input
                value={topicTitle}
                onChange={(e) => setTopicTitle(e.target.value)}
                placeholder="Ex : L'impact de la nouvelle réglementation européenne sur les semi-conducteurs"
                className="mt-1.5 w-full rounded-xl border border-border bg-surface-raised/90 px-3.5 py-2.5 text-xs text-white outline-none transition focus:border-accent-cyan"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground">Notes contextuelles ou Chiffres clés :</label>
              <input
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Ex : Croissance de +14%, risque d'approvisionnement Q3, investissement de 2.4M€..."
                className="mt-1.5 w-full rounded-xl border border-border bg-surface-raised/90 px-3.5 py-2.5 text-xs text-white outline-none transition focus:border-accent-cyan"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-border/60 pt-4">
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeSources}
                onChange={(e) => setIncludeSources(e.target.checked)}
                className="h-4 w-4 rounded border-border bg-surface-raised accent-accent-cyan"
              />
              <span>Citer automatiquement les sources certifiées et horodatées en fin de publication</span>
            </label>

            <button
              type="button"
              onClick={handleGenerateVariants}
              disabled={isPending}
              className="relative inline-flex items-center justify-center gap-2 rounded-xl bg-start-gradient px-6 py-2.5 text-xs font-bold text-white shadow-lg transition hover:scale-[1.01] hover:opacity-95 disabled:opacity-50"
            >
              <span>✨</span>
              <span>{isPending ? 'Génération IA en cours…' : `Générer les 5 variantes pour ${activeSpec.name}`}</span>
            </button>
          </div>
        </div>
      </section>

      {/* ÉTAPE 2 & 3 : Édition & Aperçu en Miroir */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Colonne Gauche : Studio de Rédaction & Illustration (7 colonnes) */}
        <div className="space-y-6 lg:col-span-7">
          {/* Bloc Éditeur */}
          <div className="glass-panel rounded-3xl p-6 sm:p-7 shadow-xl border border-border/80 space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3.5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-violet/15 text-xs font-bold text-accent-violet border border-accent-violet/30">
                  02
                </span>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                    Studio de Rédaction & Multi-Variantes
                  </h3>
                  <p className="text-xs text-muted-foreground">Sélectionnez la variante idéale ou peaufinez le texte librement.</p>
                </div>
              </div>
              {savedDraftId && (
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-raised px-2.5 py-1 text-[11px] font-mono text-accent-cyan">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent-cyan"></span>
                  ID : {savedDraftId.slice(0, 8)}
                </span>
              )}
            </div>

            {/* Onglets des 5 variantes IA */}
            {variants.length > 0 && (
              <div className="space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Variantes stratégiques proposées par STARS :
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {variants.map((v) => {
                    const isCurrent = activeVariantLabel === v.label;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => selectVariant(v)}
                        className={`flex flex-col items-center justify-center rounded-xl p-2.5 text-center text-xs font-semibold transition ${
                          isCurrent
                            ? 'bg-gradient-to-r from-accent-cyan to-accent-blue text-white shadow-md'
                            : 'border border-border/80 bg-surface-raised/60 text-muted-foreground hover:border-border hover:text-white'
                        }`}
                      >
                        <span className="truncate w-full">{v.name}</span>
                        <span className="text-[9px] opacity-75 mt-0.5">{v.content.length} car.</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Zone d'écriture */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white">Contenu du post (entièrement personnalisable) :</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (!editedContent) return;
                      navigator.clipboard.writeText(editedContent);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-raised px-2.5 py-1 text-[11px] font-semibold text-accent-cyan transition hover:border-accent-cyan hover:bg-surface-raised/80"
                  >
                    {copied ? '✓ Copié !' : '📋 Copier'}
                  </button>
                </div>
              </div>

              <textarea
                rows={12}
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                placeholder="Rédigez directement ici ou générez des variantes ci-dessus..."
                className="w-full rounded-2xl border border-border/80 bg-surface-raised/80 p-4 text-sm leading-relaxed text-white outline-none transition focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan/40 font-sans"
              />

              {/* Jauge dynamique de caractères */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground text-[11px]">
                    Recommandé pour {activeSpec.name} : {activeSpec.idealLength}
                  </span>
                  <span className={`font-mono text-xs font-bold ${isOverLimit ? 'text-danger' : 'text-accent-cyan'}`}>
                    {charCount} / {charLimit} caractères {isOverLimit && '(Dépassement)'}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-surface-raised overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isOverLimit
                        ? 'bg-danger'
                        : charPercentage > 85
                        ? 'bg-warning'
                        : 'bg-start-gradient'
                    }`}
                    style={{ width: `${charPercentage}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Outils de retouche rapide */}
            <div className="pt-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Outils de retouche rapide :
              </div>
              <div className="flex flex-wrap gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setEditedContent((prev) => `⚡ Alerte Décideurs : ${topicTitle || 'Analyse Stratégique'}\n\n` + prev.replace(/^.*?\n\n/, ''));
                  }}
                  className="rounded-xl border border-border/80 bg-surface-raised/70 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-accent-cyan/50 hover:text-white"
                >
                  ⚡ Changer l&apos;accroche
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditedContent((prev) => prev.slice(0, Math.floor(prev.length * 0.75)));
                  }}
                  className="rounded-xl border border-border/80 bg-surface-raised/70 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-accent-cyan/50 hover:text-white"
                >
                  ✂️ Condenser (-25%)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditedContent((prev) => prev + '\n\n👉 Et vous, comment votre organisation anticipe-t-elle cette mutation ?');
                  }}
                  className="rounded-xl border border-border/80 bg-surface-raised/70 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-accent-cyan/50 hover:text-white"
                >
                  🚀 Ajouter un Call-to-Action
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditedContent((prev) => prev.replace(/\n\n📌 Sources vérifiées[\s\S]*$/, ''));
                  }}
                  className="rounded-xl border border-border/80 bg-surface-raised/70 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-accent-cyan/50 hover:text-white"
                >
                  🚫 Retirer les sources
                </button>
              </div>
            </div>

            {/* Barre d'action finale */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isPending || !editedContent.trim()}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-xs font-semibold text-muted-foreground transition hover:border-border/80 hover:text-white disabled:opacity-50"
              >
                <span>💾</span>
                <span>Enregistrer le brouillon</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStatusMessage(null);
                  setPublishResults(null);
                  setShowPublishModal(true);
                }}
                disabled={isPending || !editedContent.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-start-gradient px-6 py-2.5 text-xs font-bold text-white shadow-xl transition hover:scale-[1.02] hover:opacity-95 disabled:opacity-50"
              >
                <span>🚀 Programmer ou Diffuser</span>
                <span>→</span>
              </button>
            </div>
          </div>

          {/* ÉTAPE 3 : Studio d'Illustration Intégré */}
          <IllustrationStudio onSelectMedia={setSelectedMedia} selectedMedia={selectedMedia} />
        </div>

        {/* Colonne Droite : Simulateur Miroir Fidèle & Recommandations (5 colonnes) */}
        <div className="lg:col-span-5">
          <div className="sticky top-6 space-y-5">
            {/* Simulateur Réseau */}
            <div className="glass-panel rounded-3xl p-5 shadow-xl border border-border/80 space-y-4">
              <NetworkPreview
                network={network}
                content={editedContent || 'Rédigez ou sélectionnez une variante générée pour visualiser en temps réel le rendu exact sur votre canal...'}
                imageUrl={selectedMedia?.url}
                orgName="STARS Intelligence"
              />
            </div>

            {/* Checklist algorithmique d'excellence */}
            <div className="glass-panel rounded-2xl p-5 shadow-sm border border-border/70 text-xs text-muted-foreground space-y-2.5">
              <div className="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-wider">
                <span>💡</span>
                <span>Optimisation Algorithmique ({activeSpec.name})</span>
              </div>
              <ul className="space-y-1.5 text-[11px] leading-relaxed">
                {activeSpec.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-accent-cyan mt-0.5">✓</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-2 border-t border-border/50 text-[10px] text-muted-foreground flex items-center justify-between">
                <span>Garantie de conformité éditoriale STARS</span>
                <span className="text-success font-semibold">Protégé AES-256</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL DE PUBLICATION & PROGRAMMATION */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-3xl border border-border/80 bg-surface p-7 shadow-2xl space-y-5 relative">
            <div className="flex items-center justify-between border-b border-border/60 pb-3.5">
              <div>
                <h3 className="text-base font-bold text-white">Validation & Diffusion Multi-Réseaux</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Sélectionnez les comptes cibles et confirmez le mode d&apos;envoi.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                className="text-muted-foreground hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Comptes cibles */}
              <div>
                <label className="text-xs font-bold text-white uppercase tracking-wider">
                  Comptes cibles ({activeSpec.name}) :
                </label>
                {connectedForNetwork.length === 0 ? (
                  <div className="mt-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
                    Aucun compte {activeSpec.name} actif connecté. Connectez-en un dans Paramètres → Réseaux sociaux
                    avant de publier.
                  </div>
                ) : (
                  <div className="mt-2 space-y-2">
                    {/* Only accounts for the network this post was written for — a LinkedIn-formatted
                        post (character limit, tone) must never be offered to a Facebook/X/Instagram
                        account by mistake. Each tenant picks among their OWN connected accounts for
                        this network only (already tenant-scoped via the `socialAccounts` prop). */}
                    {connectedForNetwork.map((acc) => (
                      <label
                        key={acc.id}
                        className={`flex items-center justify-between rounded-xl border p-3 text-xs cursor-pointer transition ${
                          selectedAccounts.includes(acc.id)
                            ? 'border-accent-cyan bg-accent-cyan/10 text-white'
                            : 'border-border bg-surface-raised text-muted-foreground hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
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
                            className="h-4 w-4 rounded accent-accent-cyan"
                          />
                          <div>
                            <div className="font-bold text-white">{acc.displayName}</div>
                            <div className="text-[10px] text-muted-foreground">Réseau : {acc.network} · Statut : {acc.status}</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold text-accent-cyan uppercase">{acc.network}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Toggle de programmation */}
              <div className="rounded-2xl border border-border/80 bg-surface-raised p-4 space-y-3">
                <label className="flex cursor-pointer items-center justify-between text-xs font-semibold text-white">
                  <span>Programmer pour plus tard</span>
                  <input
                    type="checkbox"
                    checked={wantsToSchedule}
                    onChange={(e) => {
                      setWantsToSchedule(e.target.checked);
                      if (!e.target.checked) setScheduleDate('');
                    }}
                    className="h-4 w-4 rounded accent-accent-cyan cursor-pointer"
                  />
                </label>

                {wantsToSchedule && (
                  <div className="space-y-2 pt-2 border-t border-border/60">
                    <input
                      type="datetime-local"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      min={minScheduleDate}
                      className="w-full rounded-xl border border-border bg-surface p-2.5 text-xs text-white outline-none focus:border-accent-cyan"
                    />

                    {/* Créneaux suggérés */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="text-[10px] text-muted-foreground py-0.5">Créneaux optimaux :</span>
                      <button
                        type="button"
                        onClick={() => {
                          const tomorrow = new Date();
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          tomorrow.setHours(8, 30, 0, 0);
                          setScheduleDate(tomorrow.toISOString().slice(0, 16));
                        }}
                        className="rounded-lg border border-border bg-surface px-2 py-0.5 text-[10px] text-muted-foreground hover:text-white"
                      >
                        Demain 08:30 (Matinée)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const tomorrow = new Date();
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          tomorrow.setHours(12, 15, 0, 0);
                          setScheduleDate(tomorrow.toISOString().slice(0, 16));
                        }}
                        className="rounded-lg border border-border bg-surface px-2 py-0.5 text-[10px] text-muted-foreground hover:text-white"
                      >
                        Demain 12:15 (Pause déjeuner)
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-border/60 bg-surface-raised/40 p-3 text-[11px] text-muted-foreground">
                🔒 <strong>Contrôle éditorial total</strong> : aucune publication n&apos;est transmise aux réseaux sans votre validation finale. Tout l&apos;historique est conservé pour audit.
              </div>
            </div>

            <div className="flex justify-end gap-2.5 border-t border-border/60 pt-4">
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-surface-raised hover:text-white"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handlePublishOrSchedule}
                disabled={isPending}
                className="rounded-xl bg-start-gradient px-6 py-2 text-xs font-bold text-white shadow-md hover:scale-[1.01] hover:opacity-95 disabled:opacity-50"
              >
                {isPending
                  ? 'Traitement en cours…'
                  : wantsToSchedule && scheduleDate
                  ? 'Confirmer la programmation 📅'
                  : 'Confirmer la diffusion immédiate 🚀'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
