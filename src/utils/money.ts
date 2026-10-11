// src/utils/money.ts

// The API formats some amounts with PHP's number_format ("1,234.56").
// parseFloat stops at the comma and returns 1, so strip separators first.
export const parseAmount = (value: string | number | null | undefined): number => {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  const parsed = parseFloat(String(value).replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

export const formatRupees = (value: string | number | null | undefined): string =>
  `रू ${parseAmount(value).toFixed(2)}`;

// Amounts from the API are integer paisa (100 paisa = रू 1)
export const formatPaisa = (paisa: number | null | undefined, withDecimals = false): string => {
  const rupees = (paisa ?? 0) / 100;
  return `रू ${rupees.toLocaleString('en-IN', {
    minimumFractionDigits: withDecimals ? 2 : 0,
    maximumFractionDigits: withDecimals ? 2 : 0,
  })}`;
};

// Basis points to a percentage label: 500 -> "5%", 750 -> "7.5%"
export const formatRate = (bp: number | null | undefined): string => `${Number(((bp ?? 0) / 100).toFixed(2))}%`;
