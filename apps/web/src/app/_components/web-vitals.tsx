"use client";

import { useReportWebVitals } from "next/web-vitals";

type WebVitalMetric = Parameters<typeof useReportWebVitals>[0] extends (
  metric: infer Metric,
) => void
  ? Metric
  : never;

const configuredRate = Number(
  process.env.NEXT_PUBLIC_WEB_VITALS_SAMPLE_RATE ?? "0.1",
);
const sampleRate = Number.isFinite(configuredRate)
  ? Math.min(Math.max(configuredRate, 0), 1)
  : 0.1;
const sampled = Math.random() < sampleRate;

function reportWebVital(metric: WebVitalMetric) {
  if (!sampled) return;

  const body = JSON.stringify({
    id: metric.id,
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    navigationType: metric.navigationType,
    path: window.location.pathname,
  });
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/web-vitals", body);
    return;
  }
  void fetch("/api/web-vitals", {
    method: "POST",
    body,
    headers: { "Content-Type": "application/json" },
    keepalive: true,
  });
}

export function WebVitals() {
  useReportWebVitals(reportWebVital);
  return null;
}
