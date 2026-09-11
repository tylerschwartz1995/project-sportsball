"use client";

import { useEffect } from "react";

export type ScrollIntent = "preserve" | "results" | "restore" | "top" | "tabs";
type Position = {
  x: number;
  y: number;
  focus?: string;
  regions: Array<{ selector: string; left: number; top: number }>;
  disclosures: Array<{ selector: string; open: boolean }>;
};
type Request = {
  href: string;
  mode: ScrollIntent;
  position: Position;
  anchor?: { selector: string; offset: number };
  hash?: string;
  restoreEntry?: string;
};
const STORAGE_KEY = "sportsball-scroll-v1";
const STATE_KEY = "sportsballScrollEntry";
let navigate:
  | ((href: string, mode?: ScrollIntent, source?: HTMLElement) => void)
  | undefined;

/** Called before changing the URL, while the outgoing content still exists. */
export function prepareScrollNavigation(
  href: string,
  mode?: ScrollIntent,
  source?: HTMLElement,
) {
  navigate?.(href, mode, source);
}

function routeKey(href: string) {
  const url = new URL(href, window.location.origin);
  url.searchParams.delete("returnTo");
  url.searchParams.sort();
  return url.pathname + (url.searchParams.size ? `?${url.searchParams}` : "");
}

function fragmentId(hash: string) {
  try {
    return decodeURIComponent(hash.slice(1));
  } catch {
    return hash.slice(1);
  }
}

function selectorFor(element: Element): string {
  const parts: string[] = [];
  let node: Element | null = element;
  while (node && node !== document.body) {
    // React-generated IDs can change when a route is mounted again.
    if (node.id && !node.hasAttribute("data-scroll-generated-id")) {
      parts.unshift(`#${CSS.escape(node.id)}`);
      break;
    }
    const tag = node.tagName.toLowerCase();
    const siblings: Element[] = Array.from(
      node.parentElement?.children ?? [],
    ).filter((child) => child.tagName === node!.tagName);
    parts.unshift(`${tag}:nth-of-type(${siblings.indexOf(node) + 1})`);
    node = node.parentElement;
  }
  return parts.join(" > ");
}

function capture(): Position {
  const main = document.querySelector("main");
  return {
    x: window.scrollX,
    y: window.scrollY,
    focus:
      document.activeElement instanceof HTMLElement &&
      main?.contains(document.activeElement)
        ? selectorFor(document.activeElement)
        : undefined,
    regions: Array.from(main?.querySelectorAll<HTMLElement>("div, nav") ?? [])
      .filter((element) => element.scrollLeft > 0 || element.scrollTop > 0)
      .map((element) => ({
        selector: selectorFor(element),
        left: element.scrollLeft,
        top: element.scrollTop,
      })),
    disclosures: Array.from(main?.querySelectorAll<HTMLElement>("details, [data-scroll-disclosure]") ?? []).map(
      (element) => ({
        selector: selectorFor(element),
        open: element instanceof HTMLDetailsElement ? element.open : element.dataset.expanded === "true",
      }),
    ),
  };
}

