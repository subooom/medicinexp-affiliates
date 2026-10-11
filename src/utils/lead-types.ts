// src/utils/lead-types.ts
import { AppColors } from '@/constants/colors';
import { LeadStatus, LeadType } from '@/types/models';
import { IconName } from '@/utils/icons';

export const LEAD_TYPES: { value: LeadType; label: string; icon: IconName; description: string }[] = [
  { value: 'organization', label: 'Pharmacy / clinic', icon: 'business-outline', description: 'The business itself might sign up' },
  { value: 'customer', label: 'Customer', icon: 'person-outline', description: 'An owner or buyer you met' },
  { value: 'associate', label: 'Associate', icon: 'people-outline', description: 'Someone linked to a pharmacy or company' },
  { value: 'contact', label: 'Contact', icon: 'call-outline', description: 'Someone who can introduce you' },
];

export const LEAD_STATUSES: { value: LeadStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Interested' },
  { value: 'converted', label: 'Customer' },
  { value: 'lost', label: 'Lost' },
];

export const leadTypeInfo = (type: LeadType) => LEAD_TYPES.find((t) => t.value === type) ?? LEAD_TYPES[1];

export const leadStatusLabel = (status: LeadStatus) => LEAD_STATUSES.find((s) => s.value === status)?.label ?? status;

export const leadTypeColor = (type: LeadType, colors: AppColors): string => {
  switch (type) {
    case 'organization':
      return colors.success;
    case 'associate':
      return colors.warning;
    case 'contact':
      return colors.info;
    default:
      return colors.primary;
  }
};
