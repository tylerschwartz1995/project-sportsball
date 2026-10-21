"use client";

import { useRouter } from "next/navigation";
import { ContextLink as Link } from "@/components/ui/context-link";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import type { WorkspaceWidth } from "@/components/ui/workspace-primitives";

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
}: {
  active: T;
  ariaLabel: string;
  tabs: ViewTab<T>[];
  secondary?: boolean;
  width?: WorkspaceWidth;
  label?: string;
}) {
  const router = useRouter();
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
    <>
    {tabs.length > 3 && (
      <label className="mobile-view-picker">
        {ariaLabel}
        <select value={active} onChange={event => {
          const tab = tabs.find(item => item.id === event.target.value);
          if (!tab) return;
          // ContextLink resolves return paths and chart choices for both controls.
          const link = Array.from(navigationRef.current?.querySelectorAll<HTMLAnchorElement>("a[data-tab-id]") ?? [])
            .find(item => item.dataset.tabId === tab.id);
          router.push(link?.getAttribute("href") ?? tab.href, { scroll: false });
        }}>
          {tabs.map(tab => <option key={tab.id} value={tab.id}>{tab.label}</option>)}
        </select>
      </label>
    )}
    <nav
      ref={navigationRef}
      data-mobile-select={tabs.length > 3}
      aria-label={ariaLabel}
      className={`workspace-scroll-nav${secondary ? " is-secondary" : ""}${widthClass}`}
    >
      {tabs.map((tab) => (
        <ViewTabLink key={tab.id} tab={tab} active={active === tab.id} />
      ))}
    </nav>
    </>
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
      data-tab-id={tab.id}
      aria-current={active ? "page" : undefined}
      data-preserved-search-parameters={
        tab.preservedSearchParameters?.join(" ")
      }
      prefetch={tab.prefetch === true || hasNavigationIntent}
      navigation="tabs"
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