/** One scroll owner for URL transitions, streamed content, refresh and history. */
export function ScrollNavigation() {
  useEffect(() => {
    const positions: Record<string, Position> = {};
    try {
      const stored: unknown = JSON.parse(
        sessionStorage.getItem(STORAGE_KEY) ?? "{}",
      );
      if (stored && typeof stored === "object") {
        for (const [key, value] of Object.entries(stored)) {
          if (
            value &&
            Number.isFinite(value.x) &&
            Number.isFinite(value.y) &&
            Array.isArray(value.regions) &&
            Array.isArray(value.disclosures)
          )
            positions[key] = value;
        }
      }
    } catch {
      /* Storage is optional. */
    }
    let currentEntry = String(
      history.state?.[STATE_KEY] ?? crypto.randomUUID(),
    );
    let currentRoute = routeKey(location.href);
    let pending: Request | undefined;
    let frame = 0;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;
    let expiryTimer: ReturnType<typeof setTimeout> | undefined;
    let lastPosition: Position | undefined;
    const previousRestoration = history.scrollRestoration;
    history.scrollRestoration = "manual";
    history.replaceState({ ...history.state, [STATE_KEY]: currentEntry }, "");

    function persist() {
      if (!lastPosition) return;
      delete positions[`entry:${currentEntry}`];
      delete positions[`route:${currentRoute}`];
      positions[`entry:${currentEntry}`] = lastPosition;
      positions[`route:${currentRoute}`] = lastPosition;
      const keys = Object.keys(positions);
      for (const key of keys.slice(0, Math.max(0, keys.length - 100)))
        delete positions[key];
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
      } catch {
        /* Still works in memory. */
      }
    }
    function save() {
      if (pending) return;
      lastPosition = capture();
      persist();
    }
    function finish() {
      if (!pending) return;
      currentRoute = routeKey(location.href);
      currentEntry = pending.restoreEntry ?? crypto.randomUUID();
      history.replaceState({ ...history.state, [STATE_KEY]: currentEntry }, "");
      pending = undefined;
      clearTimeout(settleTimer);
      clearTimeout(expiryTimer);
      save();
    }
    function begin(request: Request) {
      clearTimeout(settleTimer);
      clearTimeout(expiryTimer);
      pending = request;
      // Recovery for errors or destinations without resolved-content markers.
      expiryTimer = setTimeout(finish, 5000);
      schedule();
    }
    function find(selector?: string) {
      if (!selector) return null;
      try {
        return document.querySelector<HTMLElement>(selector);
      } catch {
        return null;
      }
    }
    function restore() {
      frame = 0;
      const request = pending;
      if (!request || routeKey(location.href) !== routeKey(request.href))
        return;
      const ready = Array.from(
        document.querySelectorAll<HTMLElement>("[data-scroll-content-ready]"),
      ).some(
        (marker) =>
          !marker.parentElement?.closest("[hidden]") &&
          routeKey(marker.dataset.scrollContentReady!) ===
            routeKey(location.href),
      );
      if (!ready) return;
      if (document.fonts.status === "loading") {
        void document.fonts.ready.then(schedule);
        return;
      }
      const { position } = request;
      if (request.mode === "restore") {
        for (const disclosure of position.disclosures) {
          const element = find(disclosure.selector);
          if (element instanceof HTMLDetailsElement)
            element.open = disclosure.open;
          else if (element?.hasAttribute("data-scroll-disclosure"))
            element.dispatchEvent(new CustomEvent("restore-scroll-disclosure", { detail: disclosure.open }));
        }
        for (const region of position.regions)
          find(region.selector)?.scrollTo(region.left, region.top);
      }
      let y = request.mode === "top" ? 0 : position.y;
      let focus: HTMLElement | null = null;
      if (request.mode === "results" && request.hash) {
        const target = document.getElementById(request.hash);
        if (!target) return;
        y = window.scrollY + target.getBoundingClientRect().top - 16;
        focus = target;
      } else if (request.anchor) {
        const anchor = find(request.anchor.selector);
        if (anchor)
          y =
            window.scrollY +
            anchor.getBoundingClientRect().top -
            request.anchor.offset;
      }
      window.scrollTo({
        left: request.mode === "top" ? 0 : position.x,
        top: Math.max(0, y),
        behavior: "instant",
      });
      if (
        request.mode === "restore" ||
        request.mode === "preserve" ||
        request.mode === "tabs"
      )
        focus = find(position.focus);
      if (focus) {
        if (request.mode === "results" && !focus.hasAttribute("tabindex"))
          focus.tabIndex = -1;
        focus.focus({ preventScroll: true });
      }
      clearTimeout(settleTimer);
      // A streamed page can expose its marker before the rest of its HTML.
      // Keep the saved offset until the document can accommodate it.
      if (
        request.mode === "restore" &&
        document.documentElement.scrollHeight - window.innerHeight < y - 2
      )
        return;
      settleTimer = setTimeout(finish, 150);
    }
    function schedule() {
      if (!pending || frame) return;
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(restore);
      });
    }
    navigate = (href, mode, source) => {
      const url = new URL(href, location.href);
      if (url.origin !== location.origin) return;
      save();
      const resolvedMode =
        mode ??
        (url.hash
          ? "results"
          : url.pathname === location.pathname
            ? "preserve"
            : "top");
      const position =
        resolvedMode === "restore"
          ? (positions[`route:${routeKey(href)}`] ?? {
              x: 0,
              y: 0,
              regions: [],
              disclosures: [],
            })
          : capture();
      const anchor = source?.closest<HTMLElement>(
        "form, nav, [data-scroll-anchor]",
      );
      begin({
        href,
        mode: resolvedMode,
        position,
        hash: url.hash ? fragmentId(url.hash) : undefined,
        anchor:
          anchor && (resolvedMode === "preserve" || resolvedMode === "tabs")
            ? {
                selector: selectorFor(anchor),
                offset:
                  resolvedMode === "tabs"
                    ? Math.max(0, anchor.getBoundingClientRect().top)
                    : anchor.getBoundingClientRect().top,
              }
            : undefined,
      });
    };
    const onPop = () => {
      persist();
      const entry = history.state?.[STATE_KEY] as string | undefined;
      const position =
        positions[`entry:${entry}`] ??
        positions[`route:${routeKey(location.href)}`];
      begin({
        href: location.href,
        mode: position ? "restore" : "top",
        restoreEntry: entry,
        position: position ?? { x: 0, y: 0, regions: [], disclosures: [] },
      });
    };
    let captureFrame = 0;
    const onScroll = () => {
      if (pending || captureFrame) return;
      captureFrame = requestAnimationFrame(() => {
        captureFrame = 0;
        if (!pending) {
          lastPosition = capture();
          persist();
        }
      });
    };
    const onInput = (event: Event) => {
      if (
        event instanceof KeyboardEvent &&
        ![
          "ArrowDown",
          "ArrowUp",
          "PageDown",
          "PageUp",
          "Home",
          "End",
          " ",
          "Tab",
        ].includes(event.key)
      )
        return;
      if (pending) finish();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") persist();
    };
    window.addEventListener("popstate", onPop);
    window.addEventListener("pagehide", persist);
    window.addEventListener("scroll", onScroll, {
      passive: true,
      capture: true,
    });
    window.addEventListener("wheel", onInput, { passive: true });
    window.addEventListener("touchstart", onInput, { passive: true });
    window.addEventListener("keydown", onInput);
    document.addEventListener("visibilitychange", onVisibility);
    const mutations = new MutationObserver(schedule);
    mutations.observe(document.getElementById("main-content")!, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-scroll-content-ready"],
    });
    const resize = new ResizeObserver(schedule);
    resize.observe(document.body);
    const type = (
      performance.getEntriesByType("navigation")[0] as
        PerformanceNavigationTiming | undefined
    )?.type;
    const saved =
      positions[`entry:${currentEntry}`] ?? positions[`route:${currentRoute}`];
    if ((type === "reload" || type === "back_forward") && saved) {
      begin({
        href: location.href,
        mode: "restore",
        position: saved,
        restoreEntry: currentEntry,
      });
    } else if (location.hash) {
      begin({
        href: location.href,
        mode: "results",
        position: capture(),
        hash: fragmentId(location.hash),
        restoreEntry: currentEntry,
      });
    }
    return () => {
      navigate = undefined;
      clearTimeout(settleTimer);
      clearTimeout(expiryTimer);
      cancelAnimationFrame(frame);
      cancelAnimationFrame(captureFrame);
      mutations.disconnect();
      resize.disconnect();
      history.scrollRestoration = previousRestoration;
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("pagehide", persist);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("wheel", onInput);
      window.removeEventListener("touchstart", onInput);
      window.removeEventListener("keydown", onInput);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
  return null;
}
