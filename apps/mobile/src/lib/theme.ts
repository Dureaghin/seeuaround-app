/* Shared palette with the marketing site (seeuaround/website/index.source.html :root).
   Dark, warm, a little nostalgic, never flashy. Keep the two in step. */
export const colors = {
  night: "#090807",
  surface: "#141210",
  surface2: "#1B1917",
  /** Opaque panel over the ambient photo — keeps type and hairlines crisp. */
  panel: "rgba(14,12,11,0.92)",
  pane: "#2A2622",
  lamp: "#DF8B32",
  lampHot: "#F7D59A",
  lampDeep: "#9E5314",
  lampGradStart: "#F7D59A",
  lampGradMid: "#DF8B32",
  lampGradEnd: "#C26F1E",
  chalk: "#FAF7F2",
  /** Secondary type — kept a step brighter so grain doesn't swallow it. */
  dim: "#A9A198",
  muted: "#7A736B",
  ink: "#090807",
  line: "rgba(250,247,242,0.12)",
  lineStrong: "rgba(250,247,242,0.28)",
  glassBorder: "rgba(255,247,235,0.18)",
  danger: "#E8876F",
  dangerBorder: "rgba(232,135,111,0.55)",
  dangerBg: "rgba(232,135,111,0.10)",
  fineprintBg: "rgba(20,18,16,0.82)",
  lampTintBg: "rgba(223,139,50,0.12)",
  lampTintBorder: "rgba(223,139,50,0.35)",
  pushBg: "rgba(20,18,16,0.92)",
};

export const spacing = {
  xs: 5,
  sm: 9,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  screenX: 26,
  screenTop: 64,
  screenBottom: 26,
};

export const radius = {
  sm: 6,
  md: 12,
  lg: 15,
  xl: 17,
  pill: 999,
  composer: 23,
};

/* One face throughout, like the site: Inter, bold for display. */
export const fonts = {
  display: "Inter_700Bold",
  displayMedium: "Inter_600SemiBold",
  body: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodySemi: "Inter_600SemiBold",
  mono: "JetBrainsMono_400Regular",
  monoMedium: "JetBrainsMono_500Medium",
};
