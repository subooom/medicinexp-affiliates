// app/(app)/leads/[id].tsx
import { AttachmentsCard } from '@/components/field/attachments-card';
import { SignupLinkCard } from '@/components/field/signup-link-card';
import { LeadSalesCard } from '@/components/leads/lead-sales-card';
import { useCallLogger } from '@/hooks/use-call-logger';
import { contactSyncAvailable, LeadContact, syncLeadContact, venueAddress } from '@/utils/contact-sync';
import { callLogApi } from '@/api/call-logs';
import { leadApi } from '@/api/leads';
import { AppColors } from '@/constants/colors';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { CallLog, Lead } from '@/types/models';
import { leadStatusLabel, leadTypeColor, leadTypeInfo } from '@/utils/lead-types';
import { getCallStatusColor, getLeadStatusColor } from '@/utils/status-colors';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Statuses an MR can set; "Customer" happens when the pharmacy pays
const STATUS_ACTIONS: { value: 'new' | 'contacted' | 'qualified' | 'lost'; label: string }[] = [
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Interested' },
  { value: 'lost', label: 'Lost' },
];

/**
 * Nepal mobile numbers are 10 digits starting with 9; WhatsApp needs the 977 country code.
 */
const whatsappNumber = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 && digits.startsWith('9') ? `977${digits}` : digits;
};

