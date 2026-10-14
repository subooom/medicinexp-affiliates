// src/utils/contact-sync.ts — lead contacts on the rep's phone, under the app's own
// "MedicineXP" account (native module modules/medicinexp-contacts, Android only).
//
// The call screen (vivo and most Androids) shows Company and Job title on one line, so:
//   Company   = lead status + product      "Interested · Premium plan "
//   Job title = next step / latest event   " Follow up Fri 3 PM · called today"
// vivo joins the two with "-": the padding keeps it readable ("Interested · Premium plan - Follow up…").
// Contacts are matched by phone, never duplicated, and all removed when the rep leaves.
import { LeadStatus } from '@/types/models';
import { leadStatusLabel } from '@/utils/lead-types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { PermissionsAndroid, Platform } from 'react-native';

type NativeContacts = {
  upsert(phone: string, displayName: string, company: string, title: string, note: string, create: boolean): Promise<'created' | 'updated' | 'skipped'>;
  removeAll(): Promise<number>;
  count(): Promise<number>;
};

// null on iPhone and on builds made before the module existed
const native = Platform.OS === 'android' ? requireOptionalNativeModule<NativeContacts>('MedicineXpContacts') : null;

/** "Save to phone contacts" can be offered (Android with the current app build). */
export const contactSyncAvailable = !!native;

const SAVE_DEFAULT_KEY = 'contacts.save_default';
const MAX_LINE = 55;

export interface LeadContact {
  contactName?: string | null;
  phone?: string | null;
  venueName?: string | null;
  status?: LeadStatus | null;
  productName?: string | null;
  followUpAt?: string | null;
  notes?: string | null;
}

/** "Ram Thapa (Shree Ganesh Pharmacy) MedicineXP" — searching "medicinexp" finds them all. */
export function contactName(lead: LeadContact): string {
  const person = lead.contactName?.trim();
  const shop = lead.venueName?.trim();
  if (person && shop) return `${person} (${shop}) MedicineXP`;
  return `${person || shop || 'Lead'} MedicineXP`;
}

/** "Fri 3 PM" for a follow-up this week, else "17 Oct". */
function shortWhen(iso: string): string {
  const date = new Date(iso);
  const days = (date.getTime() - Date.now()) / 86400000;
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: date.getMinutes() ? '2-digit' : undefined });
  if (days >= 0 && days < 7) return `${date.toLocaleDateString('en-US', { weekday: 'short' })} ${time}`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** The two call-screen lines, together kept under ~55 characters. */
export function callScreenLines(lead: LeadContact, event?: string | null): { company: string; title: string } {
  const company = [lead.status ? leadStatusLabel(lead.status) : null, lead.productName].filter(Boolean).join(' · ');
  const followUp = lead.followUpAt && new Date(lead.followUpAt).getTime() > Date.now() ? `Follow up ${shortWhen(lead.followUpAt)}` : null;
  let title = [followUp, event].filter(Boolean).join(' · ');
  const room = MAX_LINE - company.length - 3;
  if (title.length > room) title = title.slice(0, Math.max(0, room - 1)).trimEnd() + '…';
  return {
    company: company ? `${company} ` : '',
    title: title ? ` ${title}` : '',
  };
}

async function permitted(): Promise<boolean> {
  if (!native) return false;
  const result = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
    PermissionsAndroid.PERMISSIONS.WRITE_CONTACTS,
  ]);
  return Object.values(result).every((r) => r === PermissionsAndroid.RESULTS.GRANTED);
}

/**
 * Save or refresh a lead's contact. create = false only refreshes one already saved (events
 * like a call or a status change never add new contacts). Never throws: contacts are a bonus.
 */
export async function syncLeadContact(lead: LeadContact, options: { create: boolean; event?: string | null }): Promise<'created' | 'updated' | 'skipped' | 'unavailable'> {
  if (!native || !lead.phone?.trim()) return 'unavailable';
  try {
    if (!(await permitted())) return 'unavailable';
    const { company, title } = callScreenLines(lead, options.event);
    const note = (lead.notes ?? '').trim().slice(0, 500);
    return await native.upsert(lead.phone.trim(), contactName(lead), company, title, note, options.create);
  } catch (err) {
    console.warn('Contact sync failed', err);
    return 'unavailable';
  }
}

/** Only refresh the call-screen "job title" of a saved contact (e.g. after a call). */
export async function noteContactEvent(phone: string | null | undefined, event: string): Promise<void> {
  if (!native || !phone?.trim()) return;
  try {
    if (!(await permitted())) return;
    await native.upsert(phone.trim(), '', '', ` ${event}`.slice(0, MAX_LINE), '', false);
  } catch (err) {
    console.warn('Contact event failed', err);
  }
}

/** The rep left or was suspended: take every MedicineXP contact off the phone. */
export async function removeAllContacts(): Promise<number> {
  if (!native) return 0;
  try {
    return await native.removeAll();
  } catch (err) {
    console.warn('Removing contacts failed', err);
    return 0;
  }
}

/** The "Save to phone contacts" tick remembers the rep's last choice (on by default). */
export const saveDefault = {
  async get(): Promise<boolean> {
    try {
      return (await AsyncStorage.getItem(SAVE_DEFAULT_KEY)) !== '0';
    } catch {
      return true;
    }
  },
  set(value: boolean) {
    AsyncStorage.setItem(SAVE_DEFAULT_KEY, value ? '1' : '0').catch(() => undefined);
  },
};
