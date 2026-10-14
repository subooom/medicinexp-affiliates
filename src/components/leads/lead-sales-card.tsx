// src/components/leads/lead-sales-card.tsx — the sale(s) that came from a lead, or how to
// get one: MedicineXP sales arrive by themselves when the pharmacy pays; in other programs
// the rep reports the sale here and the program confirms it.
import { fieldApi } from '@/api/field';
import { leadApi } from '@/api/leads';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { Lead, LeadSale, Product } from '@/types/models';
import { apiErrorMessage } from '@/utils/errors';
import { IconName } from '@/utils/icons';
import { formatPaisa } from '@/utils/money';
import { uuidv4 } from '@/utils/uuid';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export function LeadSalesCard({ lead, onChanged }: { lead: Lead; onChanged: (lead: Lead) => void }) {
  const { colors } = useAppTheme();
  const programName = useAuth().activeMembership?.program?.name ?? 'the program';
  const [open, setOpen] = useState(false);
  const sales = lead.sales ?? [];

  const statusInfo = (sale: LeadSale): { icon: IconName; color: string; text: string } => {
    switch (sale.status) {
      case 'proven':
        return {
          icon: 'checkmark-circle',
          color: colors.success,
          text: sale.commission_paisa > 0 ? `Confirmed · you earn ${formatPaisa(sale.commission_paisa)}` : 'Confirmed',
        };
      case 'pending':
        return {
          icon: 'hourglass-outline',
          color: colors.warning,
          text: sale.commission_paisa > 0
            ? `Waiting for ${programName} to confirm · ${formatPaisa(sale.commission_paisa)} for you`
            : `Waiting for ${programName} to confirm`,
        };
      case 'refunded':
        return { icon: 'return-down-back-outline', color: colors.destructive, text: 'Refunded' };
      default:
        return { icon: 'close-circle-outline', color: colors.destructive, text: 'Not accepted' };
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: sales.length ? colors.success + '55' : colors.border }]}>
      <View style={styles.row}>
        <Ionicons name="receipt-outline" size={18} color={colors.secondary} />
        <Text style={[typography.body1, { flex: 1, color: colors.foreground, fontWeight: '600' }]}>Sale</Text>
      </View>

      {sales.map((sale) => {
        const info = statusInfo(sale);
        return (
          <View key={sale.id} style={[styles.sale, { borderColor: colors.border }]}>
            <Ionicons name={info.icon} size={22} color={info.color} />
            <View style={{ flex: 1 }}>
              <Text style={[typography.body2, { color: colors.foreground, fontWeight: '700' }]}>
                {formatPaisa(sale.amount_paisa)}
                {sale.product ? ` · ${sale.product.name}` : ''}
                {sale.subscription_year && sale.subscription_year > 1 ? ` · year ${sale.subscription_year}` : ''}
              </Text>
              <Text style={[typography.caption, { color: info.color }]}>{info.text}</Text>
              {sale.occurred_at && (
                <Text style={[typography.caption, { color: colors.mutedForeground }]}>{new Date(sale.occurred_at).toLocaleDateString()}</Text>
              )}
            </View>
          </View>
        );
      })}

      {sales.length === 0 && lead.can_record_sale === false && (
        <Text style={[typography.caption, { color: colors.mutedForeground }]}>
          This becomes a sale by itself when the pharmacy signs up with your code and pays. Send them a sign-up link to make it easy.
        </Text>
      )}

      {lead.can_record_sale && !sales.some((s) => s.status === 'pending' || s.status === 'proven') && (
        <TouchableOpacity style={[styles.button, { backgroundColor: colors.secondary }]} onPress={() => setOpen(true)}>
          <Ionicons name="cash-outline" size={18} color={colors.secondaryForeground} />
          <Text style={[typography.button, { color: colors.secondaryForeground }]}>Convert to sale</Text>
        </TouchableOpacity>
      )}

      <RecordSaleModal visible={open} lead={lead} programName={programName} onClose={() => setOpen(false)} onSaved={(next) => { setOpen(false); onChanged(next); }} />
    </View>
  );
}

function RecordSaleModal({
  visible,
  lead,
  programName,
  onClose,
  onSaved,
}: {
  visible: boolean;
  lead: Lead;
  programName: string;
  onClose: () => void;
  onSaved: (lead: Lead) => void;
}) {
  const { colors } = useAppTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState<number | null>(lead.product?.id ?? null);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  // One id per attempt, so a retry after a dropped connection doesn't record it twice
  const [clientUuid, setClientUuid] = useState(uuidv4);

  useEffect(() => {
    if (!visible) return;
    setClientUuid(uuidv4());
    fieldApi
      .getProducts()
      .then((response) => {
        setProducts(response.data.data);
        const pitched = response.data.data.find((p) => p.id === (lead.product?.id ?? -1));
        if (pitched && !amount) setAmount(String(Math.round(pitched.first_year_price_paisa / 100)));
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const pick = (product: Product) => {
    setProductId(product.id);
    setAmount(String(Math.round(product.first_year_price_paisa / 100)));
  };

  const save = async () => {
    const rupees = Number(amount.replace(/,/g, ''));
    if (!rupees || rupees < 1) {
      Alert.alert('Enter the amount', 'How much did the pharmacy pay?');
      return;
    }
    setSaving(true);
    try {
      const response = await leadApi.recordSale(lead.id, {
        amount: rupees,
        product_id: productId,
        notes: notes.trim() || undefined,
        client_uuid: clientUuid,
      });
      onSaved({ ...lead, ...response.data.data, latest_call_log: lead.latest_call_log, attachments: lead.attachments });
      Alert.alert('Sale recorded', `It counts once ${programName} confirms it.`);
    } catch (err) {
      Alert.alert('Could not record the sale', apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          <View style={styles.row}>
            <Text style={[typography.h5, { flex: 1, color: colors.foreground }]}>Convert to sale</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <Text style={[typography.caption, { color: colors.mutedForeground }]}>
            {lead.display_name} bought from you. {programName} checks it and then your commission is added.
          </Text>

          {products.length > 0 && (
            <View style={styles.chips}>
              {products.map((product) => {
                const selected = product.id === productId;
                return (
                  <TouchableOpacity
                    key={product.id}
                    onPress={() => pick(product)}
                    style={[styles.chip, { borderColor: selected ? colors.secondary : colors.border, backgroundColor: selected ? colors.secondary + '1A' : 'transparent' }]}
                  >
                    <Text style={[typography.caption, { color: selected ? colors.secondary : colors.foreground, fontWeight: '600' }]}>{product.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <Text style={[typography.caption, { color: colors.foreground, fontWeight: '600' }]}>Amount paid (रू)</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholder="e.g. 25000"
            placeholderTextColor={colors.placeholder}
            style={[styles.input, typography.body1, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
          />
          <Text style={[typography.caption, { color: colors.foreground, fontWeight: '600' }]}>Note (bill number, anything that helps)</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Optional"
            placeholderTextColor={colors.placeholder}
            style={[styles.input, typography.body1, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
          />

          <TouchableOpacity disabled={saving} style={[styles.button, { backgroundColor: colors.secondary, marginTop: 6 }]} onPress={save}>
            {saving ? <ActivityIndicator color={colors.secondaryForeground} /> : <Ionicons name="checkmark" size={18} color={colors.secondaryForeground} />}
            <Text style={[typography.button, { color: colors.secondaryForeground }]}>Record sale</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginTop: 12, padding: 14, borderRadius: 12, borderWidth: 1, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sale: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10 },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 20, paddingBottom: 32, gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
});
