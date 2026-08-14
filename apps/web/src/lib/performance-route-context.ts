const CONTEXT_VALUE_PATTERN = /^[a-z0-9-]{1,40}$/;

export type PerformanceRouteContext = {
  routeView?: string;
  routeSubView?: string;
  routePhase?: string;
};

export function performanceRouteContext(
  searchParams: Pick<URLSearchParams, "get">,
): PerformanceRouteContext {
  return compactContext({
    routeView: firstSafeValue(searchParams, ["view", "section"]),
    routeSubView: firstSafeValue(searchParams, [
      "sos",
      "advancedView",
      "display",
      "timelinePeriod",
    ]),
    routePhase: firstSafeValue(searchParams, ["phase"]),
  });
}

export function isPerformanceRouteContextValue(
  value: unknown,
): value is string | undefined {
  return (
    value === undefined ||
    (typeof value === "string" && CONTEXT_VALUE_PATTERN.test(value))
  );
}

function firstSafeValue(
  searchParams: Pick<URLSearchParams, "get">,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = searchParams.get(key);
    if (value && CONTEXT_VALUE_PATTERN.test(value)) return value;
  }
  return undefined;
}

function compactContext(
  context: PerformanceRouteContext,
): PerformanceRouteContext {
  return Object.fromEntries(
    Object.entries(context).filter((entry) => entry[1] !== undefined),
  );
}
