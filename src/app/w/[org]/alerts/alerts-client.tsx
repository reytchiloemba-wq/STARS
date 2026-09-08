'use client';

import { useState, useTransition } from 'react';
import type { Alert, Watchlist, WatchlistKind } from '@prisma/client';
import { createAlertAction, toggleAlertAction, createWatchlistAction, deleteWatchlistAction } from './actions';

export default function AlertsClient({
  org,
  alerts: initialAlerts,
  watchlists: initialWatchlists,
}: {
  org: string;
  alerts: Alert[];
  watchlists: Watchlist[];
}) {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [watchlists, setWatchlists] = useState(initialWatchlists);
  const [alertLabel, setAlertLabel] = useState('');
  const [triggerKeyword, setTriggerKeyword] = useState('');

  const [wlLabel, setWlLabel] = useState('');
  const [wlKind, setWlKind] = useState<WatchlistKind>('COMPANY');
  const [wlValue, setWlValue] = useState('');

  const [isPending, startTransition] = useTransition();

  function handleCreateAlert(e: React.FormEvent) {
    e.preventDefault();
    if (!alertLabel.trim()) return;
    startTransition(async () => {
      const res = await createAlertAction(org, {
        label: alertLabel.trim(),
        triggerKeyword: triggerKeyword.trim() || alertLabel.trim(),
      });
      if (res.ok && res.alert) {
        setAlerts([res.alert, ...alerts]);
        setAlertLabel('');
        setTriggerKeyword('');
      }
    });
  }

  function handleToggleAlert(id: string, active: boolean) {
    startTransition(async () => {
      const res = await toggleAlertAction(org, id, active);
      if (res.ok) {
        setAlerts(alerts.map((a) => (a.id === id ? { ...a, isActive: active } : a)));
      }
    });
  }

  function handleCreateWatchlist(e: React.FormEvent) {
    e.preventDefault();
    if (!wlLabel.trim()) return;
    startTransition(async () => {
      const res = await createWatchlistAction(org, {
        label: wlLabel.trim(),
        kind: wlKind,
        value: wlValue.trim() || wlLabel.trim(),
      });
      if (res.ok && res.item) {
        setWatchlists([res.item, ...watchlists]);
        setWlLabel('');
        setWlValue('');
      }
    });
  }

  function handleDeleteWatchlist(id: string) {
    startTransition(async () => {
      const res = await deleteWatchlistAction(org, id);
      if (res.ok) {
        setWatchlists(watchlists.filter((w) => w.id !== id));
      }
    });
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      {/* Alertes en temps réel */}
      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-base font-bold text-foreground">🔔 Alertes prioritaires</h2>
          <p className="text-xs text-muted-foreground">
            Recevez une notification dès qu&apos;un fait nouveau ou une rupture est corroboré par au moins 2 sources.
          </p>

          <form onSubmit={handleCreateAlert} className="mt-4 flex flex-col gap-2">
            <input
              required
              value={alertLabel}
              onChange={(e) => setAlertLabel(e.target.value)}
              placeholder="Nom de l'alerte (ex: Litiges brevets IA)"
              className="rounded-xl border border-border bg-surface-raised px-3.5 py-2 text-xs outline-none focus:border-accent-cyan"
            />
            <div className="flex gap-2">
              <input
                value={triggerKeyword}
                onChange={(e) => setTriggerKeyword(e.target.value)}
                placeholder="Mot-clé déclencheur (ex: copyright, lawsuit)"
                className="flex-1 rounded-xl border border-border bg-surface-raised px-3.5 py-2 text-xs outline-none focus:border-accent-cyan"
              />
              <button
                type="submit"
                disabled={isPending}
                className="rounded-xl bg-start-gradient px-4 py-2 text-xs font-bold text-white shadow hover:opacity-90 disabled:opacity-50"
              >
                + Créer l&apos;alerte
              </button>
            </div>
          </form>

          <div className="mt-6 divide-y divide-border">
            {alerts.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">Aucune alerte active.</div>
            ) : (
              alerts.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">{a.label}</div>
                    <div className="text-[11px] text-muted-foreground">
                      Déclencheur : {((a.triggerRule as { keyword?: string })?.keyword) || 'Tous'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleAlert(a.id, !a.isActive)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      a.isActive
                        ? 'bg-success/20 text-success'
                        : 'bg-surface-raised text-muted-foreground'
                    }`}
                  >
                    {a.isActive ? 'Active' : 'Désactivée'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Watchlists ciblées */}
      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-base font-bold text-foreground">🎯 Listes de surveillance (Watchlists)</h2>
          <p className="text-xs text-muted-foreground">
            Suivez des entreprises cibles, des personnalités, des mots-clés ou des territoires spécifiques.
          </p>

          <form onSubmit={handleCreateWatchlist} className="mt-4 space-y-2">
            <div className="flex gap-2">
              <select
                value={wlKind}
                onChange={(e) => setWlKind(e.target.value as WatchlistKind)}
                className="rounded-xl border border-border bg-surface-raised px-2.5 py-2 text-xs outline-none"
              >
                <option value="COMPANY">Entreprise</option>
                <option value="PERSON">Personnalité</option>
                <option value="KEYWORD">Mot-clé</option>
                <option value="TERRITORY">Territoire</option>
              </select>
              <input
                required
                value={wlLabel}
                onChange={(e) => setWlLabel(e.target.value)}
                placeholder="Nom (ex: OpenAI, France, Sam Altman)"
                className="flex-1 rounded-xl border border-border bg-surface-raised px-3.5 py-2 text-xs outline-none focus:border-accent-cyan"
              />
              <button
                type="submit"
                disabled={isPending}
                className="rounded-xl bg-start-gradient px-4 py-2 text-xs font-bold text-white shadow hover:opacity-90 disabled:opacity-50"
              >
                + Ajouter
              </button>
            </div>
          </form>

          <div className="mt-6 space-y-2">
            {watchlists.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">Aucune surveillance configurée.</div>
            ) : (
              watchlists.map((w) => (
                <div key={w.id} className="flex items-center justify-between rounded-xl bg-surface-raised p-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-surface px-2 py-0.5 font-mono text-[10px] font-bold text-accent-cyan">
                      {w.kind}
                    </span>
                    <span className="font-semibold text-foreground">{w.label}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteWatchlist(w.id)}
                    className="text-muted-foreground hover:text-danger"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
