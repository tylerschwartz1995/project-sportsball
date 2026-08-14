"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import type { WorkspaceWidth } from "@/app/_components/workspace-primitives";

export type ViewTab<T extends string = string> = {
  id: T;
  label: string;
  href: string;
  prefetch?: boolean;
};

export function ViewTabs<T extends string>({
  active,
  ariaLabel,
  tabs,
  secondary = false,
  width = "wide",
  label = "View",
}: {
  active: T;
  ariaLabel: string;
  tabs: ViewTab<T>[];
  secondary?: boolean;
  width?: WorkspaceWidth;
  label?: string;
}) {
  const navigationRef = useRef<HTMLElement>(null);
  const widthClass =
    width === "wide" ? "" : ` workspace-width-${width}`;

  useLayoutEffect(() => {
    keepActiveLinkVisible(navigationRef.current);
  }, [active]);

  useEffect(() => {
    navigationRef.current?.setAttribute("data-navigation-ready", "true");
  }, []);

  return (
    <nav
      ref={navigationRef}
      aria-label={ariaLabel}
      className={`workspace-scroll-nav${secondary ? " is-secondary" : ""}${widthClass}`}
    >
      <span className="workspace-navigation-label" aria-hidden="true">{label}</span>
      {tabs.map((tab) => (
        <ViewTabLink key={tab.id} tab={tab} active={active === tab.id} />
      ))}
    </nav>
  );
}

function ViewTabLink<T extends string>({
  tab,
  active,
}: {
  tab: ViewTab<T>;
  active: boolean;
}) {
  const [hasNavigationIntent, setHasNavigationIntent] = useState(false);
  const allowIntentPrefetch = tab.prefetch !== false;

  function rememberScroll() {
    const targetUrl = new URL(tab.href, window.location.href);
    preserveScrollThroughNavigation(
      `${targetUrl.pathname}${targetUrl.search}`,
      window.scrollY,
    );
  }

  return (
    <Link
      href={tab.href}
      aria-current={active ? "page" : undefined}
      prefetch={tab.prefetch === true || hasNavigationIntent}
      scroll={false}
      onNavigate={rememberScroll}
      onFocus={() => {
        if (allowIntentPrefetch) setHasNavigationIntent(true);
      }}
      onMouseEnter={() => {
        if (allowIntentPrefetch) setHasNavigationIntent(true);
      }}
      onTouchStart={() => {
        if (allowIntentPrefetch) setHasNavigationIntent(true);
      }}
    >
      <ViewTabContent label={tab.label} />
    </Link>
  );
}

function ViewTabContent({ label }: { label: string }) {
  const { pending } = useLinkStatus();

  return (
    <>
      <span>{label}</span>
      {pending ? (
        <span className="workspace-tab-pending" role="status">
          <span className="sr-only">Loading {label}</span>
        </span>
      ) : null}
    </>
  );
}

const navigationScrollDeadlineMs = 5_000;
const settledRouteFrames = 20;

function preserveScrollThroughNavigation(target: string, top: number) {
  const deadline = performance.now() + navigationScrollDeadlineMs;
  let matchingFrames = 0;
  let cancelled = false;

  function cancelForUserScroll() {
    cancelled = true;
  }
  window.addEventListener("wheel", cancelForUserScroll, { once: true });
  window.addEventListener("touchmove", cancelForUserScroll, { once: true });

  function restoreUntilSettled() {
    if (cancelled || performance.now() >= deadline) {
      cleanUp();
      return;
    }

    window.scrollTo({ top, behavior: "instant" });
    const destinationIsRendered = Array.from(
      document.querySelectorAll<HTMLAnchorElement>(
        '.workspace-scroll-nav a[aria-current="page"]',
      ),
    ).some((link) => {
      const activeUrl = new URL(link.href);
      return `${activeUrl.pathname}${activeUrl.search}` === target;
    });
    matchingFrames = destinationIsRendered ? matchingFrames + 1 : 0;
    if (matchingFrames >= settledRouteFrames) {
      cleanUp();
      return;
    }
    requestAnimationFrame(restoreUntilSettled);
  }

  function cleanUp() {
    window.removeEventListener("wheel", cancelForUserScroll);
    window.removeEventListener("touchmove", cancelForUserScroll);
  }

  restoreUntilSettled();
}

function keepActiveLinkVisible(navigation: HTMLElement | null) {
  const activeLink = navigation?.querySelector<HTMLElement>(
    'a[aria-current="page"]',
  );
  if (!navigation || !activeLink) return;

  const navigationRect = navigation.getBoundingClientRect();
  const activeRect = activeLink.getBoundingClientRect();
  if (
    activeRect.left >= navigationRect.left &&
    activeRect.right <= navigationRect.right
  ) {
    return;
  }

  navigation.scrollTo({
    left:
      navigation.scrollLeft +
      activeRect.left -
      navigationRect.left -
      (navigation.clientWidth - activeRect.width) / 2,
    behavior: "instant",
  });
}
