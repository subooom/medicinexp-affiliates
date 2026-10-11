function oklchToHex(L, C, H) {
  L = L > 1 ? L / 100 : L;
  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  let r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  let bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  const toSrgb = (x) => (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);
  r = Math.round(Math.min(1, Math.max(0, toSrgb(r))) * 255);
  g = Math.round(Math.min(1, Math.max(0, toSrgb(g))) * 255);
  bl = Math.round(Math.min(1, Math.max(0, toSrgb(bl))) * 255);
  return `#${[r, g, bl].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

const tokens = {
  background: [0.9684, 0.0108, 256.69],
  backgroundForeground: [0.1339, 0.043, 272.68],
  foreground: [0.16, 0.04, 284],
  card: [1, 0, 0],
  cardForeground: [0.141, 0.005, 285.823],
  cardAccent: [0.71, 0.17, 280.63],
  popover: [1, 0, 0],
  popoverForeground: [0.141, 0.005, 285.823],
  primary50: [0.9576, 0.015, 282.02],
  primary100: [0.9145, 0.029, 281.52],
  primary200: [0.8217, 0.062, 279.87],
  primary300: [0.7375, 0.094, 279.08],
  primary400: [0.6539, 0.125, 276.69],
  primary500: [0.5693, 0.155, 273.69],
  primary600: [0.4782, 0.159, 271.4],
  primary700: [0.3874, 0.129, 271.32],
  primary800: [0.3001, 0.1, 271.44],
  primary900: [0.2007, 0.067, 271.48],
  primary950: [0.1339, 0.043, 272.68],
  primary: [0.3909, 0.1381, 280.49],
  primaryForeground: [0.9684, 0.0108, 256.69],
  green500: [0.568, 0.17, 152.3],
  green600: [0.478, 0.15, 152],
  secondary: [0.88, 0.06, 180],
  secondaryForeground: [0.25, 0.05, 180],
  muted: [0.96, 0.012, 100],
  mutedForeground: [0.55, 0.03, 100],
  accent: [0.88, 0.07, 100],
  accentForeground: [0.2, 0.05, 100],
  destructive: [0.58, 0.24, 27],
  border: [0.92, 0.015, 100],
  input: [0.92, 0.015, 100],
  ring: [0.7, 0.025, 100],
  darkBackground: [0.9576, 0.015, 282.02],
  darkCard: [0.16, 0.06, 281.43],
  darkCardAccent: [0.48337, 0.292, 268.309],
  darkPrimary: [0.65, 0.2, 279.21],
  darkPrimary50: [0.1709, 0.068, 278.96],
  darkPrimary900: [0.8991, 0.034, 285.73],
  darkForeground: [0.2007, 0.067, 271.48],
  darkMuted: [0.28, 0.05, 190],
  darkMutedForeground: [0.7, 0.03, 190],
  darkBorder: [0.35, 0.025, 190],
  darkSecondary: [0.6, 0.21, 190],
};

for (const [name, vals] of Object.entries(tokens)) {
  console.log(`${name}: '${oklchToHex(...vals)}',`);
}
