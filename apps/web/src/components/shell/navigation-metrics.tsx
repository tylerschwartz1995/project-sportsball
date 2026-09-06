"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { performanceRouteContext } from "@/lib/performance-route-context";

let pending: { href: string; started: number } | undefined;
const rate = Number(process.env.NEXT_PUBLIC_WEB_VITALS_SAMPLE_RATE ?? "0.1");
const sampled = Math.random() < (Number.isFinite(rate) ? Math.min(1, Math.max(0, rate)) : 0.1);

export function NavigationMetrics() {
  useEffect(() => {
    const click = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element).closest?.("a");
      if (!link || link.target || link.hasAttribute("download")) return;
      const url = new URL(link.href, location.href);
      if (url.origin === location.origin && url.pathname + url.search !== location.pathname + location.search) {
        pending = { href: url.pathname + (url.searchParams.size ? `?${url.searchParams.toString()}` : ""), started: performance.now() };
      }
    };
    const pop = () => { pending = { href: location.pathname + (location.search ? `?${new URLSearchParams(location.search).toString()}` : ""), started: performance.now() }; };
    document.addEventListener("click", click, true);
    window.addEventListener("popstate", pop);
    return () => { document.removeEventListener("click", click, true); window.removeEventListener("popstate", pop); };
  }, []);
  return null;
}

/** Mount inside resolved route content, rather than its loading shell. */
export function NavigationComplete() {
  const path = usePathname();
  const search = useSearchParams().toString();
  useEffect(() => {
    const navigation = pending;
    if (!navigation || navigation.href !== path + (search ? `?${search}` : "")) return;
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        if (pending !== navigation) return;
        pending = undefined;
        const duration = performance.now() - navigation.started;
        performance.measure("sportsball-navigation-content", { start: navigation.started, end: performance.now() });
        if (!sampled || duration > 30_000) return;
        const body = JSON.stringify({ id: crypto.randomUUID(), name: "NAV_CONTENT", value: duration,
          navigationType: "soft", path, ...performanceRouteContext(new URLSearchParams(search)) });
        if (!navigator.sendBeacon?.("/api/web-vitals", body)) {
          void fetch("/api/web-vitals", { method: "POST", body, keepalive: true }).catch(() => undefined);
        }
      });
    });
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); };
  }, [path, search]);
  return null;
}
