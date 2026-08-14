"use client";

import { useState, type MouseEvent } from "react";

import type { ScheduleStrengthMetric } from "@/contracts/schedule-strength";
import {
  scheduleStrengthMetricDefinitions,
  scheduleStrengthMetricOptions,
} from "@/lib/schedule-strength-metrics";

const scheduleContextSuffix =
  "Completed-game ratings are frozen at the matchup date; remaining-game ratings use only results available now.";

export function ScheduleStrengthMetricControl({
  initialMetric,
}: {
  initialMetric: ScheduleStrengthMetric;
}) {
  const [activeMetric, setActiveMetric] = useState(initialMetric);

  function selectMetric(
    event: MouseEvent<HTMLButtonElement>,
    nextMetric: ScheduleStrengthMetric,
  ) {
    const section = event.currentTarget.closest<HTMLElement>(
      ".workspace-schedule-strength",
    );
    if (!section || nextMetric === activeMetric) return;

    section.dataset.strengthMetric = nextMetric;
    section.dataset.sortVariant = nextMetric;
    setActiveMetric(nextMetric);
    replaceShareableMetric(nextMetric);
  }

  return (
    <>
      <div
        className="mt-2 grid max-w-2xl"
        data-strength-description-stack
      >
        {scheduleStrengthMetricOptions.map((metric) => (
          <p
            key={metric}
            data-strength-description={metric}
            aria-hidden={activeMetric === metric ? undefined : true}
            className="col-start-1 row-start-1 text-sm leading-6 text-slate-400"
          >
            {scheduleStrengthMetricDefinitions[metric].description}{" "}
            {scheduleContextSuffix}
          </p>
        ))}
      </div>

      <nav
        className="workspace-standings-scope mt-5"
        aria-label="Strength of schedule definition"
      >
        {scheduleStrengthMetricOptions.map((metric) => (
          <button
            key={metric}
            type="button"
            onClick={(event) => selectMetric(event, metric)}
            aria-current={activeMetric === metric ? "page" : undefined}
          >
            {scheduleStrengthMetricDefinitions[metric].label}
          </button>
        ))}
      </nav>
    </>
  );
}

function replaceShareableMetric(metric: ScheduleStrengthMetric) {
  const url = new URL(window.location.href);
  url.searchParams.set("sos", metric);
  window.history.replaceState(
    window.history.state,
    "",
    `${url.pathname}?${url.searchParams.toString()}${url.hash}`,
  );

  document
    .querySelectorAll<HTMLInputElement>('input[name="sos"]')
    .forEach((input) => {
      input.value = metric;
    });

  document
    .querySelectorAll<HTMLAnchorElement>(
      'a[data-preserved-search-parameters~="sos"]',
    )
    .forEach((link) => {
      const target = new URL(link.href);
      target.searchParams.set("sos", metric);
      link.href = `${target.pathname}?${target.searchParams.toString()}${target.hash}`;
    });
}
