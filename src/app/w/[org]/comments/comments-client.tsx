'use client';

import { useState, useTransition } from 'react';
import type {
  SocialNetwork,
  CommentSentiment,
  CommentCategory,
  CommentPriorityLevel,
  CommentStatus,
  TeamQueue,
} from '@prisma/client';
import {
  listCommentsAction,
  getCommentDetailsAction,
  addInternalNoteAction,
  generateSuggestionsAction,
  transitionStatusAction,
  assignCommentAction,
  convertToOpportunityAction,
  convertToPublicationAction,
  publishCommentReplyAction,
  seedSampleCommentsAction,
  detectCrisisAnomalyAction,
} from './actions';

interface SocialCommentItem {
  id: string;
  organizationId: string;
  socialAccountId?: string | null;
  publicationId?: string | null;
  platform: SocialNetwork;
  externalCommentId: string;
  externalPostId?: string | null;
  authorName: string;
  authorUsername?: string | null;
  authorAvatarUrl?: string | null;
  content: string;
  publishedAt: string | Date;
  sentiment: CommentSentiment;
  category: CommentCategory;
  categoryConfidence: number;
  categoryReason?: string | null;
  priorityScore: number;
  priorityLevel: CommentPriorityLevel;
  priorityFactors?: any;
  status: CommentStatus;
  assignedUserId?: string | null;
  assignedTeam: TeamQueue;
  slaDueAt?: string | Date | null;
  slaBreached: boolean;
  isSensitive: boolean;
  replyContent?: string | null;
  repliedAt?: string | Date | null;
  convertedToType?: string | null;
  convertedTargetId?: string | null;
  postContextSummary?: string | null;
  internalNotes?: any[];
  suggestions?: any[];
  auditLogs?: any[];
  assignedUser?: { id: string; name: string | null; email: string | null; image: string | null } | null;
  socialAccount?: { id: string; accountName: string; network: SocialNetwork; username?: string | null } | null;
  publication?: { id: string; title: string; status: string } | null;
}

const NETWORK_CONFIG: Record<
  SocialNetwork,
  { label: string; icon: string; color: string; border: string; bg: string }
> = {
  LINKEDIN: {
    label: 'LinkedIn',
    icon: '💼',
    color: '#0A66C2',
    border: 'border-[#0A66C2]/40',
    bg: 'bg-[#0A66C2]/10',
  },
  X: {
    label: 'X (Twitter)',
    icon: '𝕏',
    color: '#FFFFFF',
    border: 'border-white/30',
    bg: 'bg-white/10',
  },
  INSTAGRAM: {
    label: 'Instagram',
    icon: '📸',
    color: '#E1306C',
    border: 'border-[#E1306C]/40',
    bg: 'bg-[#E1306C]/10',
  },
  FACEBOOK: {
    label: 'Facebook',
    icon: '👥',
    color: '#1877F2',
    border: 'border-[#1877F2]/40',
    bg: 'bg-[#1877F2]/10',
  },
};

const SENTIMENT_CONFIG: Record<
  CommentSentiment,
  { label: string; badgeClass: string; icon: string }
