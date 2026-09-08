'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import type { Draft, DraftVersion, Comment, Approval, MediaAsset, BrandVoice, RoleName } from '@prisma/client';
import { addDraftCommentAction, submitApprovalAction } from './actions';

type EnrichedDraft = Draft & {
  brandVoice: BrandVoice | null;
  versions: DraftVersion[];
  comments: (Comment & { author: { id: string; name: string | null; email: string } })[];
  approvals: Approval[];
  mediaAssets: MediaAsset[];
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  IDEA: { label: 'Idée', color: 'border-muted-foreground/30 bg-muted-foreground/10 text-muted-foreground' },
  COLLECTING: { label: 'Collecte', color: 'border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan' },
  ANALYZING: { label: 'Analyse', color: 'border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan' },
  TO_VERIFY: { label: 'À vérifier', color: 'border-warning/30 bg-warning/10 text-warning' },
  DRAFT: { label: 'Brouillon', color: 'border-border bg-surface-raised text-foreground' },
  READY_FOR_REVIEW: { label: 'Prêt pour validation', color: 'border-accent-blue/40 bg-accent-blue/10 text-accent-blue' },
  CHANGES_REQUESTED: { label: 'Modifications demandées', color: 'border-danger/30 bg-danger/10 text-danger' },
  APPROVED: { label: 'Approuvé', color: 'border-success/30 bg-success/10 text-success' },
  SCHEDULED: { label: 'Programmé', color: 'border-accent-violet/30 bg-accent-violet/10 text-accent-violet' },
  PUBLISHED: { label: 'Publié', color: 'border-success/40 bg-success/15 text-success font-bold' },
};

