"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellRing, X, Check } from "lucide-react";

const STORAGE_KEY = "medwallet_notif_prompt_dismissed";
const SHOW_DELAY = 5000;
const AUTO_DISMISS = 15000;

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
/*  Animated ringing bell                                              */
/* ------------------------------------------------------------------ */
function AnimatedBell() {
  return (
    <motion.div
      className="relative flex items-center justify-center"
      initial={false}
      animate={{ rotate: [0, 14, -14, 10, -10, 6, -6, 0] }}
      transition={{
        duration: 1.8,
        repeat: Infinity,
        repeatDelay: 2.4,
        ease: "easeInOut",
      }}
    >
      {/* Glow ring */}
      <motion.span
        className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400/40 via-sky-500/30 to-teal-400/40 blur-xl"
        animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Icon circle */}
      <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 via-sky-500 to-teal-500 shadow-lg shadow-sky-500/30">
        <BellRing className="h-7 w-7 text-white" strokeWidth={2.2} />
      </span>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Success checkmark (shown briefly after enabling)                   */
/* ------------------------------------------------------------------ */
function SuccessState() {
  return (
    <motion.div
      className="flex flex-col items-center gap-3 py-2"
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
    >
      <motion.span
        className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-green-500 shadow-lg shadow-emerald-500/30"
        initial={{ rotate: -90 }}
        animate={{ rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      >
        <Check className="h-7 w-7 text-white" strokeWidth={3} />
      </motion.span>
      <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
        Notificações activadas!
      </span>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
export default function NotificationPermissionPopup() {
  const eligible = useNotificationEligible();
  const [visible, setVisible] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const autoDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  }, []);

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
      setTimeout(dismiss, 1600);
    } else {
      dismiss();
    }
  };

  const handleDismiss = () => {
    persist();
    dismiss();
  };

  /* ---------- render ---------- */
  return (
    <AnimatePresence onExitComplete={() => setSucceeded(false)}>
      {visible && (
        <>
          {/* ---- Mobile: Bottom Sheet ---- */}
          <motion.div
            className="fixed inset-x-0 bottom-0 z-[9999] flex flex-col items-center px-4 pb-4 md:hidden"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 320,
              damping: 30,
              mass: 0.8,
            }}
          >
            {/* Scrim */}
            <motion.div
              className="fixed inset-0 -top-4 bg-black/30 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleDismiss}
              aria-hidden
            />

            {/* Sheet card */}
            <motion.div
              role="dialog"
              aria-label="Permissão de notificações"
              className="relative z-10 w-full max-w-md overflow-hidden rounded-[2rem] bg-white/90 p-6 shadow-2xl shadow-black/10 backdrop-blur-xl dark:bg-gray-900/90"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag handle */}
              <span className="mx-auto mb-4 block h-1 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />

              <PopupContent
                succeeded={succeeded}
                onEnable={handleEnable}
                onDismiss={handleDismiss}
              />
            </motion.div>
          </motion.div>

          {/* ---- Desktop: Bottom-Right Toast Card ---- */}
          <motion.div
            className="pointer-events-none fixed bottom-6 right-6 z-[9999] hidden md:block"
            initial={{ y: 80, x: 40, opacity: 0, scale: 0.92 }}
            animate={{ y: 0, x: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, x: 40, opacity: 0, scale: 0.92, transition: { duration: 0.25 } }}
            transition={{
              type: "spring",
              stiffness: 280,
              damping: 26,
            }}
          >
            <div className="pointer-events-auto w-[380px] overflow-hidden rounded-[2rem] bg-white/90 p-6 shadow-2xl shadow-black/10 backdrop-blur-xl dark:bg-gray-900/90">
              <PopupContent
                succeeded={succeeded}
                onEnable={handleEnable}
                onDismiss={handleDismiss}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared inner content                                               */
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
        className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
        aria-label="Fechar"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Gradient ocean decorative bar */}
      <div className="mb-5 h-1.5 w-20 rounded-full bg-gradient-to-r from-cyan-400 via-sky-500 to-teal-400" />

      <AnimatePresence mode="wait">
        {succeeded ? (
          <SuccessState key="success" />
        ) : (
          <motion.div
            key="prompt"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
          >
            {/* Icon */}
            <div className="mb-4">
              <AnimatedBell />
            </div>

            {/* Copy */}
            <h3 className="mb-1.5 text-lg font-bold tracking-tight text-gray-900 dark:text-white">
              Fica ligado! 🔔
            </h3>
            <p className="mb-5 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
              Activa as notificações para não perderes consultas, alertas de
              saúde e ofertas especiais.
            </p>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={onEnable}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-teal-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition-shadow hover:shadow-xl hover:shadow-sky-500/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
              >
                <Bell className="h-4 w-4" />
                Activar Notificações
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={onDismiss}
                className="rounded-xl px-4 py-2.5 text-sm font-medium text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
              >
                Agora não
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
