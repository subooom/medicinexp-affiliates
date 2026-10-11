import { AppColors } from '@/constants/colors';

export function getLeadStatusColor(colors: AppColors, status: string): string {
  switch (status) {
    case 'converted':
      return colors.success;
    case 'qualified':
      return colors.info;
    case 'contacted':
      return colors.warning;
    case 'new':
      return colors.primary;
    case 'lost':
      return colors.destructive;
    default:
      return colors.mutedForeground;
  }
}

export function getCommissionStatusColor(colors: AppColors, status: string): string {
  switch (status) {
    case 'paid':
      return colors.success;
    case 'approved':
      return colors.info;
    case 'pending':
      return colors.warning;
    case 'cancelled':
      return colors.destructive;
    default:
      return colors.mutedForeground;
  }
}

export function getVisitStatusColor(colors: AppColors, status: string): string {
  switch (status) {
    case 'completed':
      return colors.success;
    case 'cancelled':
      return colors.destructive;
    default:
      return colors.info;
  }
}
