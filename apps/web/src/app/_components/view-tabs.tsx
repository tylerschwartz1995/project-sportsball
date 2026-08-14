"use client";

import Link from "next/link";
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
  preservedSearchParameters?: string[];
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

  return (
    <Link
      href={tab.href}
      aria-current={active ? "page" : undefined}
      data-preserved-search-parameters={
        tab.preservedSearchParameters?.join(" ")
      }
      prefetch={tab.prefetch === true || hasNavigationIntent}
      scroll={false}
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
      <span>{tab.label}</span>
    </Link>
  );
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
