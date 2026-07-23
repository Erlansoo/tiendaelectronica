"use client";

import { useEffect } from "react";
import { SESSION_ACTIVITY_WRITE_INTERVAL_MS, SESSION_IDLE_TIMEOUT_MS } from "@/lib/session";

export function SessionInactivityGuard({ logoutPath }: { logoutPath: string }) {
  useEffect(() => {
    let lastActivityAt = Date.now();
    let lastReportedAt = 0;
    let signingOut = false;

    const reportActivity = async () => {
      try {
        const response = await fetch("/api/session/activity", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
        });

        if (response.status === 401 && !signingOut) {
          signingOut = true;
          window.location.assign(logoutPath);
        }
      } catch {
        // A temporary network failure must not sign the user out while they are active.
      }
    };

    const recordActivity = () => {
      if (signingOut) return;

      const now = Date.now();
      lastActivityAt = now;

      if (now - lastReportedAt >= SESSION_ACTIVITY_WRITE_INTERVAL_MS) {
        lastReportedAt = now;
        void reportActivity();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") recordActivity();
    };

    const activityEvents: Array<keyof WindowEventMap> = ["keydown", "pointerdown", "pointermove", "scroll", "touchstart", "focus"];
    activityEvents.forEach((eventName) => window.addEventListener(eventName, recordActivity, { passive: true }));
    document.addEventListener("visibilitychange", handleVisibilityChange);

    recordActivity();

    const interval = window.setInterval(() => {
      if (signingOut || Date.now() - lastActivityAt < SESSION_IDLE_TIMEOUT_MS) return;

      signingOut = true;
      void fetch("/api/session/logout", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
      }).finally(() => window.location.assign(logoutPath));
    }, 10_000);

    return () => {
      window.clearInterval(interval);
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, recordActivity));
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [logoutPath]);

  return null;
}
