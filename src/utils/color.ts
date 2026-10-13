// src/utils/color.ts

const parse = (hex: string) => {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean.slice(0, 6);
  const value = parseInt(full, 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
};

const toHex = (r: number, g: number, b: number) =>
  '#' + [r, g, b].map((n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')).join('');

// 0 (black) – 1 (white), perceived brightness
const brightness = (hex: string) => {
  const { r, g, b } = parse(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};

/**
 * A tier colour you can read as text or an icon. Tiers like Silver (#C0C0C0),
 * Platinum and Diamond are near-white, invisible on a light card, so they're darkened
 * there; very dark colours are lightened on the dark theme.
 */
export function readableColor(hex: string | null | undefined, fallback: string, darkMode: boolean): string {
  if (!hex || !/^#?[0-9a-f]{3,8}$/i.test(hex)) return fallback;
  const color = hex.startsWith('#') ? hex : `#${hex}`;
  const { r, g, b } = parse(color);
  const light = brightness(color);

  if (!darkMode && light > 0.62) {
    const k = 0.45 / light; // pull down to ~45% brightness
    return toHex(r * k, g * k, b * k);
  }
  if (darkMode && light < 0.35) {
    const t = 0.45;
    return toHex(r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t);
  }
  return color.slice(0, 7);
}