export default function DraftsClient({
  org,
  drafts: initialDrafts,
  userRole,
}: {
  org: string;
  drafts: EnrichedDraft[];
  userRole: RoleName;
}) {
  const [drafts, setDrafts] = useState<EnrichedDraft[]>(initialDrafts);
  const [selectedDraft, setSelectedDraft] = useState<EnrichedDraft | null>(null);
  const [commentText, setCommentText] = useState('');
  const [approvalNote, setApprovalNote] = useState('');
  const [isPending, startTransition] = useTransition();

  const canApprove = ['OWNER', 'ADMIN', 'EDITOR_IN_CHIEF', 'APPROVER'].includes(userRole);

  function handleAddComment(draftId: string) {
    if (!commentText.trim()) return;
    startTransition(async () => {
      const res = await addDraftCommentAction(org, draftId, commentText.trim());
      if (res.ok && res.comment) {
        setDrafts((prev) =>
          prev.map((d) =>
            d.id === draftId
              ? {
                  ...d,
                  comments: [res.comment as unknown as EnrichedDraft['comments'][0], ...d.comments],
                }
              : d,
          ),
        );
        if (selectedDraft && selectedDraft.id === draftId) {
          setSelectedDraft((prev) =>
            prev ? { ...prev, comments: [res.comment as unknown as EnrichedDraft['comments'][0], ...prev.comments] } : null,
          );
        }
        setCommentText('');
      }
    });
  }

  function handleApproval(draftId: string, decision: 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED') {
    startTransition(async () => {
      const res = await submitApprovalAction(org, draftId, decision, approvalNote.trim() || undefined);
      if (res.ok) {
        const newStatus = decision === 'APPROVED' ? 'APPROVED' : decision === 'CHANGES_REQUESTED' ? 'CHANGES_REQUESTED' : 'IDEA';
        setDrafts((prev) =>
          prev.map((d) => (d.id === draftId ? { ...d, status: newStatus as EnrichedDraft['status'] } : d)),
        );
        if (selectedDraft && selectedDraft.id === draftId) {
          setSelectedDraft((prev) => (prev ? { ...prev, status: newStatus as EnrichedDraft['status'] } : null));
        }
        setApprovalNote('');
      }
    });
  }

  return (
    <div className="space-y-6">
      {drafts.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-12 text-center">
          <span className="text-3xl">📝</span>
          <h3 className="mt-3 text-base font-semibold text-foreground">Aucun brouillon enregistré</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Rendez-vous dans STARS Direct ou le Studio Éditorial pour créer votre première publication.
          </p>
          <Link
            href={`/w/${org}/studio`}
            className="mt-4 inline-block rounded-xl bg-start-gradient px-4 py-2 text-xs font-semibold text-white shadow"
          >
            Ouvrir le Studio Éditorial
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {drafts.map((d) => {
            const st = STATUS_LABELS[d.status] || { label: d.status, color: 'border-border' };
            return (
              <div
                key={d.id}
                className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-surface p-5 shadow-sm transition hover:border-border/80 sm:flex-row sm:items-center"
              >
                <div className="flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-surface-raised px-2 py-0.5 text-xs font-bold text-accent-cyan">
                      {d.network}
                    </span>
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${st.color}`}>
                      {st.label}
                    </span>
                    {d.brandVoice && (
                      <span className="text-[11px] text-muted-foreground">
                        Voix : <span className="font-semibold text-foreground">{d.brandVoice.name}</span>
                      </span>
                    )}
                  </div>
                  <p className="line-clamp-2 text-sm text-foreground">
                    {d.currentContent || 'Brouillon sans contenu'}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Mis à jour le {new Date(d.updatedAt).toLocaleDateString('fr-FR')}</span>
                    <span>·</span>
                    <span>{d.versions.length} version(s)</span>
                    <span>·</span>
                    <span>{d.comments.length} commentaire(s)</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDraft(d)}
                    className="rounded-xl border border-border px-3.5 py-2 text-xs font-medium hover:bg-surface-raised"
                  >
                    Historique & Validation
                  </button>
                  <Link
                    href={`/w/${org}/studio?draftId=${d.id}`}
                    className="rounded-xl bg-start-gradient px-4 py-2 text-xs font-semibold text-white shadow hover:opacity-90"
                  >
                    Éditer dans le Studio →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Détails, Versions et Approbation */}
      {selectedDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">
                  Détail du brouillon ({selectedDraft.network})
                </h3>
                <span className="text-xs text-muted-foreground">
                  Statut actuel : {STATUS_LABELS[selectedDraft.status]?.label}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDraft(null)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                ✕ Fermer
              </button>
            </div>

            {/* Contenu */}
            <div className="mt-4 rounded-xl border border-border bg-surface-raised p-4 text-xs leading-relaxed whitespace-pre-line text-foreground">
              {selectedDraft.currentContent}
            </div>

            {/* Circuit d'approbation */}
            {canApprove && (
              <div className="mt-6 rounded-xl border border-border bg-surface p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Circuit de validation éditoriale
                </h4>
                <textarea
                  value={approvalNote}
                  onChange={(e) => setApprovalNote(e.target.value)}
                  placeholder="Note ou consigne pour l'auteur (optionnel)..."
                  rows={2}
                  className="mt-2 w-full rounded-xl border border-border bg-surface-raised p-2.5 text-xs outline-none focus:border-accent-cyan"
                />
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleApproval(selectedDraft.id, 'APPROVED')}
                    className="rounded-lg bg-success/20 px-3 py-1.5 text-xs font-semibold text-success hover:bg-success/30 disabled:opacity-50"
                  >
                    ✓ Approuver pour publication
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleApproval(selectedDraft.id, 'CHANGES_REQUESTED')}
                    className="rounded-lg bg-warning/20 px-3 py-1.5 text-xs font-semibold text-warning hover:bg-warning/30 disabled:opacity-50"
                  >
                    ⚠️ Demander des modifications
                  </button>
                </div>
              </div>
            )}

            {/* Historique des versions */}
            <div className="mt-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Historique des versions ({selectedDraft.versions.length})
              </h4>
              <div className="mt-2 space-y-2">
                {selectedDraft.versions.map((v, i) => (
                  <div key={v.id || i} className="rounded-xl border border-border bg-surface-raised p-3 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        {v.variantLabel ? `Variante ${v.variantLabel}` : `Version ${selectedDraft.versions.length - i}`}
                      </span>
                      <span>{new Date(v.createdAt).toLocaleString('fr-FR')}</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-muted-foreground">{v.content}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Commentaires */}
            <div className="mt-6">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Discussion interne ({selectedDraft.comments.length})
              </h4>
              <div className="mt-2 flex gap-2">
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Ajouter une remarque..."
                  className="flex-1 rounded-xl border border-border bg-surface-raised px-3 py-1.5 text-xs outline-none focus:border-accent-cyan"
                />
                <button
                  type="button"
                  disabled={isPending || !commentText.trim()}
                  onClick={() => handleAddComment(selectedDraft.id)}
                  className="rounded-xl bg-start-gradient px-4 py-1.5 text-xs font-semibold text-white shadow disabled:opacity-50"
                >
                  Envoyer
                </button>
              </div>

              <div className="mt-3 space-y-2">
                {selectedDraft.comments.map((c) => (
                  <div key={c.id} className="rounded-xl border border-border bg-surface-raised p-2.5 text-xs">
                    <div className="flex items-center justify-between font-semibold text-foreground">
                      <span>{c.author.name || c.author.email}</span>
                      <span className="text-[10px] font-normal text-muted-foreground">
                        {new Date(c.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="mt-1 text-muted-foreground">{c.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
