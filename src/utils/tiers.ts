// src/utils/tiers.ts
import { CommissionScheduleEntry } from '@/types/models';
import { formatRate } from '@/utils/money';

const REQUIREMENT_LABELS: Record<string, string> = {
  sales: 'pharmacies signed up',
  visits: 'visits',
  leads: 'leads',
};

export const requirementLabel = (key: string) => REQUIREMENT_LABELS[key] ?? key;

/**
 * "5% first year, 3% after" style summary of a commission schedule.
 */
export const describeSchedule = (schedule: CommissionScheduleEntry[]): string => {
  const sorted = [...schedule].sort((a, b) => a.from_year - b.from_year);
  if (sorted.length === 0) return 'No commission';

  return sorted
    .map((entry, index) => {
      const next = sorted[index + 1];
      if (entry.from_year === 1 && next?.from_year === 2) return `${formatRate(entry.rate_bp)} first year`;
      if (!next) return `${formatRate(entry.rate_bp)} ${entry.from_year === 1 ? 'every year' : `from year ${entry.from_year}`}`;
      return `${formatRate(entry.rate_bp)} years ${entry.from_year}–${next.from_year - 1}`;
    })
    .join(', ');
};
