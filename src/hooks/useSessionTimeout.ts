"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

const DEFAULT_INACTIVITY_MS = 15 * 60 * 1000; // 15 minutes

function getInactivityMs(): number {
  const raw = process.env.NEXT_PUBLIC_INACTIVITY_TIMEOUT_MS;
  if (!raw) return DEFAULT_INACTIVITY_MS;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_INACTIVITY_MS;
  // Minimum 1s to avoid accidental immediate logout in misconfigured environments.
  return Math.max(1000, Math.floor(parsed));
}

interface TimeoutRefs {
  lastActive: number;
  timeoutId: ReturnType<typeof setTimeout> | null;
}

interface UseSessionTimeoutOptions {
  onTimeout?: () => void | Promise<void>;
}

/**
 * useSessionTimeout
 *
 * Client-side inactivity watcher that:
 * - Tracks user activity events (mouse, keyboard, focus, visibility)
 * - After 15 minutes of inactivity, re-checks the session
 * - Redirects to login if the session has expired
 */
export function useSessionTimeout(options: UseSessionTimeoutOptions = {}) {
  const { status } = useSession();
  const router = useRouter();
  const refs = useRef<TimeoutRefs>({ lastActive: Date.now(), timeoutId: null });

  return useSessionTimeoutWithOptions({ status, router, refs, onTimeout: options.onTimeout });
}

export function useSessionTimeoutWithOptions(options: {
  status: ReturnType<typeof useSession>["status"];
  router: ReturnType<typeof useRouter>;
  refs: React.MutableRefObject<TimeoutRefs>;
  onTimeout?: () => void | Promise<void>;
}) {
  const { status, router, refs, onTimeout } = options;

  const inactivityMs = getInactivityMs();

  useEffect(() => {
    if (status !== "authenticated") {
      // If the user is not authenticated, do not start inactivity tracking.
      // Any existing timeout is cleared.
      if (refs.current.timeoutId) {
        clearTimeout(refs.current.timeoutId);
        refs.current.timeoutId = null;
      }
      return;
    }

    const updateLastActive = () => {
      refs.current.lastActive = Date.now();
      if (refs.current.timeoutId) {
        clearTimeout(refs.current.timeoutId);
      }
      refs.current.timeoutId = setTimeout(checkInactivity, inactivityMs);
    };

    const checkInactivity = async () => {
      const now = Date.now();
      const idleFor = now - refs.current.lastActive;
      if (idleFor < inactivityMs) {
        // User became active again; schedule next check from now.
        refs.current.timeoutId = setTimeout(checkInactivity, inactivityMs - idleFor);
        return;
      }

      // Hard timeout: after 15 minutes of inactivity, force a real logout.
      // This avoids relying on session-expiry timing and ensures a predictable UX.
      if (onTimeout) {
        await onTimeout();
        return;
      }

      // Fallback behaviour: redirect to login with callback to current location.
      if (typeof window !== "undefined") {
        const callbackUrl = window.location.pathname + window.location.search;
        router.push(`/?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      }
    };

    // Activity events that should reset the inactivity timer
    const activityEvents: (keyof DocumentEventMap)[] = [
      "mousemove",
      "keydown",
      "click",
      "focus",
      "visibilitychange",
    ];

    activityEvents.forEach((event) => {
      window.addEventListener(event, updateLastActive, { passive: true } as EventListenerOptions);
    });

    // Start the initial timer from now
    updateLastActive();

    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, updateLastActive as EventListener);
      });
      if (refs.current.timeoutId) {
        clearTimeout(refs.current.timeoutId);
        refs.current.timeoutId = null;
      }
    };
  }, [inactivityMs, onTimeout, refs, router, status]);
}
