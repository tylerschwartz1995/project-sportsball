"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

import { resolveUrlChoice } from "@/lib/shareable-state";

export function useUrlChoice<T extends string>(
  parameter: string,
  choices: readonly T[],
  fallback: T,
): [T, (value: T) => void] {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requested = searchParams.get(parameter);
  const initialValue = resolveUrlChoice(requested, choices, fallback);
  const [localValue, setLocalValue] = useState<T | null>(null);
  const value = localValue !== null && choices.includes(localValue)
    ? localValue
    : initialValue;

  const setValue = useCallback(
    (next: T) => {
      setLocalValue(next);
      const params = new URLSearchParams(window.location.search);
      if (next === fallback) params.delete(parameter);
      else params.set(parameter, next);
      const query = params.toString();
      window.history.replaceState(
        window.history.state,
        "",
        `${pathname}${query ? `?${query}` : ""}${window.location.hash}`,
      );
      document
        .querySelectorAll<HTMLInputElement>(`input[type="hidden"][name="${parameter}"]`)
        .forEach((input) => {
          input.value = next === fallback ? "" : next;
          input.disabled = next === fallback;
        });
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
