export const theme = {
  colors: {
    ink: "#10233f",
    text: "#17314f",
    subtext: "#58708f",
    muted: "#7d92ad",
    line: "rgba(17, 44, 76, 0.12)",
    lineStrong: "rgba(17, 44, 76, 0.22)",
    surface: "rgba(255, 255, 255, 0.82)",
    surfaceStrong: "#ffffff",
    panel: "#f5f9ff",
    page: "#edf4fb",
    pageDeep: "#d9e8f6",
    accent: "#0b6aa8",
    accentWarm: "#d9822b",
    success: "#1f8f68",
    danger: "#c44b4f",
  },
  gradients: {
    ocean: "linear-gradient(135deg, #0b4f7a 0%, #0b6aa8 45%, #38a3d3 100%)",
    aurora: "linear-gradient(135deg, #0d3758 0%, #18657c 52%, #3eb59f 100%)",
    copper: "linear-gradient(135deg, #8c4a1d 0%, #d9822b 100%)",
    dusk: "linear-gradient(135deg, #283e63 0%, #5a76ac 100%)",
    violet: "linear-gradient(135deg, #4b3f8a 0%, #7f64d9 100%)",
  },
  shadows: {
    soft: "0 18px 48px rgba(15, 46, 79, 0.10)",
    card: "0 22px 60px rgba(18, 46, 78, 0.12)",
    lift: "0 26px 72px rgba(18, 46, 78, 0.16)",
    glow: "0 24px 80px rgba(36, 126, 177, 0.20)",
  },
  radius: {
    sm: 12,
    md: 18,
    lg: 26,
    xl: 34,
  },
  layout: {
    maxWidth: 1240,
  },
  fonts: {
    display: '"Segoe UI Variable Display", "PingFang SC", "Noto Sans SC", "Microsoft YaHei", sans-serif',
    body: '"Segoe UI Variable Text", "PingFang SC", "Noto Sans SC", "Microsoft YaHei", sans-serif',
  },
};

export const tones = {
  ocean: {
    gradient: theme.gradients.ocean,
    soft: "rgba(11, 106, 168, 0.12)",
    solid: "#0b6aa8",
  },
  aurora: {
    gradient: theme.gradients.aurora,
    soft: "rgba(48, 152, 138, 0.14)",
    solid: "#24806f",
  },
  copper: {
    gradient: theme.gradients.copper,
    soft: "rgba(217, 130, 43, 0.12)",
    solid: "#c66d1b",
  },
  dusk: {
    gradient: theme.gradients.dusk,
    soft: "rgba(90, 118, 172, 0.14)",
    solid: "#466094",
  },
  violet: {
    gradient: theme.gradients.violet,
    soft: "rgba(127, 100, 217, 0.14)",
    solid: "#6952c4",
  },
};
