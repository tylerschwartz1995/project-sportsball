"use client";
import Link from "next/link";
import { useState, type ComponentProps } from "react";
import {
  prepareScrollNavigation,
  type ScrollIntent,
} from "@/components/shell/scroll-navigation";

/** Dense tables prefetch on intent and share one navigation/scroll policy. */
export function IntentLink({
  prefetch,
  onFocus,
  onMouseEnter,
  onTouchStart,
  onClick,
  scroll,
  navigation,
  ...props
}: ComponentProps<typeof Link> & { navigation?: ScrollIntent }) {
  const [intent, setIntent] = useState(false);
  const request = () => {
    if (prefetch !== false) setIntent(true);
  };
  return (
    <Link
      {...props}
      scroll={false}
      prefetch={prefetch === true || intent}
      onClick={(event) => {
        onClick?.(event);
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          event.currentTarget.target ||
          event.currentTarget.hasAttribute("download")
        )
          return;
        prepareScrollNavigation(
          event.currentTarget.href,
          navigation ?? (scroll === false ? "preserve" : undefined),
          event.currentTarget,
        );
      }}
      onFocus={(event) => {
        request();
        onFocus?.(event);
      }}
      onMouseEnter={(event) => {
        request();
        onMouseEnter?.(event);
      }}
      onTouchStart={(event) => {
        request();
        onTouchStart?.(event);
      }}
    />
  );
}
