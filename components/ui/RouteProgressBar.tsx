// components/ui/RouteProgressBar.tsx
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const SAFETY_TIMEOUT_MS = 8000;
const COMPLETE_HOLD_MS = 220;

export function RouteProgressBar() {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const searchKey = searchParams ? searchParams.toString() : "";
  const routeKey = `${pathname}${searchKey ? `?${searchKey}` : ""}`;

  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  const prevRouteKeyRef = useRef(routeKey);
  const lastLocationRef = useRef(
    typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "",
  );
  const phaseRef = useRef<"idle" | "loading" | "completing">("idle");
  const rampTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (rampTimerRef.current !== null) {
      clearInterval(rampTimerRef.current);
      rampTimerRef.current = null;
    }
    if (hideTimerRef.current !== null) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (safetyTimerRef.current !== null) {
      clearTimeout(safetyTimerRef.current);
      safetyTimerRef.current = null;
    }
  }, []);

  const complete = useCallback(() => {
    clearTimers();
    phaseRef.current = "completing";
    setProgress(100);
    hideTimerRef.current = setTimeout(() => {
      phaseRef.current = "idle";
      setVisible(false);
      setProgress(0);
    }, COMPLETE_HOLD_MS);
  }, [clearTimers]);

  const start = useCallback(() => {
    clearTimers();
    phaseRef.current = "loading";
    setVisible(true);
    setProgress(18);

    rampTimerRef.current = setInterval(() => {
      if (phaseRef.current !== "loading") return;
      setProgress((prev) => {
        if (prev >= 88) return prev;
        const step = Math.max(1.5, (88 - prev) * 0.18);
        return Math.min(88, Number((prev + step).toFixed(1)));
      });
    }, 180);

    safetyTimerRef.current = setTimeout(() => {
      complete();
    }, SAFETY_TIMEOUT_MS);
  }, [clearTimers, complete]);

  // Complete bar when Next.js finishes updating pathname or searchParams
  useEffect(() => {
    const normalizedCurrent = `${pathname}${searchKey ? `?${searchKey}` : ""}`;
    if (typeof window !== "undefined") {
      lastLocationRef.current = `${window.location.pathname}${window.location.search}`;
    }
    if (prevRouteKeyRef.current !== normalizedCurrent) {
      prevRouteKeyRef.current = normalizedCurrent;
      if (visible) {
        const timer = setTimeout(() => {
          complete();
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [pathname, searchKey, visible, complete]);

  // Capture internal link clicks and browser history navigation
  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target as Element | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;

      if (anchor.hasAttribute("download")) return;
      const anchorTarget = anchor.getAttribute("target");
      if (anchorTarget && anchorTarget !== "_self") return;

      const rawHref = anchor.getAttribute("href");
      if (!rawHref || rawHref.startsWith("#")) return;

      try {
        const nextUrl = new URL(anchor.href, window.location.href);
        if (nextUrl.origin !== window.location.origin) return;

        const currentPathAndSearch = `${window.location.pathname}${window.location.search}`;
        const nextPathAndSearch = `${nextUrl.pathname}${nextUrl.search}`;
        if (currentPathAndSearch === nextPathAndSearch) return;

        start();
      } catch {
        // Ignore malformed hrefs
      }
    };

    const handlePopState = () => {
      const currentPathAndSearch = `${window.location.pathname}${window.location.search}`;
      if (currentPathAndSearch === lastLocationRef.current) {
        return;
      }
      lastLocationRef.current = currentPathAndSearch;
      start();
    };

    document.addEventListener("click", handleDocumentClick, true);
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
      window.removeEventListener("popstate", handlePopState);
      clearTimers();
    };
  }, [start, clearTimers]);

  if (!visible) return null;

  return (
    <div
      role="progressbar"
      aria-label="Page transition progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress)}
      className="fixed top-0 left-0 right-0 z-[100] h-[2.5px] pointer-events-none bg-transparent"
    >
      <div
        className={cn(
          "h-full bg-gradient-to-r from-[#CC5500] via-orange-400 to-[#22D3EE]",
          "shadow-[0_0_12px_rgba(34,211,238,0.75)] transition-[width,opacity] duration-200 ease-out",
        )}
        style={{
          width: `${progress}%`,
          opacity: progress >= 100 ? 0 : 1,
        }}
      />
    </div>
  );
}