> = {
  POSITIVE: { label: 'Positif', badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: '🟢' },
  RATHER_POSITIVE: { label: 'Plutôt positif', badgeClass: 'bg-teal-500/15 text-teal-300 border-teal-500/30', icon: '🟢' },
  NEUTRAL: { label: 'Neutre', badgeClass: 'bg-slate-500/15 text-slate-300 border-slate-500/30', icon: '⚪' },
  MIXED: { label: 'Mitigé', badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30', icon: '🟡' },
  RATHER_NEGATIVE: { label: 'Plutôt négatif', badgeClass: 'bg-orange-500/15 text-orange-400 border-orange-500/30', icon: '🟠' },
  NEGATIVE: { label: 'Négatif', badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30', icon: '🔴' },
  UNDETERMINED: { label: 'Indéterminé', badgeClass: 'bg-gray-500/15 text-gray-300 border-gray-500/30', icon: '⚪' },
};

const CATEGORY_LABELS: Record<CommentCategory, string> = {
  QUESTION: '❓ Question',
  INFO_REQUEST: 'ℹ️ Demande d’info',
  COMPLIMENT: '🌟 Compliment',
  TESTIMONIAL: '💬 Témoignage',
  OBJECTION: '⚡ Objection',
  CRITICISM: '⚠️ Critique',
  COMPLAINT: '🚨 Réclamation',
  SUPPORT_REQUEST: '🛠️ Support technique',
  BUYING_INTENT: '💼 Intention d’achat',
  LEAD: '🎯 Lead qualifié',
  PARTNERSHIP: '🤝 Partenariat',
  JOB_APPLICATION: '📄 Candidature',
  MEDIA_REQUEST: '🎙️ Presse / Média',
  SUGGESTION: '💡 Suggestion',
  DEBATE: '🗣️ Débat d’idées',
  DISINFORMATION_RISK: '🛡️ Désinformation',
  SPAM: '🚫 Spam',
  ABUSIVE: '⛔ Abusif',
  THREAT: '⚖️ Menace',
  LEGAL_RISK: '⚖️ Risque juridique',
  REPUTATION_CRISIS: '🔥 Crise / Bad Buzz',
  OTHER: '💬 Autre',
};

const STATUS_LABELS: Record<CommentStatus, { label: string; badgeClass: string }> = {
  NEW: { label: 'Nouveau', badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  ANALYZED: { label: 'Analysé', badgeClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' },
  TO_QUALIFY: { label: 'À qualifier', badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  ASSIGNED: { label: 'Assigné', badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
  REPLY_PREPARING: { label: 'Réponse en cours', badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' },
  VALIDATION_REQUIRED: { label: 'Validation requise', badgeClass: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  READY_TO_REPLY: { label: 'Prêt à publier', badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  REPLIED: { label: 'Répondu', badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
  WAITING_ON_CONTACT: { label: 'En attente contact', badgeClass: 'bg-slate-500/15 text-slate-300 border-slate-500/30' },
  ESCALATED: { label: 'Escaladé', badgeClass: 'bg-rose-500/20 text-rose-400 border-rose-500/40' },
  HIDDEN: { label: 'Masqué', badgeClass: 'bg-neutral-800 text-neutral-400 border-neutral-700' },
  DELETED: { label: 'Supprimé', badgeClass: 'bg-neutral-800 text-neutral-500 border-neutral-700' },
  SPAM: { label: 'Spam', badgeClass: 'bg-rose-900/30 text-rose-300 border-rose-800' },
  NO_REPLY_NEEDED: { label: 'Sans suite', badgeClass: 'bg-gray-800 text-gray-400 border-gray-700' },
  CLOSED: { label: 'Fermé', badgeClass: 'bg-slate-800 text-slate-400 border-slate-700' },
  REOPENED: { label: 'Rouvert', badgeClass: 'bg-amber-600/20 text-amber-300 border-amber-600/40' },
};

export default function CommentsClient({
  orgSlug,
  orgName,
  initialComments,
  initialTotalCount,
  crisisStatus,
  brandVoices,
  teamMembers,
}: {
  orgSlug: string;
  orgName: string;
  initialComments: SocialCommentItem[];
  initialTotalCount: number;
  crisisStatus: { isCrisis: boolean; incident: any; stats: any };
  brandVoices: { id: string; name: string }[];
  teamMembers: { id: string; user: { id: string; name: string | null; email: string | null } }[];
}) {
  const [comments, setComments] = useState<SocialCommentItem[]>(initialComments);
  const [totalCount, setTotalCount] = useState<number>(initialTotalCount);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(
    initialComments.length > 0 && initialComments[0] ? initialComments[0].id : null,
  );
  const [activeInbox, setActiveInbox] = useState<
    'all' | 'unassigned' | 'priority' | 'validation' | 'escalated' | 'closed' | 'spam'
  >('all');
  const [selectedNetwork, setSelectedNetwork] = useState<SocialNetwork | 'ALL'>('ALL');
  const [selectedSentiment, setSelectedSentiment] = useState<CommentSentiment | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [crisisAlert, setCrisisAlert] = useState(crisisStatus);

  // Panneau de droite : États d'édition & suggestions
  const [replyText, setReplyText] = useState('');
  const [internalNoteText, setInternalNoteText] = useState('');
  const [selectedBrandVoiceId, setSelectedBrandVoiceId] = useState<string>(
    brandVoices.length > 0 && brandVoices[0] ? brandVoices[0].id : '',
  );
  const [activeTab, setActiveTab] = useState<'reply' | 'copilot' | 'notes' | 'audit'>('copilot');

  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const selectedComment = comments.find((c) => c.id === selectedCommentId);

  const refreshList = (overrideInbox?: string) => {
    startTransition(async () => {
      const inboxToUse = (overrideInbox || activeInbox) as any;
      const res = await listCommentsAction(orgSlug, {
        inbox: inboxToUse,
        platform: selectedNetwork === 'ALL' ? undefined : selectedNetwork,
        sentiment: selectedSentiment === 'ALL' ? undefined : selectedSentiment,
        search: searchQuery.trim().length > 0 ? searchQuery.trim() : undefined,
      });
      if (res.ok && 'comments' in res && res.comments) {
        setComments(res.comments as any);
        setTotalCount(res.totalCount || 0);
        if (res.comments.length > 0 && (!selectedCommentId || !res.comments.some((c: any) => c.id === selectedCommentId))) {
          setSelectedCommentId(res.comments[0]?.id || null);
        }
      }
    });
  };

  const handleSelectComment = async (commentId: string) => {
    setSelectedCommentId(commentId);
    setReplyText('');
    setInternalNoteText('');
    const res = await getCommentDetailsAction(orgSlug, commentId);
    if (res.ok && res.comment) {
      setComments((prev) => prev.map((c) => (c.id === commentId ? (res.comment as any) : c)));
    }
  };

  const handleGenerateSuggestions = () => {
    if (!selectedCommentId) return;
    startTransition(async () => {
      setFeedback(null);
      const res = await generateSuggestionsAction(orgSlug, selectedCommentId, selectedBrandVoiceId || undefined);
      if (res.ok && res.suggestions) {
        setComments((prev) =>
          prev.map((c) => (c.id === selectedCommentId ? { ...c, suggestions: res.suggestions } : c)),
        );
        setActiveTab('copilot');
        setFeedback({ type: 'success', message: 'Suggestions Brand Voice générées avec succès !' });
      } else {
        setFeedback({ type: 'error', message: res.error || 'Erreur lors de la génération des suggestions' });
      }
    });
  };

  const handleAddNote = () => {
    if (!selectedCommentId || !internalNoteText.trim()) return;
    startTransition(async () => {
      setFeedback(null);
      const res = await addInternalNoteAction(orgSlug, selectedCommentId, internalNoteText.trim());
      if (res.ok && res.note) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === selectedCommentId
              ? { ...c, internalNotes: [res.note, ...(c.internalNotes || [])] }
              : c,
          ),
        );
        setInternalNoteText('');
        setFeedback({ type: 'success', message: 'Note interne confidentielle enregistrée.' });
      } else {
        setFeedback({ type: 'error', message: res.error || 'Erreur lors de l’ajout de la note' });
      }
    });
  };

  const handleTransitionStatus = (newStatus: CommentStatus) => {
    if (!selectedCommentId) return;
    startTransition(async () => {
      setFeedback(null);
      const res = await transitionStatusAction(orgSlug, selectedCommentId, newStatus);
      if (res.ok && res.comment) {
        setComments((prev) =>
          prev.map((c) => (c.id === selectedCommentId ? { ...c, status: newStatus } : c)),
        );
        setFeedback({ type: 'success', message: `Statut mis à jour : ${STATUS_LABELS[newStatus]?.label}` });
      } else {
        setFeedback({ type: 'error', message: res.error || 'Erreur de changement de statut' });
      }
    });
  };

  const handlePublishReply = () => {
    if (!selectedCommentId || !replyText.trim()) return;
    startTransition(async () => {
      setFeedback(null);
      const res = await publishCommentReplyAction(orgSlug, selectedCommentId, replyText.trim());
      if (res.ok && res.comment) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === selectedCommentId
              ? {
                  ...c,
                  status: 'REPLIED',
                  replyContent: replyText.trim(),
                  repliedAt: new Date().toISOString(),
                }
              : c,
          ),
        );
        setFeedback({ type: 'success', message: 'Réponse officielle publiée avec succès !' });
      } else {
        setFeedback({ type: 'error', message: res.error || 'Erreur lors de la publication' });
      }
    });
  };

  const handleConvertToOpportunity = (type: 'LEAD' | 'SUPPORT_TICKET' | 'TASK') => {
    if (!selectedCommentId) return;
    startTransition(async () => {
      setFeedback(null);
      const res = await convertToOpportunityAction(orgSlug, selectedCommentId, type);
      if (res.ok && 'targetId' in res && res.targetId) {
        const targetId = res.targetId;
        setComments((prev) =>
          prev.map((c) =>
            c.id === selectedCommentId
              ? { ...c, convertedToType: type, convertedTargetId: targetId }
              : c,
          ),
        );
        setFeedback({
          type: 'success',
          message: `Opportunité créée avec succès (${type} #${targetId}) !`,
        });
      } else {
        setFeedback({ type: 'error', message: res.error || 'Erreur de conversion' });
      }
    });
  };

  const handleConvertToPublication = () => {
    if (!selectedCommentId) return;
    startTransition(async () => {
      setFeedback(null);
      const res = await convertToPublicationAction(orgSlug, selectedCommentId);
      if (res.ok && 'draft' in res && res.draft) {
        const draft = res.draft;
        setComments((prev) =>
          prev.map((c) =>
            c.id === selectedCommentId
              ? { ...c, convertedToType: 'PUBLICATION', convertedTargetId: draft.id }
              : c,
          ),
        );
        setFeedback({
          type: 'success',
          message: `Idée transformée en brouillon éditorial STARS (#${draft.id}) ! Rendez-vous dans le Studio.`,
        });
      } else {
        setFeedback({ type: 'error', message: res.error || 'Erreur lors de la transformation' });
      }
    });
  };

  const handleAssignTeam = (team: TeamQueue) => {
    if (!selectedCommentId) return;
    startTransition(async () => {
      setFeedback(null);
      const res = await assignCommentAction(orgSlug, selectedCommentId, undefined, team);
      if (res.ok && res.comment) {
        setComments((prev) =>
          prev.map((c) => (c.id === selectedCommentId ? { ...c, assignedTeam: team } : c)),
        );
        setFeedback({ type: 'success', message: `Commentaire assigné à l'équipe ${team}` });
      }
    });
  };

  const handleSeedSamples = () => {
    startTransition(async () => {
      setFeedback(null);
      const res = await seedSampleCommentsAction(orgSlug);
      if (res.ok) {
        setFeedback({ type: 'success', message: `${res.count} commentaires d’exemples importés !` });
        refreshList();
      } else {
        setFeedback({ type: 'error', message: res.error || 'Erreur d’import' });
      }
    });
  };

  return (
    <div className="flex h-[calc(100vh-4.5rem)] flex-col bg-background text-foreground">
      {/* 🚨 CRISIS BANNER (STARS Crisis Radar) */}
      {crisisAlert.isCrisis && (
        <div className="flex items-center justify-between border-b border-rose-500/40 bg-gradient-to-r from-rose-950/80 via-rose-900/60 to-rose-950/80 px-6 py-2.5 shadow-lg shadow-rose-950/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 animate-ping rounded-full bg-rose-500" />
            <div>
              <span className="font-display font-bold text-rose-200">
                🚨 STARS Crisis Radar — Anomalie Réputationnelle Active :
              </span>{' '}
              <span className="text-xs text-rose-300">
                {crisisAlert.incident?.title || 'Pic inhabituel de commentaires négatifs sous surveillance.'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-rose-500/20 px-2.5 py-0.5 text-xs font-semibold text-rose-300 border border-rose-500/30">
              {Math.round((crisisAlert.stats?.negativeRatio || 0) * 100)}% de négativité sur 24h
            </span>
            <button
              onClick={() => {
                setActiveInbox('escalated');
                refreshList('escalated');
              }}
              className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-rose-500"
            >
              Voir la file Escalade
            </button>
          </div>
        </div>
      )}

      {/* FEEDBACK TOAST */}
      {feedback && (
        <div
          className={`flex items-center justify-between px-6 py-2 text-xs font-medium transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-950/70 text-emerald-300 border-b border-emerald-500/30'
              : 'bg-rose-950/70 text-rose-300 border-b border-rose-500/30'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-muted-foreground hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* MAIN 3-PANEL LAYOUT */}
      <div className="flex flex-1 overflow-hidden">
        {/* ========================================================================= */}
        {/* VOLET 1 : NAVIGATION & DOSSIERS INBOX (Gauche) */}
        {/* ========================================================================= */}
        <aside className="w-64 border-r border-border/80 bg-surface/80 p-4 backdrop-blur-md flex flex-col justify-between overflow-y-auto">
          <div className="space-y-6">
            {/* Header Volet 1 */}
            <div>
              <div className="flex items-center justify-between">
                <h2 className="font-display text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Boîte de réception
                </h2>
                <span className="rounded-full bg-accent-cyan/15 px-2 py-0.5 text-[11px] font-semibold text-accent-cyan">
                  {totalCount}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Comment Intelligence Hub</p>
            </div>

            {/* Dossiers / Files de tri */}
            <nav className="space-y-1">
              {[
                { id: 'all', label: 'Tous les messages', icon: '📥' },
                { id: 'unassigned', label: 'Non assignés', icon: '⏳' },
                { id: 'priority', label: 'Priorité Haute & Critique', icon: '⚡' },
                { id: 'validation', label: 'Validation requise', icon: '🛡️' },
                { id: 'escalated', label: 'Escaladés & Juridique', icon: '🚨' },
                { id: 'closed', label: 'Traités & Fermés', icon: '✅' },
                { id: 'spam', label: 'Spam & Abus', icon: '🚫' },
              ].map((inbox) => {
                const isActive = activeInbox === inbox.id;
                return (
                  <button
                    key={inbox.id}
                    onClick={() => {
                      setActiveInbox(inbox.id as any);
                      refreshList(inbox.id);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition ${
                      isActive
                        ? 'bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30 shadow-glow-cyan/20'
                        : 'text-muted-foreground hover:bg-surface-hover hover:text-foreground'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span>{inbox.icon}</span>
                      <span>{inbox.label}</span>
                    </span>
                  </button>
                );
              })}
            </nav>

            {/* Filtre Réseaux Sociaux */}
            <div className="border-t border-border/60 pt-4">
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Canaux Sociaux
              </h3>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => {
                    setSelectedNetwork('ALL');
                    refreshList();
                  }}
                  className={`rounded-lg px-2 py-1.5 text-xs text-center font-medium transition ${
                    selectedNetwork === 'ALL'
                      ? 'bg-white/15 text-white border border-white/30'
                      : 'bg-surface text-muted-foreground hover:bg-surface-hover'
                  }`}
                >
                  Tous
                </button>
                {(['LINKEDIN', 'X', 'INSTAGRAM', 'FACEBOOK'] as SocialNetwork[]).map((net) => {
                  const cfg = NETWORK_CONFIG[net];
                  const isSelected = selectedNetwork === net;
                  return (
                    <button
                      key={net}
                      onClick={() => {
                        setSelectedNetwork(net);
                        refreshList();
                      }}
                      className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition ${
                        isSelected
                          ? `${cfg.bg} text-white border ${cfg.border}`
                          : 'bg-surface text-muted-foreground hover:bg-surface-hover'
                      }`}
                    >
                      <span>{cfg.icon}</span>
                      <span className="truncate">{cfg.label.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filtre Sentiment */}
            <div className="border-t border-border/60 pt-4">
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Tonalité / Sentiment
              </h3>
              <div className="flex flex-wrap gap-1">
                {(['ALL', 'POSITIVE', 'NEUTRAL', 'MIXED', 'NEGATIVE'] as const).map((sent) => {
                  const isSel = selectedSentiment === sent;
                  return (
                    <button
                      key={sent}
                      onClick={() => {
                        setSelectedSentiment(sent as any);
                        refreshList();
                      }}
                      className={`rounded-lg px-2 py-1 text-[11px] font-medium transition ${
                        isSel
                          ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/40'
                          : 'bg-surface text-muted-foreground hover:bg-surface-hover'
                      }`}
                    >
                      {sent === 'ALL' ? 'Tout' : sent === 'POSITIVE' ? '🟢 Positif' : sent === 'NEGATIVE' ? '🔴 Négatif' : sent === 'MIXED' ? '🟡 Mitigé' : '⚪ Neutre'}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bouton d'initialisation de démo si liste vide */}
          <div className="border-t border-border/60 pt-4">
            <button
              onClick={handleSeedSamples}
              disabled={isPending}
              className="w-full rounded-xl border border-dashed border-border/80 bg-surface/50 px-3 py-2 text-xs font-medium text-muted-foreground transition hover:border-accent-cyan/40 hover:text-accent-cyan disabled:opacity-50"
            >
              🔄 Générer des exemples réalistes
            </button>
          </div>
        </aside>

        {/* ========================================================================= */}
        {/* VOLET 2 : LISTE DES COMMENTAIRES (Centre) */}
        {/* ========================================================================= */}
        <section className="w-[380px] lg:w-[420px] flex-shrink-0 border-r border-border/80 bg-background/50 flex flex-col overflow-hidden">
          {/* Barre d'outils Volet 2 */}
          <div className="border-b border-border/80 p-3.5 space-y-2.5">
            <div className="relative">
              <input
                type="text"
                placeholder="Rechercher par auteur, contenu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && refreshList()}
                className="w-full rounded-xl border border-border/80 bg-surface/90 px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-accent-cyan/50 focus:outline-none focus:ring-1 focus:ring-accent-cyan/30"
              />
              <button
                onClick={() => refreshList()}
                className="absolute right-2.5 top-2 text-muted-foreground hover:text-accent-cyan"
              >
                🔍
              </button>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1">
              <span>{comments.length} élément(s) affiché(s)</span>
              <button onClick={() => refreshList()} className="hover:text-accent-cyan transition">
                Rafraîchir ⟳
              </button>
            </div>
          </div>

          {/* Liste défilante des commentaires */}
          <div className="flex-1 overflow-y-auto divide-y divide-border/40 p-2 space-y-1">
            {comments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground px-4">
                <span className="text-3xl mb-2">📬</span>
                <p className="text-xs font-semibold">Aucun commentaire dans cette vue</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Modifiez vos filtres ou générez des données de test via le bouton à gauche.
                </p>
              </div>
            ) : (
              comments.map((comment) => {
                const isSelected = comment.id === selectedCommentId;
                const netCfg = NETWORK_CONFIG[comment.platform];
                const sentCfg = SENTIMENT_CONFIG[comment.sentiment] || SENTIMENT_CONFIG.NEUTRAL;
                const statusCfg = STATUS_LABELS[comment.status] || STATUS_LABELS.NEW;

                return (
                  <div
                    key={comment.id}
                    onClick={() => handleSelectComment(comment.id)}
                    className={`cursor-pointer rounded-xl p-3 transition border ${
                      isSelected
                        ? 'border-accent-cyan/50 bg-accent-cyan/10 shadow-lg shadow-accent-cyan/5'
                        : 'border-transparent hover:border-border/60 hover:bg-surface/60'
                    }`}
                  >
                    {/* Header Carte : Auteur + Réseau + Score Priorité */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {comment.authorAvatarUrl ? (
                          <img
                            src={comment.authorAvatarUrl}
                            alt={comment.authorName}
                            className="h-7 w-7 rounded-full object-cover border border-border"
                          />
                        ) : (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-hover text-xs font-bold text-foreground">
                            {comment.authorName.charAt(0)}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-white truncate max-w-[140px]">
                              {comment.authorName}
                            </span>
                            <span
                              className={`rounded px-1 text-[10px] font-bold ${netCfg.bg} border ${netCfg.border}`}
                            >
                              {netCfg.icon}
                            </span>
                          </div>
                          {comment.authorUsername && (
                            <span className="text-[10px] text-muted-foreground truncate block max-w-[140px]">
                              @{comment.authorUsername}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Badge Score de Priorité (0-100) */}
                      <div className="flex flex-col items-end">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                            comment.priorityScore >= 80
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : comment.priorityScore >= 60
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-slate-500/20 text-slate-300 border-slate-500/40'
                          }`}
                        >
                          Score : {comment.priorityScore}
                        </span>
                        {/* SLA Badge */}
                        {comment.slaBreached ? (
                          <span className="mt-1 text-[9px] font-bold text-rose-400">
                            ⚠️ SLA dépassé
                          </span>
                        ) : (
                          <span className="mt-1 text-[9px] text-muted-foreground">
                            {comment.priorityLevel}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Extrait du contenu */}
                    <p className="mt-2 line-clamp-2 text-xs text-foreground/90 leading-relaxed">
                      {comment.content}
                    </p>

                    {/* Tags : Sentiment, Catégorie, Statut */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${sentCfg.badgeClass}`}
                      >
                        {sentCfg.icon} {sentCfg.label}
                      </span>
                      <span className="rounded-md border border-border/80 bg-surface/80 px-1.5 py-0.5 text-[10px] text-muted-foreground font-medium">
                        {CATEGORY_LABELS[comment.category] || comment.category}
                      </span>
                      <span
                        className={`rounded-md border px-1.5 py-0.5 text-[10px] font-medium ml-auto ${statusCfg.badgeClass}`}
                      >
                        {statusCfg.label}
                      </span>
                    </div>

                    {/* Alerte Sensible */}
                    {comment.isSensitive && (
                      <div className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-rose-400">
                        <span>🔒 Sujet sensible détecté — Auto-réponse bloquée</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* ========================================================================= */}
        {/* VOLET 3 : FIL DE CONVERSATION, GOUVERNANCE & COPILOT (Droite) */}
        {/* ========================================================================= */}
        <main className="flex-1 flex flex-col bg-surface/30 overflow-y-auto">
          {selectedComment ? (
            <div className="flex-1 flex flex-col p-6 space-y-6 max-w-5xl mx-auto w-full">
              {/* Header Commentaire Sélectionné */}
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/80 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">
                      {NETWORK_CONFIG[selectedComment.platform].icon}
                    </span>
                    <h1 className="font-display text-lg font-bold text-white">
                      {selectedComment.authorName}
                    </h1>
                    {selectedComment.authorUsername && (
                      <span className="text-xs text-muted-foreground">
                        (@{selectedComment.authorUsername})
                      </span>
                    )}
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                        STATUS_LABELS[selectedComment.status]?.badgeClass
                      }`}
                    >
                      {STATUS_LABELS[selectedComment.status]?.label}
                    </span>
                  </div>

                  {/* Contexte du Post Parent */}
                  {selectedComment.postContextSummary && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground bg-surface/70 border border-border/60 rounded-lg px-3 py-1.5">
                      <span>📌 Sur la publication :</span>
                      <span className="font-medium text-foreground italic">
                        {selectedComment.postContextSummary}
                      </span>
                    </div>
                  )}
                </div>

                {/* Sélecteur d'équipe & Statut rapide */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Assigner équipe */}
                  <select
                    value={selectedComment.assignedTeam}
                    onChange={(e) => handleAssignTeam(e.target.value as TeamQueue)}
                    className="rounded-xl border border-border/80 bg-surface px-3 py-1.5 text-xs text-foreground focus:outline-none"
                  >
                    <option value="COMMUNITY">👥 Community</option>
                    <option value="SUPPORT">🛠️ Support</option>
                    <option value="SALES">💼 Sales</option>
                    <option value="LEGAL">⚖️ Juridique</option>
                    <option value="PR">🎙️ RP / Presse</option>
                    <option value="CRISIS">🚨 Cellule Crise</option>
                  </select>

                  {/* Marquer statut */}
                  <select
                    value={selectedComment.status}
                    onChange={(e) => handleTransitionStatus(e.target.value as CommentStatus)}
                    className="rounded-xl border border-border/80 bg-surface px-3 py-1.5 text-xs text-foreground focus:outline-none"
                  >
                    {Object.entries(STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>

                  {/* Actions de transformation stratégique */}
                  <button
                    onClick={() => handleConvertToOpportunity('LEAD')}
                    disabled={isPending || !!selectedComment.convertedToType}
                    className="flex items-center gap-1.5 rounded-xl border border-accent-cyan/40 bg-accent-cyan/10 px-3 py-1.5 text-xs font-semibold text-accent-cyan hover:bg-accent-cyan/20 transition disabled:opacity-50"
                  >
                    💼 Créer Lead CRM
                  </button>

                  <button
                    onClick={handleConvertToPublication}
                    disabled={isPending || selectedComment.convertedToType === 'PUBLICATION'}
                    className="flex items-center gap-1.5 rounded-xl border border-purple-500/40 bg-purple-500/10 px-3 py-1.5 text-xs font-semibold text-purple-300 hover:bg-purple-500/20 transition disabled:opacity-50"
                  >
                    💡 Créer Post Studio
                  </button>
                </div>
              </div>

              {/* Message de conversion si existant */}
              {selectedComment.convertedToType && (
                <div className="flex items-center gap-2 rounded-xl border border-accent-cyan/30 bg-accent-cyan/10 px-4 py-2.5 text-xs text-accent-cyan">
                  <span>✨ Converti avec succès :</span>
                  <span className="font-semibold">
                    {selectedComment.convertedToType} (#{selectedComment.convertedTargetId})
                  </span>
                </div>
              )}

              {/* Contenu principal du commentaire */}
              <div className="rounded-2xl border border-border/80 bg-surface/60 p-5 backdrop-blur-md shadow-sm">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                  <span className="font-medium text-foreground">Message public reçu</span>
                  <span>
                    Publié le {new Date(selectedComment.publishedAt).toLocaleString('fr-FR')}
                  </span>
                </div>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap font-sans">
                  {selectedComment.content}
                </p>

                {/* Baromètre Sémantique & NLP */}
                <div className="mt-4 pt-4 border-t border-border/60 flex flex-wrap items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Sentiment :</span>
                    <span className="font-semibold text-white">
                      {SENTIMENT_CONFIG[selectedComment.sentiment]?.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Catégorie :</span>
                    <span className="font-semibold text-white">
                      {CATEGORY_LABELS[selectedComment.category] || selectedComment.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Priorité :</span>
                    <span className="font-bold text-accent-cyan">
                      {selectedComment.priorityScore}/100 ({selectedComment.priorityLevel})
                    </span>
                  </div>
                  {selectedComment.categoryReason && (
                    <div className="w-full mt-1 text-[11px] text-muted-foreground italic">
                      💡 Diagnostic IA : {selectedComment.categoryReason}
                    </div>
                  )}
                </div>
              </div>

              {/* ALERTE STRICTE DE SÉCURITÉ / SUJETS SENSIBLES */}
              {selectedComment.isSensitive && (
                <div className="rounded-2xl border border-rose-500/50 bg-rose-950/40 p-4 text-xs text-rose-200 shadow-md">
                  <div className="flex items-center gap-2 font-bold text-sm text-rose-300">
                    <span>🛡️ Gouvernance des Sujets Sensibles & Risques Juridiques</span>
                  </div>
                  <p className="mt-1 leading-relaxed">
                    Ce commentaire touche à des aspects sensibles (mise en cause, risque juridique, plainte ou crise réputationnelle).
                    Toute réponse automatisée directe est verrouillée. L’arbitrage humain par la direction juridique ou de la communication est impératif.
                  </p>
                </div>
              )}

              {/* Réponse déjà envoyée si existante */}
              {selectedComment.replyContent && (
                <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-4 text-xs text-emerald-200">
                  <div className="flex items-center justify-between font-bold text-sm text-emerald-300 mb-2">
                    <span>✅ Réponse officielle envoyée</span>
                    {selectedComment.repliedAt && (
                      <span className="text-[11px] font-normal text-muted-foreground">
                        le {new Date(selectedComment.repliedAt).toLocaleString('fr-FR')}
                      </span>
                    )}
                  </div>
                  <p className="text-foreground whitespace-pre-wrap">
                    {selectedComment.replyContent}
                  </p>
                </div>
              )}

              {/* ONGLETS INTERACTIFS (Copilot / Éditeur de réponse / Notes internes / Audit) */}
              <div className="space-y-4">
                <div className="flex border-b border-border/80">
                  <button
                    onClick={() => setActiveTab('copilot')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
                      activeTab === 'copilot'
                        ? 'border-accent-cyan text-accent-cyan'
                        : 'border-transparent text-muted-foreground hover:text-white'
                    }`}
                  >
                    <span>✨ STARS Response Copilot</span>
                    {selectedComment.suggestions && selectedComment.suggestions.length > 0 && (
                      <span className="rounded-full bg-accent-cyan/20 px-1.5 py-0.2 text-[10px]">
                        {selectedComment.suggestions.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setActiveTab('reply')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
                      activeTab === 'reply'
                        ? 'border-accent-cyan text-accent-cyan'
                        : 'border-transparent text-muted-foreground hover:text-white'
                    }`}
                  >
                    <span>✍️ Rédiger & Publier</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('notes')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
                      activeTab === 'notes'
                        ? 'border-accent-cyan text-accent-cyan'
                        : 'border-transparent text-muted-foreground hover:text-white'
                    }`}
                  >
                    <span>🔒 Notes Internes Sécurisées</span>
                    {selectedComment.internalNotes && selectedComment.internalNotes.length > 0 && (
                      <span className="rounded-full bg-purple-500/20 text-purple-300 px-1.5 py-0.2 text-[10px]">
                        {selectedComment.internalNotes.length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setActiveTab('audit')}
                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition ${
                      activeTab === 'audit'
                        ? 'border-accent-cyan text-accent-cyan'
                        : 'border-transparent text-muted-foreground hover:text-white'
                    }`}
                  >
                    <span>📜 Historique & Audit</span>
                  </button>
                </div>

                {/* ONGLET 1 : STARS RESPONSE COPILOT */}
                {activeTab === 'copilot' && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-surface/70 border border-border/60 rounded-xl p-3.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Brand Voice :</span>
                        <select
                          value={selectedBrandVoiceId}
                          onChange={(e) => setSelectedBrandVoiceId(e.target.value)}
                          className="rounded-lg border border-border/80 bg-background px-2.5 py-1 text-xs text-foreground focus:outline-none"
                        >
                          {brandVoices.map((bv) => (
                            <option key={bv.id} value={bv.id}>
                              {bv.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        onClick={handleGenerateSuggestions}
                        disabled={isPending}
                        className="flex items-center gap-2 rounded-xl bg-start-gradient px-4 py-1.5 text-xs font-bold text-white shadow-glow-cyan/40 hover:opacity-90 transition disabled:opacity-50"
                      >
                        <span>🪄 Générer 5 variantes Brand Voice</span>
                      </button>
                    </div>

                    {/* Liste des suggestions générées */}
                    {selectedComment.suggestions && selectedComment.suggestions.length > 0 ? (
                      <div className="grid grid-cols-1 gap-3">
                        {selectedComment.suggestions.map((sug: any) => (
                          <div
                            key={sug.id}
                            className="rounded-xl border border-border/80 bg-surface/80 p-4 transition hover:border-accent-cyan/40"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-bold text-accent-cyan">{sug.label}</span>
                              {sug.tone && (
                                <span className="text-[10px] text-muted-foreground italic">
                                  Ton : {sug.tone}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap mb-3">
                              {sug.suggestedReply}
                            </p>
                            <button
                              onClick={() => {
                                setReplyText(sug.suggestedReply);
                                setActiveTab('reply');
                              }}
                              className="rounded-lg bg-surface-hover border border-border px-3 py-1 text-xs font-medium text-white hover:border-accent-cyan/50 hover:text-accent-cyan transition"
                            >
                              Utiliser cette réponse ➔
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-border/80 p-8 text-center text-muted-foreground">
                        <p className="text-xs">
                          Aucune suggestion active pour l’instant. Cliquez sur « Générer 5 variantes Brand Voice » pour obtenir des propositions adaptées.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* ONGLET 2 : RÉDACTEUR & PUBLICATION */}
                {activeTab === 'reply' && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-border/80 bg-surface/80 p-4">
                      <div className="flex items-center justify-between mb-2 text-xs">
                        <span className="font-semibold text-white">
                          Réponse officielle sur {NETWORK_CONFIG[selectedComment.platform].label}
                        </span>
                        <span className="text-muted-foreground">
                          {replyText.length} caractères
                        </span>
                      </div>
                      <textarea
                        rows={4}
                        placeholder={`Rédigez votre réponse à ${selectedComment.authorName}...`}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="w-full rounded-xl border border-border/80 bg-background/80 p-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-accent-cyan/50 focus:outline-none"
                      />
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleTransitionStatus('VALIDATION_REQUIRED')}
                            disabled={isPending}
                            className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 px-3 py-1.5 text-xs font-medium text-yellow-300 hover:bg-yellow-500/20 transition"
                          >
                            🛡️ Soumettre pour validation
                          </button>
                          <button
                            onClick={() => handleTransitionStatus('CLOSED')}
                            disabled={isPending}
                            className="rounded-xl border border-slate-700 bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-white transition"
                          >
                            ✅ Clôturer sans réponse
                          </button>
                        </div>

                        <button
                          onClick={handlePublishReply}
                          disabled={isPending || !replyText.trim() || selectedComment.isSensitive}
                          className="flex items-center gap-2 rounded-xl bg-start-gradient px-5 py-2 text-xs font-bold text-white shadow-glow-cyan/40 hover:opacity-95 transition disabled:opacity-50"
                        >
                          <span>🚀 Publier la réponse sur le réseau</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ONGLET 3 : NOTES INTERNES SÉCURISÉES */}
                {activeTab === 'notes' && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-purple-500/30 bg-purple-950/10 p-4">
                      <div className="flex items-center gap-2 font-bold text-xs text-purple-300 mb-2">
                        <span>🔒 Espace collaboratif confidentiel</span>
                        <span className="text-[10px] font-normal text-muted-foreground">
                          (Strictement interne, jamais publié sur les réseaux)
                        </span>
                      </div>
                      <textarea
                        rows={2}
                        placeholder="Ajouter une consigne ou observation interne pour l’équipe..."
                        value={internalNoteText}
                        onChange={(e) => setInternalNoteText(e.target.value)}
                        className="w-full rounded-xl border border-border/80 bg-background/80 p-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-purple-500/50 focus:outline-none"
                      />
                      <div className="mt-2.5 flex justify-end">
                        <button
                          onClick={handleAddNote}
                          disabled={isPending || !internalNoteText.trim()}
                          className="rounded-xl bg-purple-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-purple-500 transition disabled:opacity-50"
                        >
                          Enregistrer la note
                        </button>
                      </div>
                    </div>

                    {/* Liste des notes internes */}
                    <div className="space-y-2">
                      {selectedComment.internalNotes && selectedComment.internalNotes.length > 0 ? (
                        selectedComment.internalNotes.map((note: any) => (
                          <div
                            key={note.id}
                            className="rounded-xl border border-border/60 bg-surface/70 p-3 text-xs"
                          >
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                              <span className="font-semibold text-white">
                                {note.author?.name || 'Collaborateur'}
                              </span>
                              <span>{new Date(note.createdAt).toLocaleString('fr-FR')}</span>
                            </div>
                            <p className="text-foreground/90 whitespace-pre-wrap">{note.body}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground italic text-center py-4">
                          Aucune note interne pour ce commentaire.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* ONGLET 4 : HISTORIQUE ET AUDIT */}
                {activeTab === 'audit' && (
                  <div className="space-y-2">
                    {selectedComment.auditLogs && selectedComment.auditLogs.length > 0 ? (
                      selectedComment.auditLogs.map((log: any) => (
                        <div
                          key={log.id}
                          className="rounded-xl border border-border/60 bg-surface/60 p-3 text-xs flex items-start justify-between gap-4"
                        >
                          <div>
                            <span className="font-semibold text-white">
                              {log.toStatus}
                            </span>{' '}
                            {log.fromStatus && (
                              <span className="text-muted-foreground">
                                (précédemment : {log.fromStatus})
                              </span>
                            )}
                            <p className="text-muted-foreground mt-0.5">{log.reason}</p>
                          </div>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString('fr-FR')}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-muted-foreground italic text-center py-4">
                        Aucun journal d’audit disponible.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <span className="text-4xl mb-2">💬</span>
              <p className="text-sm font-semibold">Sélectionnez un commentaire</p>
              <p className="text-xs text-muted-foreground">
                Choisissez un message dans la liste centrale pour analyser et répondre.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
