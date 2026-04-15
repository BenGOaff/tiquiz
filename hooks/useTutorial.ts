// hooks/useTutorial.ts
"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useTranslations } from "next-intl";
import { getSupabaseBrowserClient } from "@/lib/supabaseBrowser";

export type TutorialPhase =
  | "welcome"
  | "tour_dashboard"
  | "tour_create"
  | "tour_quizzes"
  | "tour_leads"
  | "tour_stats"
  | "tour_settings"
  | "tour_complete"
  | "completed";

type SeenMap = Record<string, boolean>;

interface TutorialContextType {
  phase: TutorialPhase;
  setPhase: (phase: TutorialPhase) => void;
  nextPhase: () => void;
  skipTutorial: () => void;

  showWelcome: boolean;
  setShowWelcome: (show: boolean) => void;

  isLoading: boolean;

  shouldHighlight: (element: string) => boolean;
  currentTooltip: string | null;
  nextPhaseUrl: string | null;

  tutorialOptOut: boolean;
  setTutorialOptOut: (value: boolean) => void;

  firstSeenAt: string | null;
  daysSinceFirstSeen: number;

  currentStep: number;
  totalSteps: number;

  resetTutorial: () => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

const FIRST_DAYS_WINDOW = 7;

const PHASE_ORDER: TutorialPhase[] = [
  "welcome",
  "tour_dashboard",
  "tour_create",
  "tour_quizzes",
  "tour_leads",
  "tour_stats",
  "tour_settings",
  "tour_complete",
  "completed",
];

export const PHASE_TO_URL: Partial<Record<TutorialPhase, string>> = {
  tour_dashboard: "/dashboard",
  tour_create: "/quiz/new",
  tour_quizzes: "/quizzes",
  tour_leads: "/leads",
  tour_stats: "/stats",
  tour_settings: "/settings",
  tour_complete: "/dashboard",
};

function safeParseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function isoNow() {
  return new Date().toISOString();
}

function daysBetween(fromIso: string, toIso: string) {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  const ms = Math.max(0, to - from);
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function userKey(
  userId: string,
  key: "phase" | "optout" | "first_seen_at" | "done",
) {
  return `tiquiz_tutorial_${key}_v1_${userId}`;
}

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const tTutorial = useTranslations("tutorial");
  const [isLoading, setIsLoading] = useState(true);

  const [userId, setUserId] = useState<string | null>(null);

  const [phase, setPhaseState] = useState<TutorialPhase>("completed");
  const [showWelcome, setShowWelcome] = useState(false);

  const [tutorialOptOut, setTutorialOptOutState] = useState(false);
  const [firstSeenAt, setFirstSeenAt] = useState<string | null>(null);
  const [daysSinceFirstSeen, setDaysSinceFirstSeen] = useState(0);

  // Load
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (cancelled) return;

        if (!user) {
          setUserId(null);
          setPhaseState("completed");
          setShowWelcome(false);
          setTutorialOptOutState(false);
          setFirstSeenAt(null);
          setDaysSinceFirstSeen(0);
          setIsLoading(false);
          return;
        }

        setUserId(user.id);

        const optOut = safeParseJson<boolean>(
          localStorage.getItem(userKey(user.id, "optout")),
          false,
        );

        const done = safeParseJson<boolean>(
          localStorage.getItem(userKey(user.id, "done")),
          false,
        );

        const savedPhase = safeParseJson<TutorialPhase | null>(
          localStorage.getItem(userKey(user.id, "phase")),
          null,
        );

        const storedFirstSeen = localStorage.getItem(
          userKey(user.id, "first_seen_at"),
        );
        const firstSeen = storedFirstSeen || isoNow();
        if (!storedFirstSeen) {
          localStorage.setItem(userKey(user.id, "first_seen_at"), firstSeen);
        }

        const days = daysBetween(firstSeen, isoNow());

        setTutorialOptOutState(Boolean(optOut));
        setFirstSeenAt(firstSeen);
        setDaysSinceFirstSeen(days);

        if (optOut || done) {
          setPhaseState("completed");
          setShowWelcome(false);
          setIsLoading(false);
          return;
        }

        const inFirstDays = days <= FIRST_DAYS_WINDOW;
        if (!inFirstDays) {
          setPhaseState("completed");
          setShowWelcome(false);
          setIsLoading(false);
          return;
        }

        if (
          !savedPhase ||
          !PHASE_ORDER.includes(savedPhase) ||
          savedPhase === "completed"
        ) {
          setPhaseState("welcome");
          setShowWelcome(true);
        } else {
          setPhaseState(savedPhase);
          setShowWelcome(savedPhase === "welcome");
        }

        setIsLoading(false);
      } catch {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const persistPhase = useCallback(
    (nextPhase: TutorialPhase) => {
      if (!userId) return;
      try {
        localStorage.setItem(userKey(userId, "phase"), JSON.stringify(nextPhase));
      } catch {
        // ignore
      }
    },
    [userId],
  );

  const persistOptOut = useCallback(
    (value: boolean) => {
      if (!userId) return;
      try {
        localStorage.setItem(userKey(userId, "optout"), JSON.stringify(value));
      } catch {
        // ignore
      }
    },
    [userId],
  );

  const persistDone = useCallback(
    (value: boolean) => {
      if (!userId) return;
      try {
        localStorage.setItem(userKey(userId, "done"), JSON.stringify(value));
      } catch {
        // ignore
      }
    },
    [userId],
  );

  const clearPersisted = useCallback(() => {
    if (!userId) return;
    try {
      localStorage.removeItem(userKey(userId, "optout"));
      localStorage.removeItem(userKey(userId, "phase"));
      localStorage.removeItem(userKey(userId, "done"));
    } catch {
      // ignore
    }
  }, [userId]);

  const setPhase = useCallback(
    (p: TutorialPhase) => {
      setPhaseState(p);
      persistPhase(p);
    },
    [persistPhase],
  );

  const nextPhase = useCallback(() => {
    const idx = PHASE_ORDER.indexOf(phase);
    if (idx < 0) return;

    const next = PHASE_ORDER[Math.min(idx + 1, PHASE_ORDER.length - 1)];

    if (next === "tour_complete") {
      persistDone(true);
    }

    setPhase(next);
    if (next !== "welcome") setShowWelcome(false);
  }, [phase, persistDone, setPhase]);

  const skipTutorial = useCallback(() => {
    setPhase("completed");
    setShowWelcome(false);
  }, [setPhase]);

  const setTutorialOptOut = useCallback(
    (value: boolean) => {
      setTutorialOptOutState(value);
      persistOptOut(value);

      if (value) {
        persistDone(true);
        setPhase("completed");
        setShowWelcome(false);
      }
    },
    [persistDone, persistOptOut, setPhase],
  );

  const resetTutorial = useCallback(() => {
    clearPersisted();
    setTutorialOptOutState(false);
    setShowWelcome(true);
    setPhase("welcome");
  }, [clearPersisted, setPhase]);

  const shouldHighlight = useCallback(
    (element: string) => {
      if (tutorialOptOut) return false;
      if (phase === "completed" || phase === "welcome") return false;

      if (phase === "tour_dashboard") return element === "dashboard";
      if (phase === "tour_create") return element === "create";
      if (phase === "tour_quizzes") return element === "quizzes";
      if (phase === "tour_leads") return element === "leads";
      if (phase === "tour_stats") return element === "stats";
      if (phase === "tour_settings") return element === "settings";

      return false;
    },
    [phase, tutorialOptOut],
  );

  const currentTooltip = useMemo(() => {
    if (tutorialOptOut) return null;

    switch (phase) {
      case "tour_dashboard":  return tTutorial("tooltipDashboard");
      case "tour_create":     return tTutorial("tooltipCreate");
      case "tour_quizzes":    return tTutorial("tooltipQuizzes");
      case "tour_leads":      return tTutorial("tooltipLeads");
      case "tour_stats":      return tTutorial("tooltipStats");
      case "tour_settings":   return tTutorial("tooltipSettings");
      case "tour_complete":   return tTutorial("tooltipComplete");
      default:                return null;
    }
  }, [phase, tutorialOptOut, tTutorial]);

  const nextPhaseUrl = useMemo<string | null>(() => {
    const idx = PHASE_ORDER.indexOf(phase);
    if (idx < 0 || idx >= PHASE_ORDER.length - 1) return null;
    const next = PHASE_ORDER[idx + 1];
    return PHASE_TO_URL[next] ?? null;
  }, [phase]);

  const TOUR_PHASES = PHASE_ORDER.filter(
    (p) => p.startsWith("tour_") && p !== "tour_complete",
  );
  const totalSteps = TOUR_PHASES.length;
  const currentStep = useMemo(() => {
    const idx = TOUR_PHASES.indexOf(phase as any);
    return idx >= 0 ? idx + 1 : 0;
  }, [phase]);

  const value = useMemo<TutorialContextType>(
    () => ({
      phase,
      setPhase,
      nextPhase,
      skipTutorial,
      showWelcome,
      setShowWelcome,
      isLoading,
      shouldHighlight,
      currentTooltip,
      nextPhaseUrl,
      tutorialOptOut,
      setTutorialOptOut,
      firstSeenAt,
      daysSinceFirstSeen,
      currentStep,
      totalSteps,
      resetTutorial,
    }),
    [
      phase,
      setPhase,
      nextPhase,
      skipTutorial,
      showWelcome,
      isLoading,
      shouldHighlight,
      currentTooltip,
      nextPhaseUrl,
      tutorialOptOut,
      setTutorialOptOut,
      firstSeenAt,
      daysSinceFirstSeen,
      currentStep,
      totalSteps,
      resetTutorial,
    ],
  );

  return React.createElement(
    TutorialContext.Provider,
    { value },
    children as any,
  );
}

export function useTutorial() {
  const ctx = useContext(TutorialContext);
  if (!ctx) throw new Error("useTutorial must be used within TutorialProvider");
  return ctx;
}
