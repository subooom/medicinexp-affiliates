// src/utils/contact-sync.ts — lead contacts on the rep's phone, under the app's own
// "MedicineXP" account (native module modules/medicinexp-contacts, Android only).
//
// The call screen (vivo and most Androids) shows Company and Job title on one line, so:
//   Company   = lead status + product      "Interested · Premium plan "
//   Job title = next step / latest event   " Follow up Fri 3 PM · called today"
// vivo joins the two with "-": the padding keeps it readable ("Interested · Premium plan - Follow up…").
// Contacts are matched by phone, never duplicated, and all removed when the rep leaves.
// syncAllContacts saves everything from the server's /contacts (own + team-up leads, visited
// shops); it runs once a day when contacts are allowed, and from the Sync screen.
import { contactApi, SyncContact } from '@/api/contacts';
import { LeadStatus } from '@/types/models';
import { leadStatusLabel } from '@/utils/lead-types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { Alert, Linking, PermissionsAndroid, Platform } from 'react-native';

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
const LAST_SYNC_KEY = 'contacts.last_sync';
const OFFERED_KEY = 'contacts.sync_offered';
const AUTO_SYNC_EVERY_MS = 20 * 60 * 60 * 1000;
const MAX_LINE = 55;

type Result = 'created' | 'updated' | 'skipped' | 'unavailable';

export interface LeadContact {
  contactName?: string | null;
  phone?: string | null;
  venueName?: string | null;
  status?: LeadStatus | null;
  productName?: string | null;
  followUpAt?: string | null;
  notes?: string | null;
}

export interface ShopContact {
  phone?: string | null;
  name: string;
  isCustomer?: boolean;
  typeName?: string | null;
}

/**
 * One way of writing each number, so the same phone is never saved twice: no +977, mobiles as
 * 98XXXXXXXX, landlines with their 0 ("01-4412345", "+977 1 4412345" → "014412345").
 */
export function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('977') && digits.length > 10) digits = digits.slice(3);
  if (!digits) return phone.trim();
  if (digits.length === 8 && !digits.startsWith('9')) digits = `0${digits}`;
  return digits;
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

