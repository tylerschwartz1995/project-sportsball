"use client";
import Link from "next/link";
import { useState, type ComponentProps } from "react";

/** Dense tables should prefetch destinations when a visitor shows intent. */
export function IntentLink({ prefetch, onFocus, onMouseEnter, onTouchStart, ...props }: ComponentProps<typeof Link>) {
  const [intent, setIntent] = useState(false);
  const request = () => { if (prefetch !== false) setIntent(true); };
  return <Link {...props} prefetch={prefetch === true || intent}
    onFocus={event => { request(); onFocus?.(event); }}
    onMouseEnter={event => { request(); onMouseEnter?.(event); }}
    onTouchStart={event => { request(); onTouchStart?.(event); }} />;
}
