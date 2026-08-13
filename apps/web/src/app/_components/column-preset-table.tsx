"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import { SortableTable } from "@/app/_components/sortable-table";

export type ColumnPreset = {
  value: string;
  label: string;
  description: string;
};

export function ColumnPresetTable({
  children,
  presets,
  defaultPreset = "core",
  defaultSortKey,
  defaultDirection,
  urlBacked = false,
  scrollTarget,
}: {
  children: ReactNode;
  presets: ColumnPreset[];
  defaultPreset?: string;
  defaultSortKey: string;
  defaultDirection?: "asc" | "desc";
  urlBacked?: boolean;
  scrollTarget?: string;
}) {
  const [preset, setPreset] = useState(defaultPreset);
  const active = presets.find((option) => option.value === preset) ?? presets[0];

  return (
    <div className="workspace-column-preset-table" data-column-preset={preset}>
      <div className="workspace-column-preset-toolbar">
        <div>
          <strong>Columns</strong>
          <span aria-live="polite">{active?.description}</span>
        </div>
        <div role="group" aria-label="Visible table columns">
          {presets.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={preset === option.value}
              onClick={() => setPreset(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <SortableTable defaultSortKey={defaultSortKey} defaultDirection={defaultDirection} urlBacked={urlBacked} scrollTarget={scrollTarget}>
        {children}
      </SortableTable>
    </div>
  );
}