export default function LeadDetailScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const leadId = parseInt(id);

  const [lead, setLead] = useState<Lead | null>(null);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [leadResponse, callsResponse] = await Promise.all([leadApi.getById(leadId), callLogApi.getByLead(leadId)]);
      setLead(leadResponse.data.data);
      setCallLogs(callsResponse.data.data.data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Could not load this lead');
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Tap to call / WhatsApp, then one tap to log it when back in the app
  const logger = useCallLogger(load);

  // The lead as its phone contact sees it (name, status, product, follow-up, notes)
  const asContact = (l: Lead): LeadContact => ({
    contactName: l.contact_name,
    phone: l.contact_phone || l.venue?.phone,
    venueName: l.venue?.name,
    status: l.status,
    productName: l.product?.name,
    followUpAt: l.next_follow_up_at,
    notes: l.notes,
    address: l.contact_address || venueAddress(l.venue),
  });

  const saveContact = async () => {
    if (!lead) return;
    const result = await syncLeadContact(asContact(lead), { create: true });
    Alert.alert(
      result === 'created' ? 'Saved to contacts' : result === 'updated' ? 'Contact updated' : 'Could not save',
      result === 'unavailable' ? 'Allow contacts access for MedicineXP in your phone settings.' : 'Search "medicinexp" in Contacts to find all your leads.'
    );
  };

  const changeStatus = async (status: 'new' | 'contacted' | 'qualified' | 'lost') => {
    try {
      const response = await leadApi.updateStatus(leadId, status);
      // Saved contact: the call screen shows the new status
      syncLeadContact(asContact(response.data.data as Lead), { create: false, event: `Now ${status === 'qualified' ? 'interested' : status}` });
      // The status response is the short form: keep what only the detail endpoint sends
      setLead({
        ...response.data.data,
        latest_call_log: lead?.latest_call_log,
        attachments: lead?.attachments,
        sales: lead?.sales,
        can_record_sale: lead?.can_record_sale,
      });
    } catch (err: any) {
      Alert.alert('Could not update', err.message || 'Please try again.');
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete this lead?', 'Its call logs stay, but lose the link to this lead.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await leadApi.delete(leadId);
            router.back();
          } catch (err: any) {
            Alert.alert('Could not delete', err.message || 'Please try again.');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!lead) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[typography.body1, { color: colors.mutedForeground }]}>{error || 'Lead not found'}</Text>
      </View>
    );
  }

  const type = leadTypeInfo(lead.lead_type);
  const typeColor = leadTypeColor(lead.lead_type, colors);
  const statusColor = getLeadStatusColor(colors, lead.status);
  const phone = lead.contact_phone || lead.venue?.phone || null;
  const followUpDue = lead.next_follow_up_at && new Date(lead.next_follow_up_at) <= new Date();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Who */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.headerRow}>
          <View style={[styles.typeIcon, { backgroundColor: typeColor + '15' }]}>
            <Ionicons name={type.icon} size={24} color={typeColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typography.h4, { color: colors.foreground, fontWeight: '700' }]}>{lead.display_name}</Text>
            <Text style={[typography.caption, { color: typeColor }]}>{type.label}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: statusColor + '15' }]}>
            <Text style={[typography.caption, { color: statusColor, fontWeight: '600' }]}>{leadStatusLabel(lead.status)}</Text>
          </View>
        </View>

        {lead.product && (
          <Text style={[typography.body2, { color: colors.primary, fontWeight: '600' }]}>Interested in {lead.product.name}</Text>
        )}
        {lead.associated_entity && (
          <Text style={[typography.body2, { color: colors.mutedForeground }]}>Associated with {lead.associated_entity}</Text>
        )}
        {lead.venue && (
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => router.push({ pathname: '/(app)/venues/[id]', params: { id: lead.venue!.id } })}
          >
            <Ionicons name="business-outline" size={16} color={colors.primary} />
            <Text style={[typography.body2, { color: colors.primary }]}>{lead.venue.name}</Text>
          </TouchableOpacity>
        )}
        {lead.team && (
          // Made during a team-up: the sale is split with the teammate
          <View style={styles.linkRow}>
            <Ionicons name="people-outline" size={16} color={colors.secondary} />
            <Text style={[typography.body2, { color: colors.foreground }]}>
              Team lead with {lead.team.partner_name ?? 'a teammate'} · your share {Math.round((lead.team.my_share_bp ?? 5000) / 100)}%
              {lead.team.agreed ? '' : ' (50/50 until agreed)'}
            </Text>
          </View>
        )}
        {lead.contact_email && (
          <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL(`mailto:${lead.contact_email}`)}>
            <Ionicons name="mail-outline" size={16} color={colors.mutedForeground} />
            <Text style={[typography.body2, { color: colors.foreground }]}>{lead.contact_email}</Text>
          </TouchableOpacity>
        )}

        {phone && (
          <View style={styles.contactButtons}>
            <TouchableOpacity style={[styles.contactButton, { backgroundColor: colors.primary }]} onPress={() => logger.call({ phone, name: lead.display_name, leadId: lead.id, venueId: lead.venue_id })}>
              <Ionicons name="call" size={18} color={colors.primaryForeground} />
              <Text style={[typography.caption, { color: colors.primaryForeground, fontWeight: '600' }]}>Call {phone}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.contactButton, { backgroundColor: '#25D366' }]}
              onPress={() => logger.whatsapp({ phone, name: lead.display_name, leadId: lead.id, venueId: lead.venue_id }, `https://wa.me/${whatsappNumber(phone)}`)}
            >
              <Ionicons name="logo-whatsapp" size={18} color="#fff" />
              <Text style={[typography.caption, { color: '#fff', fontWeight: '600' }]}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        )}
        {phone && contactSyncAvailable && (
          <TouchableOpacity style={styles.linkRow} onPress={saveContact}>
            <Ionicons name="person-add-outline" size={16} color={colors.primary} />
            <Text style={[typography.body2, { color: colors.primary }]}>Save to contacts</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Sign-up links are for MedicineXP pharmacies; other programs record the sale below */}
      {lead.status !== 'converted' && lead.can_record_sale !== true && (
        <SignupLinkCard lead={lead} phone={phone} whatsappNumber={whatsappNumber} />
      )}

      <LeadSalesCard lead={lead} onChanged={setLead} />

      <AttachmentsCard
        attachments={lead.attachments ?? []}
        to={{ type: 'lead', id: lead.id, clientUuid: lead.client_uuid ?? undefined }}
        label={lead.display_name}
        onAdded={load}
      />

      {/* Status */}
      {lead.status !== 'converted' && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[typography.body1, styles.sectionTitle, { color: colors.foreground }]}>Move this lead to</Text>
          <View style={styles.chips}>
            {STATUS_ACTIONS.filter((action) => action.value !== lead.status).map((action) => (
              <TouchableOpacity
                key={action.value}
                style={[styles.chip, { borderColor: getLeadStatusColor(colors, action.value) }]}
                onPress={() => changeStatus(action.value)}
              >
                <Text style={[typography.caption, { color: getLeadStatusColor(colors, action.value), fontWeight: '600' }]}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[typography.caption, { color: colors.mutedForeground }]}>
            It becomes a customer automatically when the pharmacy signs up with your code and pays.
          </Text>
        </View>
      )}

      {/* Follow-up */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.detailRow}>
          <Ionicons name="alarm-outline" size={18} color={followUpDue ? colors.warning : colors.mutedForeground} />
          <Text style={[typography.body2, { flex: 1, color: followUpDue ? colors.warning : colors.foreground }]}>
            {lead.next_follow_up_at
              ? `Follow up ${new Date(lead.next_follow_up_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`
              : 'No follow-up set'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="flame-outline" size={18} color={colors.mutedForeground} />
          <Text style={[typography.body2, { color: colors.foreground }]}>
            {lead.interest_level ? `Interest ${lead.interest_level}/5` : 'Interest not rated'}
          </Text>
        </View>
        {lead.notes ? <Text style={[typography.body2, { color: colors.mutedForeground }]}>{lead.notes}</Text> : null}
      </View>

      {/* Calls */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.headerRow}>
          <Text style={[typography.body1, styles.sectionTitle, { flex: 1, color: colors.foreground }]}>Calls ({callLogs.length})</Text>
          <TouchableOpacity onPress={() => router.push({ pathname: '/(app)/call-logs/create', params: { leadId: lead.id, scheduled: '1' } })}>
            <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>Schedule</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push({ pathname: '/(app)/call-logs/create', params: { leadId: lead.id } })}>
            <Text style={[typography.caption, { color: colors.primary, fontWeight: '600', marginLeft: 14 }]}>+ Log call</Text>
          </TouchableOpacity>
        </View>
        {callLogs.length === 0 ? (
          <Text style={[typography.body2, { color: colors.mutedForeground }]}>No calls yet</Text>
        ) : (
          callLogs.map((call) => {
            const callColor = getCallStatusColor(colors, call.status);
            return (
              <TouchableOpacity
                key={call.id}
                style={[styles.callRow, { borderTopColor: colors.border }]}
                onPress={() => router.push({ pathname: '/(app)/call-logs/[id]', params: { id: call.id } })}
              >
                <Ionicons name={call.direction === 'incoming' ? 'arrow-down-outline' : 'arrow-up-outline'} size={16} color={colors.mutedForeground} />
                <View style={{ flex: 1 }}>
                  <Text style={[typography.body2, { color: colors.foreground }]} numberOfLines={2}>
                    {call.notes || (call.status === 'scheduled' ? 'Scheduled call' : 'Call')}
                  </Text>
                  <Text style={[typography.caption, { color: colors.mutedForeground }]}>
                    {call.call_date} • {call.call_time.slice(0, 5)}
                    {call.duration_minutes ? ` • ${call.duration_minutes} min` : ''}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: callColor + '15' }]}>
                  <Text style={[typography.caption, { color: callColor, textTransform: 'capitalize' }]}>{call.status}</Text>
                </View>
                <TouchableOpacity onPress={() => router.push({ pathname: '/(app)/call-logs/edit/[id]', params: { id: call.id } })}>
                  <Ionicons name="pencil-outline" size={16} color={colors.primary} />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      <View style={styles.footerActions}>
        <TouchableOpacity
          style={[styles.footerButton, { borderColor: colors.border }]}
          onPress={() => router.push({ pathname: '/(app)/leads/edit/[id]', params: { id: lead.id } })}
        >
          <Ionicons name="pencil-outline" size={18} color={colors.primary} />
          <Text style={[typography.button, { color: colors.primary }]}>Edit lead</Text>
        </TouchableOpacity>
        {lead.status !== 'converted' && (
          <TouchableOpacity style={[styles.footerButton, { borderColor: colors.border }]} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={18} color={colors.destructive} />
            <Text style={[typography.button, { color: colors.destructive }]}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    card: { marginHorizontal: 16, marginTop: 12, padding: 14, borderRadius: 12, borderWidth: 1, gap: 8 },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    typeIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    linkRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    contactButtons: { flexDirection: 'row', gap: 8, marginTop: 4 },
    contactButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
    sectionTitle: { fontWeight: '600' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 1 },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    callRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
    footerActions: { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 16 },
    footerButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, borderWidth: 1 },
  });