/** "16 Oct", the day format used in call-screen events. */
export function eventDay(date: Date = new Date()): string {
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

const PERMISSIONS = [PermissionsAndroid.PERMISSIONS.READ_CONTACTS, PermissionsAndroid.PERMISSIONS.WRITE_CONTACTS];

async function granted(): Promise<boolean> {
  if (!native) return false;
  const checks = await Promise.all(PERMISSIONS.map((p) => PermissionsAndroid.check(p)));
  return checks.every(Boolean);
}

let deniedExplained = false;

/**
 * Contacts allowed? ask = true when the rep is saving something on purpose: asks Android, and
 * if they said no, explains once per app run (calls from leads won't show a name) with a link
 * to Settings. Refreshes after a call or a status change never ask.
 */
async function permitted(ask: boolean): Promise<boolean> {
  if (!native) return false;
  if (await granted()) return true;
  if (!ask) return false;
  const result = await PermissionsAndroid.requestMultiple(PERMISSIONS);
  if (Object.values(result).every((r) => r === PermissionsAndroid.RESULTS.GRANTED)) return true;
  if (!deniedExplained) {
    deniedExplained = true;
    Alert.alert('Contacts not allowed', "MedicineXP can't save your leads to your phone contacts, so calls from them won't show a name. Allow Contacts for MedicineXP in Settings.", [
      { text: 'Not now', style: 'cancel' },
      { text: 'Open settings', onPress: () => Linking.openSettings() },
    ]);
  }
  return false;
}

async function writeLead(lead: LeadContact & { phone: string }, create: boolean, event?: string | null) {
  const { company, title } = callScreenLines(lead, event);
  const note = (lead.notes ?? '').trim().slice(0, 500);
  return native!.upsert(normalizePhone(lead.phone), contactName(lead), company, title, note, create);
}

async function writeShop(shop: ShopContact & { phone: string }, create: boolean, event?: string | null) {
  const phone = normalizePhone(shop.phone);
  const title = event ? ` ${event}`.slice(0, MAX_LINE) : '';
  // Saved already (e.g. from a lead): empty name / company leave them as they are
  const refreshed = await native!.upsert(phone, '', '', title, '', false);
  if (refreshed !== 'skipped' || !create) return refreshed;
  const company = shop.isCustomer ? 'MedicineXP customer' : shop.typeName?.trim() || '';
  return native!.upsert(phone, contactName({ venueName: shop.name }), company ? `${company} ` : '', title, '', true);
}

/**
 * Save or refresh a lead's contact. create = false only refreshes one already saved (events
 * like a call or a status change never add new contacts). Never throws: contacts are a bonus.
 */
export async function syncLeadContact(lead: LeadContact, options: { create: boolean; event?: string | null }): Promise<Result> {
  const phone = lead.phone?.trim();
  if (!native || !phone) return 'unavailable';
  try {
    if (!(await permitted(options.create))) return 'unavailable';
    return await writeLead({ ...lead, phone }, options.create, options.event);
  } catch (err) {
    console.warn('Contact sync failed', err);
    return 'unavailable';
  }
}

/**
 * Save or refresh a shop's own number (after a visit, or from the shop's page). A contact
 * already saved for this number (e.g. from a lead) keeps its name and status line: only the
 * latest event changes. create = false never adds a new contact.
 */
export async function syncShopContact(shop: ShopContact, options: { create: boolean; event?: string | null }): Promise<Result> {
  const phone = shop.phone?.trim();
  if (!native || !phone) return 'unavailable';
  try {
    if (!(await permitted(options.create))) return 'unavailable';
    return await writeShop({ ...shop, phone }, options.create, options.event);
  } catch (err) {
    console.warn('Shop contact sync failed', err);
    return 'unavailable';
  }
}

/** Only refresh the call-screen "job title" of a saved contact (e.g. after a call). */
export async function noteContactEvent(phone: string | null | undefined, event: string): Promise<void> {
  if (!native || !phone?.trim()) return;
  try {
    if (!(await permitted(false))) return;
    await native.upsert(normalizePhone(phone), '', '', ` ${event}`.slice(0, MAX_LINE), '', false);
  } catch (err) {
    console.warn('Contact event failed', err);
  }
}

function writeSynced(contact: SyncContact) {
  if (contact.kind === 'lead') {
    return writeLead(
      {
        phone: contact.phone,
        contactName: contact.contact_name,
        venueName: contact.venue_name,
        status: contact.status,
        productName: contact.product_name,
        followUpAt: contact.follow_up_at,
        notes: contact.notes,
      },
      true
    );
  }
  return writeShop(
    { phone: contact.phone, name: contact.venue_name ?? 'Shop', isCustomer: contact.is_customer, typeName: contact.venue_type },
    true,
    contact.last_visited_at ? `Visited ${eventDay(new Date(contact.last_visited_at))}` : null
  );
}

/**
 * Save every lead and visited shop the server lists (own and team-ups, all programs) and
 * refresh the ones already saved. null when contacts aren't available or allowed.
 */
export async function syncAllContacts(options: { ask: boolean; onProgress?: (done: number, total: number) => void }): Promise<{ saved: number; total: number } | null> {
  if (!native || !(await permitted(options.ask))) return null;
  const contacts = await contactApi.getAll();
  let saved = 0;
  for (let i = 0; i < contacts.length; i++) {
    try {
      const result = await writeSynced(contacts[i]);
      if (result !== 'skipped') saved++;
    } catch (err) {
      console.warn('Contact sync failed for one contact', err);
    }
    options.onProgress?.(i + 1, contacts.length);
  }
  await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString()).catch(() => undefined);
  return { saved, total: contacts.length };
}

/** When the last full sync finished, or null. */
export async function lastContactSync(): Promise<Date | null> {
  try {
    const value = await AsyncStorage.getItem(LAST_SYNC_KEY);
    return value ? new Date(value) : null;
  } catch {
    return null;
  }
}

/** How many contacts the app has saved on this phone. */
export async function savedContactCount(): Promise<number> {
  if (!native || !(await granted())) return 0;
  try {
    return await native.count();
  } catch {
    return 0;
  }
}

/**
 * At app start: contacts allowed → refresh everything once a day (new leads from teammates,
 * old follow-ups, changes made in the portal). Never allowed → offer it once.
 */
export async function autoSyncContacts(): Promise<void> {
  if (!native) return;
  try {
    if (await granted()) {
      const last = await lastContactSync();
      if (!last || Date.now() - last.getTime() > AUTO_SYNC_EVERY_MS) await syncAllContacts({ ask: false });
      return;
    }
    if (await AsyncStorage.getItem(OFFERED_KEY)) return;
    await AsyncStorage.setItem(OFFERED_KEY, '1');
    Alert.alert('See who is calling', 'Save your leads and the shops you visit to your phone contacts, so calls from them show a name and where things stand. Removed if you leave.', [
      { text: 'Not now', style: 'cancel' },
      {
        text: 'Save contacts',
        onPress: async () => {
          const result = await syncAllContacts({ ask: true }).catch(() => null);
          if (result) Alert.alert('Contacts saved', `${result.saved} contacts saved. Search "medicinexp" in Contacts to see them.`);
        },
      },
    ]);
  } catch (err) {
    console.warn('Contact auto sync failed', err);
  }
}

/** The rep left or was suspended: take every MedicineXP contact off the phone. */
export async function removeAllContacts(): Promise<number> {
  if (!native) return 0;
  try {
    await AsyncStorage.removeItem(LAST_SYNC_KEY).catch(() => undefined);
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
