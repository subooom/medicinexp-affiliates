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
