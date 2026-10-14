// app/(app)/coupons.tsx — the rep's codes: rename them, set each one's discount and see
// live what the pharmacy pays and what the rep earns. A discount comes out of the rep's
// own commission, so small discounts pay the rep more.
import { fieldApi } from '@/api/field';
import { QrCode } from '@/components/common/qr-code';
import { Badge, Button, Card, EmptyState, ScreenHeader } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { CodesResponse, Coupon } from '@/types/models';
import { formatPaisa } from '@/utils/money';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const STEP = 0.5;
const pct = (n: number) => `${+n.toFixed(2)}%`;

/** What one sale earns with this discount: rate on the full price, minus the discount (never below 0). */
const earningFor = (pricePaisa: number, rateBp: number, discountPercent: number) =>
  Math.max(0, Math.round((pricePaisa * (rateBp / 100 - discountPercent)) / 100));

function EarningsTable({ data, discount }: { data: CodesResponse; discount: number }) {
  const { colors } = useAppTheme();
  if (data.products.length === 0) {
    const earnPct = Math.max(0, data.year1_rate_bp / 100 - discount);
    return <Text style={[typography.body2, { color: colors.foreground }]}>You earn {pct(earnPct)} of what the pharmacy pays.</Text>;
  }
  return (
    <View style={{ gap: 6 }}>
      {data.products.map((product) => {
        const saves = Math.round((product.first_year_price_paisa * discount) / 100);
        return (
          <View key={product.id} style={styles.earnRow}>
            <Text style={[typography.body2, { color: colors.foreground, flex: 1 }]} numberOfLines={1}>
              {product.name}
            </Text>
            <Text style={[typography.caption, { color: colors.mutedForeground }]}>{saves > 0 ? `saves ${formatPaisa(saves)}` : 'full price'}</Text>
            <Text style={[typography.body2, { color: colors.primary, fontWeight: '700', minWidth: 90, textAlign: 'right' }]}>
              {formatPaisa(earningFor(product.first_year_price_paisa, data.year1_rate_bp, discount))}
            </Text>
          </View>
        );
      })}
      <Text style={[typography.caption, { color: colors.mutedForeground }]}>Right column: what you earn per sale (first year).</Text>
    </View>
  );
}

