'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { signOut } from 'next-auth/react';

// 10 minutes d'inactivité = 600 000 ms
const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;
// Affichage du compte à rebours de prévenance pendant les 60 dernières secondes
const WARNING_COUNTDOWN_MS = 60 * 1000;
const STORAGE_KEY = 'stars_last_user_activity';
const THROTTLE_MS = 3000; // Enregistrer l'activité au maximum toutes les 3 secondes

export function InactivityTracker() {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(60);
  const isLoggingOutRef = useRef(false);
  const lastRecordedRef = useRef<number>(Date.now());

  // Enregistre l'activité de l'utilisateur
  const recordActivity = useCallback(() => {
    const now = Date.now();
    // Évite d'écrire dans localStorage à chaque pixel de souris
    if (now - lastRecordedRef.current < THROTTLE_MS) return;

    lastRecordedRef.current = now;
    try {
      localStorage.setItem(STORAGE_KEY, String(now));
    } catch {
      // Ignorer si localStorage indisponible
    }

    if (showWarning) {
      setShowWarning(false);
    }
  }, [showWarning]);

  // Déconnexion effective de l'utilisateur
  const performLogout = useCallback(async () => {
    if (isLoggingOutRef.current) return;
    isLoggingOutRef.current = true;

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}

    // Déconnexion NextAuth et redirection vers /login?timeout=1
    await signOut({ callbackUrl: '/login?timeout=1', redirect: true });
  }, []);

  useEffect(() => {
    // Initialisation du timestamp au montage
    const initialTime = Date.now();
    lastRecordedRef.current = initialTime;
    try {
      localStorage.setItem(STORAGE_KEY, String(initialTime));
    } catch {}

    // Écouteurs d'activité utilisateur (souris, clavier, tactile, scroll)
    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'];

    const handleUserEvent = () => {
      recordActivity();
    };

    activityEvents.forEach((ev) => {
      window.addEventListener(ev, handleUserEvent, { passive: true });
    });

    // Synchronisation multi-onglets : si l'utilisateur est actif sur un autre onglet
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        lastRecordedRef.current = Number(e.newValue);
        setShowWarning(false);
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Vérification cadencée chaque seconde
    const interval = setInterval(() => {
      let lastActive = lastRecordedRef.current;
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          lastActive = Number(stored);
        }
      } catch {}

      const now = Date.now();
      const elapsed = now - lastActive;

      // 10 minutes écoulées sans activité -> déconnexion
      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        clearInterval(interval);
        performLogout();
        return;
      }

      // Moins de 60 secondes avant déconnexion -> afficher l'alerte
      if (elapsed >= INACTIVITY_TIMEOUT_MS - WARNING_COUNTDOWN_MS) {
        const remaining = Math.max(1, Math.ceil((INACTIVITY_TIMEOUT_MS - elapsed) / 1000));
        setSecondsRemaining(remaining);
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      activityEvents.forEach((ev) => {
        window.removeEventListener(ev, handleUserEvent);
      });
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [recordActivity, performLogout]);

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl border border-amber-500/40 bg-surface/95 p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-xl text-amber-400">
            ⏳
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Inactivité Détectée</h3>
            <p className="text-xs text-muted-foreground">Sécurité des accès STARS</p>
          </div>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          Vous n&apos;avez effectué aucune action depuis près de <strong className="text-white">10 minutes</strong>. Par mesure de protection de vos données, votre session sera automatiquement fermée dans :
        </p>

        {/* Compteur visuel */}
        <div className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 py-3">
          <span className="font-mono text-3xl font-extrabold text-amber-400 tracking-wider">
            00:{secondsRemaining.toString().padStart(2, '0')}
          </span>
          <span className="text-[10px] uppercase font-semibold text-amber-300/80">secondes restantes</span>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={performLogout}
            className="rounded-xl border border-border/80 px-4 py-2 text-xs font-semibold text-muted-foreground transition hover:border-danger/40 hover:bg-danger/10 hover:text-danger"
          >
            Se déconnecter
          </button>
          <button
            type="button"
            onClick={() => {
              // Réinitialise manuellement l'activité
              lastRecordedRef.current = Date.now();
              try {
                localStorage.setItem(STORAGE_KEY, String(Date.now()));
              } catch {}
              setShowWarning(false);
            }}
            className="rounded-xl bg-start-gradient px-5 py-2 text-xs font-bold text-white shadow-md transition hover:scale-[1.02] hover:opacity-95"
          >
            Rester connecté
          </button>
        </div>
      </div>
    </div>
  );
}
