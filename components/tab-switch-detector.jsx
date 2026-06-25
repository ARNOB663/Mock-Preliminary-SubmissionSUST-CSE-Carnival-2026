"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Soft tab-switch detector. Records:
 *   - time the page was hidden (visibilitychange)
 *   - window blur events
 *
 * Calls onEvent({ kind, at }) on each detection. The parent decides
 * whether to warn, count, or block — we never block (accessibility).
 *
 * Usage:
 *   const detector = useTabSwitchDetector();
 *   <form onSubmit={...} onFocus={() => detector.arm()}>
 *     {detector.switchCount > 0 && <Warning count={detector.switchCount} />}
 *   </form>
 */
export function useTabSwitchDetector() {
  const [switchCount, setSwitchCount] = useState(0);
  const [lastSwitchAt, setLastSwitchAt] = useState(null);
  const armedRef = useRef(false);
  const listenersRef = useRef([]);

  useEffect(() => {
    function bump(kind) {
      if (!armedRef.current) return;
      setSwitchCount((n) => n + 1);
      setLastSwitchAt(new Date());
      for (const fn of listenersRef.current) {
        try { fn({ kind, at: new Date() }); } catch {}
      }
    }

    function onVis() {
      if (document.visibilityState === "hidden") bump("visibility");
    }
    function onBlur() { bump("blur"); }

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  return {
    switchCount,
    lastSwitchAt,
    arm: () => { armedRef.current = true; },
    disarm: () => { armedRef.current = false; },
    reset: () => { setSwitchCount(0); setLastSwitchAt(null); },
    onEvent: (fn) => {
      listenersRef.current.push(fn);
      return () => {
        listenersRef.current = listenersRef.current.filter((f) => f !== fn);
      };
    },
  };
}

/**
 * Soft warning banner. Shown when count > 0; never blocks submit.
 */
export function TabSwitchWarning({ count, lastAt }) {
  if (!count) return null;
  return (
    <div className="rounded-md border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-3 text-sm text-amber-900 dark:text-amber-100">
      <strong>Heads up.</strong> You switched away from this tab{" "}
      {count === 1 ? "once" : `${count} times`} while filling this form.
      {lastAt && (
        <span className="text-amber-700 dark:text-amber-300 ml-1">
          (last at {lastAt.toLocaleTimeString()})
        </span>
      )}
    </div>
  );
}