export default function CodesScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { activeMembership } = useAuth();
  const [data, setData] = useState<CodesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [qrFor, setQrFor] = useState<Coupon | null>(null);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [draftCode, setDraftCode] = useState('');
  const [draftDiscount, setDraftDiscount] = useState(0);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setData((await fieldApi.getCoupons()).data.data);
    } catch {
      // Keep what's shown
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const maxDiscount = (data?.max_discount_bp ?? 0) / 100;
  const programName = activeMembership?.program?.name ?? 'MedicineXP';

  const share = (coupon: Coupon) =>
    Share.share({
      message: `Sign up for ${programName} with my code ${coupon.code}${coupon.discount_percentage > 0 ? ` and get ${pct(coupon.discount_percentage)} off` : ''}: ${coupon.share_url}`,
    });

  const openEditor = (coupon: Coupon) => {
    setEditing(coupon);
    setDraftCode(coupon.code);
    setDraftDiscount(coupon.discount_percentage);
  };

  const save = async () => {
    if (!editing) return;
    const code = draftCode.trim().toUpperCase();
    if (!/^[A-Z0-9]+(-[A-Z0-9]+)*$/.test(code) || code.length < 4 || code.length > 12) {
      Alert.alert('Check the code', 'Use 4 to 12 letters and numbers, with dashes between them (e.g. SAR-52).');
      return;
    }
    setSaving(true);
    try {
      const response = await fieldApi.updateCoupon(editing.id, {
        code: code !== editing.code ? code : undefined,
        discount_percentage: draftDiscount,
      });
      setData(response.data.data);
      setEditing(null);
    } catch (error: any) {
      Alert.alert('Could not save', error.status ? error.message : 'You need internet to change a code.');
    } finally {
      setSaving(false);
    }
  };

  const draftData = useMemo(() => data, [data]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title="My codes" />
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="My codes" />
      <FlatList
        data={data?.codes ?? []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListHeaderComponent={
          data?.tier ? (
            <Card style={{ gap: 6, marginBottom: 6, borderColor: data.tier.color ?? colors.primary }}>
              <Text style={[typography.caption, { color: colors.mutedForeground }]}>{data.tier.name} tier</Text>
              <Text style={[typography.h4, { color: colors.foreground, fontWeight: '700' }]}>You earn {pct(data.year1_rate_bp / 100)} on every new pharmacy</Text>
              <Text style={[typography.body2, { color: colors.mutedForeground }]}>
                Give a discount to close a deal and it comes out of your commission, up to {pct(maxDiscount)}. The smaller the discount, the more you earn.
              </Text>
            </Card>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState icon="lock-closed-outline" title="Log your first lead" message="Your first lead unlocks your code and your commission.">
            <Button title="Add a lead" icon="person-add-outline" onPress={() => router.push('/(app)/leads/create', { withAnchor: true })} />
          </EmptyState>
        }
        renderItem={({ item }) => (
          <Card style={{ gap: 10, opacity: item.status === 'active' ? 1 : 0.6 }}>
            <View style={styles.row}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.code, { color: colors.foreground }]}>{item.code}</Text>
                <Text style={[typography.caption, { color: colors.mutedForeground }]}>
                  {item.discount_percentage > 0 ? `${pct(item.discount_percentage)} off for the pharmacy` : 'No discount: you earn the most'}
                  {item.pharmacies_count > 0 ? ` · ${item.pharmacies_count} signed up` : ''}
                </Text>
              </View>
              {item.is_main && <Badge label="Main" tone="info" />}
              {item.status === 'inactive' && <Badge label="Off" tone="neutral" />}
            </View>
            {data && <EarningsTable data={data} discount={item.discount_percentage} />}
            {item.status === 'active' && (
              <View style={styles.row}>
                <TouchableOpacity style={[styles.action, { borderColor: colors.border }]} onPress={() => setQrFor(item)}>
                  <Ionicons name="qr-code-outline" size={18} color={colors.primary} />
                  <Text style={[typography.body2, { color: colors.foreground, fontWeight: '600' }]}>QR</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.action, { borderColor: colors.border }]} onPress={() => share(item)}>
                  <Ionicons name="share-social-outline" size={18} color={colors.primary} />
                  <Text style={[typography.body2, { color: colors.foreground, fontWeight: '600' }]}>Send</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.action, { borderColor: colors.border }]} onPress={() => openEditor(item)}>
                  <Ionicons name="create-outline" size={18} color={colors.primary} />
                  <Text style={[typography.body2, { color: colors.foreground, fontWeight: '600' }]}>Edit</Text>
                </TouchableOpacity>
              </View>
            )}
          </Card>
        )}
        ListFooterComponent={
          data && data.tier ? (
            <Text style={[typography.caption, { color: colors.mutedForeground, textAlign: 'center', marginTop: 8 }]}>
              Higher tiers unlock more codes and a bigger rate.
            </Text>
          ) : null
        }
      />

      {/* QR */}
      <Modal visible={!!qrFor} transparent animationType="fade" onRequestClose={() => setQrFor(null)}>
        <Pressable style={styles.overlay} onPress={() => setQrFor(null)}>
          {qrFor && (
            <View style={[styles.qrCard, { backgroundColor: '#fff' }]}>
              <QrCode value={qrFor.share_url} size={260} />
              <Text style={[styles.code, { color: '#111', textAlign: 'center' }]}>{qrFor.code}</Text>
              <Text style={[typography.body2, { color: '#555', textAlign: 'center' }]}>
                Scan with the phone camera to sign up{qrFor.discount_percentage > 0 ? ` with ${pct(qrFor.discount_percentage)} off` : ''}.
              </Text>
            </View>
          )}
        </Pressable>
      </Modal>

      {/* Edit a code */}
      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <Pressable style={styles.sheetOverlay} onPress={() => setEditing(null)} />
          <View style={[styles.sheet, { backgroundColor: colors.card }]}>
            <ScrollView contentContainerStyle={{ gap: 14 }} keyboardShouldPersistTaps="handled">
              <Text style={[typography.h5, { color: colors.foreground, fontWeight: '700' }]}>Edit code</Text>

              <View style={{ gap: 6 }}>
                <Text style={[typography.body2, { color: colors.foreground, fontWeight: '600' }]}>Code</Text>
                <TextInput
                  value={draftCode}
                  onChangeText={(text) => setDraftCode(text.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
                  autoCapitalize="characters"
                  maxLength={12}
                  style={[styles.codeInput, { borderColor: colors.border, color: colors.foreground }]}
                />
                <Text style={[typography.caption, { color: colors.mutedForeground }]}>4–12 letters and numbers, e.g. SAR-52. Easy to say out loud.</Text>
              </View>

              <View style={{ gap: 8 }}>
                <Text style={[typography.body2, { color: colors.foreground, fontWeight: '600' }]}>Discount for the pharmacy</Text>
                <View style={styles.stepper}>
                  <TouchableOpacity
                    onPress={() => setDraftDiscount((d) => Math.max(0, +(d - STEP).toFixed(2)))}
                    style={[styles.stepBtn, { borderColor: colors.border }]}
                    accessibilityLabel="Less discount"
                  >
                    <Ionicons name="remove" size={22} color={colors.foreground} />
                  </TouchableOpacity>
                  <Text style={[typography.h3, { color: colors.foreground, fontWeight: '800', minWidth: 90, textAlign: 'center' }]}>{pct(draftDiscount)}</Text>
                  <TouchableOpacity
                    onPress={() => setDraftDiscount((d) => Math.min(maxDiscount, +(d + STEP).toFixed(2)))}
                    style={[styles.stepBtn, { borderColor: colors.border }]}
                    accessibilityLabel="More discount"
                  >
                    <Ionicons name="add" size={22} color={colors.foreground} />
                  </TouchableOpacity>
                </View>
                <View style={[styles.row, { justifyContent: 'center', flexWrap: 'wrap' }]}>
                  {[0, Math.min(2, maxDiscount), Math.min(5, maxDiscount), maxDiscount]
                    .filter((v, i, all) => all.indexOf(v) === i)
                    .map((value) => (
                      <TouchableOpacity
                        key={value}
                        onPress={() => setDraftDiscount(value)}
                        style={[styles.chip, { borderColor: draftDiscount === value ? colors.primary : colors.border, backgroundColor: draftDiscount === value ? colors.primary + '15' : 'transparent' }]}
                      >
                        <Text style={[typography.caption, { color: draftDiscount === value ? colors.primary : colors.foreground, fontWeight: '700' }]}>
                          {value === maxDiscount && value > 0 ? `Max ${pct(value)}` : pct(value)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </View>
              </View>

              {/* Live: what the rep earns at this discount */}
              {draftData && (
                <Card style={{ gap: 8, backgroundColor: colors.primary + '08' }}>
                  <Text style={[typography.body2, { color: colors.foreground, fontWeight: '700' }]}>
                    {draftDiscount === 0 ? 'No discount: you keep your full commission' : `You give up ${pct(draftDiscount)} of your ${pct(maxDiscount)}`}
                  </Text>
                  <EarningsTable data={draftData} discount={draftDiscount} />
                </Card>
              )}

              <View style={styles.row}>
                <Button title="Cancel" variant="ghost" onPress={() => setEditing(null)} style={{ flex: 1 }} />
                <Button title="Save" onPress={save} loading={saving} style={{ flex: 1 }} />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  code: { fontSize: 24, fontWeight: '800', letterSpacing: 3 },
  action: { flex: 1, minHeight: 44, borderWidth: 1, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  earnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  qrCard: { borderRadius: 20, padding: 24, gap: 12, alignItems: 'center', width: '100%', maxWidth: 360 },
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32, maxHeight: '85%' },
  codeInput: { minHeight: 52, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 22, fontWeight: '800', letterSpacing: 3 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  stepBtn: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
});
