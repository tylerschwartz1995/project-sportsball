"use client";

import { useSyncExternalStore } from "react";
import {
  palettes, typefaces, paletteStorageKey, typefaceStorageKey,
  type Palette, type Typeface,
} from "@/lib/appearance";

const changeEvent = "sportsball-appearance-change";
function subscribe(callback: () => void) {
  window.addEventListener(changeEvent, callback);
  return () => window.removeEventListener(changeEvent, callback);
}
function readPalette() {
  return document.documentElement.dataset.palette ?? "copper";
}
function readTypeface() {
  return document.documentElement.dataset.typeface ?? "georgia";
}
function applyAppearance(palette: Palette, typeface: Typeface) {
  const root = document.documentElement;
  root.dataset.palette = palette;
  root.dataset.typeface = typeface;
  try {
    localStorage.setItem(paletteStorageKey, palette);
    localStorage.setItem(typefaceStorageKey, typeface);
  } catch {
    // Selection still applies to this page when browser storage is blocked.
  }
  window.dispatchEvent(new Event(changeEvent));
}

export function StyleStudio() {
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  const palette = useSyncExternalStore(subscribe, readPalette, () => "copper");
  const typeface = useSyncExternalStore(subscribe, readTypeface, () => "georgia");
  const selectedPalette = palettes.find((option) => option.id === palette) ?? palettes[0];
  const selectedTypeface = typefaces.find((option) => option.id === typeface) ?? typefaces[0];

  return (
    <details className="record-style-studio">
      <summary>
        <span>Style Studio <span aria-hidden="true">↗</span></span>
        <small>{selectedPalette.name} / {selectedTypeface.name}</small>
      </summary>
      <div className="record-studio-content">
        <p>Try a pairing, or mix your own. Use the sun or moon above to compare light and dark.</p>
        <div className="record-style-pairings" role="group" aria-label="Suggested style pairings">
          {palettes.map((option, index) => (
            <button
              key={option.id}
              type="button"
              disabled={!ready}
              data-swatch={option.id}
              aria-pressed={palette === option.id && typeface === typefaces[index].id}
              onClick={() => applyAppearance(option.id, typefaces[index].id)}
            >
              <i aria-hidden="true" />
              <span>{option.name}<small>{typefaces[index].name}</small></span>
            </button>
          ))}
        </div>
        <div className="record-style-controls">
          <label>
            Colour Palette
            <select disabled={!ready} value={selectedPalette.id} onChange={(event) => {
              const next = palettes.find((option) => option.id === event.target.value);
              if (next) applyAppearance(next.id, selectedTypeface.id);
            }}>
              {palettes.map((option) => <option value={option.id} key={option.id}>{option.name}</option>)}
            </select>
          </label>
          <label>
            Typography
            <select disabled={!ready} value={selectedTypeface.id} onChange={(event) => {
              const next = typefaces.find((option) => option.id === event.target.value);
              if (next) applyAppearance(selectedPalette.id, next.id);
            }}>
              {typefaces.map((option) => <option value={option.id} key={option.id}>{option.name}</option>)}
            </select>
          </label>
          <button type="button" disabled={!ready} onClick={() => applyAppearance("copper", "georgia")}>Reset Style</button>
        </div>
        <p className="record-style-description" aria-live="polite">
          {selectedPalette.description} {selectedTypeface.description}
        </p>
      </div>
    </details>
  );
}
