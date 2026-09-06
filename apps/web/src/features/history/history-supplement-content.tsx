"use client";
import { useEffect, useState } from "react";
import type { getHistorySupplement } from "@/data/history-supplement";
import { HistoryRecordProgression, HistoryScoringEnvironment } from "@/features/charts/lazy-charts";
import { HistoryDecadeLeaders, HistoryGoalieDecadeLeaders } from "./history-decade-leaders";
type Data = Awaited<ReturnType<typeof getHistorySupplement>>;
export default function HistorySupplementContent({ phase, view }: { phase: string; view: "records" | "skaters" | "goalies" }) {
  const [data, setData] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/history/supplement?phase=${phase}&view=${view}`, { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error(); return response.json() as Promise<Data>; })
      .then(setData).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [phase, view, attempt]);
  if (failed) return <p role="alert">History could not be loaded. <button onClick={() => { setFailed(false); setAttempt(attempt + 1); }}>Retry</button></p>;
  if (!data) return <p role="status">Loading history…</p>;
  return view === "records" ? <HistoryRecordProgression points={data.progression} /> : <>
    <p>League-wide context; ranking filters do not apply.</p>
    <HistoryScoringEnvironment points={data.trend} view={view} />
    {view === "goalies" ? <HistoryGoalieDecadeLeaders rows={data.goalies} minimumGames={data.minimumGames} /> : <HistoryDecadeLeaders rows={data.skaters} />}
  </>;
}
