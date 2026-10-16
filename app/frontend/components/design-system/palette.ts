export interface PaletteEntry {
  name: string;
  utility: string;
  hexLight: string;
  hexDark: string;
}

export const SURFACES: PaletteEntry[] = [
  {
    name: "page",
    utility: "bg-page",
    hexLight: "#ffffff",
    hexDark: "#020617",
  },
  {
    name: "surface",
    utility: "bg-surface",
    hexLight: "#f8fafc",
    hexDark: "#0f172a",
  },
  {
    name: "hairline",
    utility: "border-hairline",
    hexLight: "#e2e8f0",
    hexDark: "#1e293b",
  },
];

export const TEXT: PaletteEntry[] = [
  {
    name: "ink-body",
    utility: "text-ink-body",
    hexLight: "#334155",
    hexDark: "#e2e8f0",
  },
  {
    name: "ink-display",
    utility: "text-ink-display",
    hexLight: "#0f172a",
    hexDark: "#f8fafc",
  },
  {
    name: "ink-muted",
    utility: "text-ink-muted",
    hexLight: "#64748b",
    hexDark: "#94a3b8",
  },
];

export const SPLASH: PaletteEntry[] = [
  {
    name: "accent",
    utility: "bg-accent / text-accent",
    hexLight: "oklch(71.5% 0.143 215.221)",
    hexDark: "oklch(78.9% 0.154 211.53)",
  },
  {
    name: "accent-faded",
    utility: "bg-accent-faded",
    hexLight: "oklch(96% 0.025 215.221)",
    hexDark: "oklch(22% 0.045 211.53)",
  },
  {
    name: "accent-display",
    utility: "bg-accent-display / text-accent-display",
    hexLight: "oklch(62% 0.135 215.221)",
    hexDark: "oklch(86% 0.135 211.53)",
  },
  {
    name: "signal",
    utility: "bg-signal / text-signal",
    hexLight: "#fcd34d",
    hexDark: "#fcd34d",
  },
  {
    name: "signal-faded",
    utility: "bg-signal-faded",
    hexLight: "#fffaea",
    hexDark: "#2f2b21",
  },
  {
    name: "signal-display",
    utility: "bg-signal-display / text-signal-display",
    hexLight: "oklch(76% 0.165 82)",
    hexDark: "oklch(93% 0.13 95)",
  },
  {
    name: "danger",
    utility: "bg-danger / text-danger",
    hexLight: "oklch(64% 0.22 25)",
    hexDark: "oklch(72% 0.20 22)",
  },
  {
    name: "danger-faded",
    utility: "bg-danger-faded",
    hexLight: "oklch(96% 0.025 25)",
    hexDark: "oklch(22% 0.05 22)",
  },
  {
    name: "danger-display",
    utility: "bg-danger-display / text-danger-display",
    hexLight: "oklch(55% 0.20 25)",
    hexDark: "oklch(82% 0.18 22)",
  },
];

export const JERSEYS: PaletteEntry[] = [
  {
    name: "jersey-black",
    utility: "bg-jersey-black",
    hexLight: "#18181b",
    hexDark: "#18181b",
  },
  {
    name: "jersey-white",
    utility: "bg-jersey-white",
    hexLight: "#fafafa",
    hexDark: "#fafafa",
  },
  {
    name: "jersey-orange",
    utility: "bg-jersey-orange",
    hexLight: "#f97316",
    hexDark: "#f97316",
  },
  {
    name: "jersey-blue",
    utility: "bg-jersey-blue",
    hexLight: "#2563eb",
    hexDark: "#2563eb",
  },
  {
    name: "jersey-red",
    utility: "bg-jersey-red",
    hexLight: "#dc2626",
    hexDark: "#dc2626",
  },
  {
    name: "jersey-green",
    utility: "bg-jersey-green",
    hexLight: "#16a34a",
    hexDark: "#16a34a",
  },
];

export const FONTS = {
  display: "Stack Sans Text",
  body: "DM Sans",
};
