"use client";

import { useLayoutEffect, useRef } from "react";

export function ActiveNavigationScroller({ active }: { active?: string }) {
  const markerRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const navigation = markerRef.current?.parentElement;
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
  }, [active]);

  return <span ref={markerRef} hidden aria-hidden="true" />;
}
