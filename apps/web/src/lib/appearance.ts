export const palettes = [
  { id: "copper", name: "Copper", description: "Warm paper, charcoal, and copper." },
  { id: "green", name: "Racing Green", description: "Ivory, deep forest, and brass." },
  { id: "cobalt", name: "Cobalt", description: "Cool white, midnight blue, and electric blue." },
  { id: "oxblood", name: "Oxblood", description: "Blush paper, burgundy, and muted rose." },
] as const;

export const typefaces = [
  { id: "georgia", name: "Georgia", description: "Classic newspaper serif with Geist for statistics." },
  { id: "fraunces", name: "Fraunces", description: "Soft, expressive serif with Geist for statistics." },
  { id: "barlow", name: "Barlow Condensed", description: "Condensed sports-page headings with Geist for statistics." },
  { id: "grotesk", name: "Space Grotesk", description: "Geometric sans serif for headings and reading." },
] as const;

export type Palette = (typeof palettes)[number]["id"];
export type Typeface = (typeof typefaces)[number]["id"];
export const paletteStorageKey = "sportsball-palette";
export const typefaceStorageKey = "sportsball-typeface";
