// Lucide icon path data (ISC License, https://lucide.dev)
// Add new icons here as needed. Each entry is an array of [tag, attrs] tuples.
// To add a new icon: find it at https://lucide.dev, copy the SVG elements,
// convert to [tag, attrs][] format and add below.

export type IconNode = [string, Record<string, string>][];

export const icons = {
  "file-text": [
    [
      "path",
      {
        d: "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",
      },
    ],
    ["path", { d: "M14 2v5a1 1 0 0 0 1 1h5" }],
    ["path", { d: "M10 9H8" }],
    ["path", { d: "M16 13H8" }],
    ["path", { d: "M16 17H8" }],
  ],
  folder: [
    [
      "path",
      {
        d: "M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z",
      },
    ],
  ],
  "folder-open": [
    [
      "path",
      {
        d: "m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2",
      },
    ],
  ],
  file: [
    [
      "path",
      {
        d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z",
      },
    ],
    ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4" }],
  ],
  "chevron-right": [["path", { d: "m9 18 6-6-6-6" }]],
  save: [
    [
      "path",
      {
        d: "M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",
      },
    ],
    ["path", { d: "M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" }],
    ["path", { d: "M7 3v4a1 1 0 0 0 1 1h7" }],
  ],
  settings: [
    [
      "path",
      {
        d: "M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915",
      },
    ],
    ["circle", { cx: "12", cy: "12", r: "3" }],
  ],
  "panel-left": [
    ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
    ["path", { d: "M9 3v18" }],
  ],
  "panel-left-close": [
    ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
    ["path", { d: "M9 3v18" }],
    ["path", { d: "m16 15-3-3 3-3" }],
  ],
  "wrap-text": [
    ["path", { d: "M3 6h18" }],
    ["path", { d: "M3 12h15a3 3 0 1 1 0 6h-4" }],
    ["polyline", { points: "16 16 14 18 16 20" }],
    ["path", { d: "M3 18h7" }],
  ],
  plus: [
    ["path", { d: "M5 12h14" }],
    ["path", { d: "M12 5v14" }],
  ],
  x: [
    ["path", { d: "M18 6 6 18" }],
    ["path", { d: "m6 6 12 12" }],
  ],
  // Context-menu icons (MDP-19).
  copy: [
    ["rect", { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2" }],
    ["path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" }],
  ],
  // Render-mode toggle icons (MDP-15): eye = rendered, panel-top = mixed,
  // code = raw.
  eye: [
    [
      "path",
      {
        d: "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",
      },
    ],
    ["circle", { cx: "12", cy: "12", r: "3" }],
  ],
  "panel-top": [
    ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
    ["path", { d: "M3 9h18" }],
  ],
  code: [
    ["path", { d: "m16 18 6-6-6-6" }],
    ["path", { d: "m8 6-6 6 6 6" }],
  ],
  // Formatting toolbar icons (MDP-16).
  bold: [
    [
      "path",
      {
        d: "M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8",
      },
    ],
  ],
  italic: [
    ["line", { x1: "19", x2: "10", y1: "4", y2: "4" }],
    ["line", { x1: "14", x2: "5", y1: "20", y2: "20" }],
    ["line", { x1: "15", x2: "9", y1: "4", y2: "20" }],
  ],
  underline: [
    ["path", { d: "M6 4v6a6 6 0 0 0 12 0V4" }],
    ["line", { x1: "4", x2: "20", y1: "20", y2: "20" }],
  ],
  // `code-xml` (Lucide) — distinct from `code` (raw-mode toggle); used for the
  // inline-code formatting action.
  "code-xml": [
    ["path", { d: "m18 16 4-4-4-4" }],
    ["path", { d: "m6 8-4 4 4 4" }],
    ["path", { d: "m14.5 4-5 16" }],
  ],
  // `square-code` (Lucide) — code-fence (block) action.
  "square-code": [
    ["path", { d: "M10 9.5 8 12l2 2.5" }],
    ["path", { d: "m14 9.5 2 2.5-2 2.5" }],
    ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }],
  ],
  // Heading dropdown (MDP-18): `heading` — триггер, `chevron-down` — индикатор.
  heading: [
    ["path", { d: "M6 12h12" }],
    ["path", { d: "M6 20V4" }],
    ["path", { d: "M18 20V4" }],
  ],
  "chevron-down": [["path", { d: "m6 9 6 6 6-6" }]],
} satisfies Record<string, IconNode>;

export type IconName = keyof typeof icons;
