"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Bell, X, Check } from "@/components/icons/lucide-compat";
import { usePopupCoordinator } from "@/components/layout/PopupCoordinator";

const STORAGE_KEY = "medwallet_notif_prompt_dismissed";
const SHOW_DELAY = 8000;
const AUTO_DISMISS = 12000;

/* ------------------------------------------------------------------ */
/*  Hook: notification permission state                                */
/* ------------------------------------------------------------------ */
function useNotificationEligible() {
  const [eligible, setEligible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;

    if (
      typeof Notification !== "undefined" &&
      (Notification.permission === "granted" || Notification.permission === "denied")
    ) {
      return;
    }

    setEligible(true);
  }, []);

  return eligible;
}

/* ------------------------------------------------------------------ */
/*  Main Component — Pure CSS, zero framer-motion, zero Lottie          */
/* ------------------------------------------------------------------ */
export default function NotificationPermissionPopup() {
  const eligible = useNotificationEligible();
  const [visible, setVisible] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const autoDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { activePopup, release } = usePopupCoordinator();

  /* ---------- show after delay ---------- */
  useEffect(() => {
    if (!eligible) return;
    const timer = setTimeout(() => setVisible(true), SHOW_DELAY);
    return () => clearTimeout(timer);
  }, [eligible]);

  /* ---------- auto-dismiss ---------- */
  useEffect(() => {
    if (!visible || succeeded) return;
    autoDismissRef.current = setTimeout(() => dismiss(), AUTO_DISMISS);
    return () => {
      if (autoDismissRef.current) clearTimeout(autoDismissRef.current);
    };
  }, [visible, succeeded]);

  /* ---------- helpers ---------- */
  const dismiss = useCallback(() => {
    setVisible(false);
    release('notification');
  }, [release]);

  const persist = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  }, []);

  /* ---------- handlers ---------- */
  const handleEnable = async () => {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    persist();
    if (result === "granted") {
      setSucceeded(true);
      setTimeout(dismiss, 1200);
    } else {
      dismiss();
    }
  };

  const handleDismiss = () => {
    persist();
    dismiss();
  };

  if (!visible) return null;

  return (
    <>
      {/* Scrim */}
      <div
        className="fixed inset-0 z-[9998] bg-black/25 backdrop-blur-sm"
        onClick={handleDismiss}
        aria-hidden
      />

      {/* Mobile: Bottom Sheet (CSS-only slide-up) */}
      <div className="fixed inset-x-0 bottom-0 z-[9999] flex flex-col items-center px-4 pb-4 md:hidden notif-sheet-enter">
        <div
          role="dialog"
          aria-label="Permissão de notificações"
          className="relative z-10 w-full max-w-[340px] overflow-hidden rounded-2xl bg-card p-5 shadow-xl border border-border/50"
          onClick={(e) => e.stopPropagation()}
        >
          <PopupContent
            succeeded={succeeded}
            onEnable={handleEnable}
            onDismiss={handleDismiss}
          />
        </div>
      </div>

      {/* Desktop: Bottom-Right Toast Card (CSS-only fade-in) */}
      <div className="pointer-events-none fixed bottom-6 right-6 z-[9999] hidden md:block notif-toast-enter">
        <div className="pointer-events-auto relative w-[300px] overflow-hidden rounded-2xl bg-card p-5 shadow-xl border border-border/50">
          <PopupContent
            succeeded={succeeded}
            onEnable={handleEnable}
            onDismiss={handleDismiss}
          />
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared inner content — pure HTML, zero animation libs               */
/* ------------------------------------------------------------------ */
interface PopupContentProps {
  succeeded: boolean;
  onEnable: () => void;
  onDismiss: () => void;
}

function PopupContent({ succeeded, onEnable, onDismiss }: PopupContentProps) {
  return (
    <>
      {/* Close button */}
      <button
        onClick={onDismiss}
        className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        aria-label="Fechar"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {/* Simple accent bar */}
      <div className="mb-3 h-1 w-12 rounded-full bg-primary" />

      {succeeded ? (
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 shadow-md">
            <Check className="h-5 w-5 text-white" strokeWidth={3} />
          </div>
          <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
            Notificações activadas!
          </span>
        </div>
      ) : (
        <div>
          {/* Icon */}
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
            <Bell className="h-5 w-5 text-primary" />
          </div>

          {/* Copy */}
          <h3 className="mb-1 text-sm font-black tracking-tight text-foreground">
            Fica ligado!
          </h3>
          <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
            Activa as notificações para não perderes consultas e alertas de saúde.
          </p>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onEnable}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground active:scale-95 transition-transform"
            >
              <Bell className="h-3.5 w-3.5" />
              Activar
            </button>
            <button
              onClick={onDismiss}
              className="rounded-xl px-3 py-2.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              Agora não
            </button>
          </div>
        </div>
      )}
    </>
  );
}
