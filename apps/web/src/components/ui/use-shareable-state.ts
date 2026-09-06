"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { prepareScrollNavigation } from "@/components/shell/scroll-navigation";
import { resolveUrlChoice } from "@/lib/shareable-state";

export function useUrlChoice<T extends string>(
  parameter: string,
  choices: readonly T[],
  fallback: T,
): [T, (value: T) => void] {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requested = searchParams.get(parameter);
  const value = resolveUrlChoice(requested, choices, fallback);

  const setValue = useCallback(
    (next: T) => {
      const params = new URLSearchParams(window.location.search);
      if (next === fallback) params.delete(parameter);
      else params.set(parameter, next);
      const query = params.toString();
      prepareScrollNavigation(`${pathname}${query ? `?${query}` : ""}${window.location.hash}`, "preserve");
      window.history.replaceState(
        null,
        "",
        `${pathname}${query ? `?${query}` : ""}${window.location.hash}`,
      );
    },
    [fallback, parameter, pathname],
  );

  return [value, setValue];
}

export function useUrlBoolean(
  parameter: string,
  fallback: boolean,
): [boolean, (value: boolean) => void] {
  const choices = ["true", "false"] as const;
  const [value, setValue] = useUrlChoice(
    parameter,
    choices,
    String(fallback) as (typeof choices)[number],
  );
  return [value === "true", (next) => setValue(String(next) as (typeof choices)[number])];
}
