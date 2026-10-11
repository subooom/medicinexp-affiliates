// app/(app)/coupons.tsx — the MR's referral code and tier coupons for pharmacies
import { fieldApi } from '@/api/field';
import { QrCode } from '@/components/common/qr-code';
import { Badge, Card, EmptyState, ScreenHeader } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { Coupon } from '@/types/models';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, RefreshControl, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const discountText = (coupon: Coupon) => (coupon.discount_percentage > 0 ? `${+coupon.discount_percentage.toFixed(2)}% off` : 'No discount');

export default function CouponsScreen() {
  const { colors } = useAppTheme();
  const { activeMembership } = useAuth();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [qrFor, setQrFor] = useState<Coupon | null>(null);

  const load = useCallback(async () => {
    try {
      setCoupons((await fieldApi.getCoupons()).data.data);
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

  const programName = activeMembership?.program?.name ?? 'MedicineXP';
  const share = (coupon: Coupon) =>
    Share.share({
      message: `Sign up for ${programName} with my code ${coupon.code}${coupon.discount_percentage > 0 ? ` and get ${discountText(coupon)}` : ''}: ${coupon.share_url}`,
    });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="My coupons" />
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={coupons}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          ListHeaderComponent={
            <Text style={[typography.body2, { color: colors.mutedForeground, marginBottom: 6 }]}>
              Give a code to a pharmacy when they sign up. Every pharmacy that signs up with one of your codes counts as yours. Reach higher tiers to get extra single-use coupons.
            </Text>
          }
          ListEmptyComponent={<EmptyState icon="pricetag-outline" title="No coupons yet" message="Your referral code appears once your program approves you." />}
          renderItem={({ item }) => {
            const usable = item.status === 'active';
            return (
              <Card style={{ gap: 10, opacity: usable ? 1 : 0.6 }}>
                <View style={styles.row}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={[styles.code, { color: colors.foreground }]}>{item.code}</Text>
                    <Text style={[typography.caption, { color: colors.mutedForeground }]}>
                      {item.kind === 'referral' ? 'Your referral code' : `${item.tier?.name ?? 'Tier'} perk · single use`} · {discountText(item)}
                      {item.usage_count > 0 ? ` · used ${item.usage_count}${item.usage_limit ? `/${item.usage_limit}` : ''}` : ''}
                    </Text>
                  </View>
                  {item.status === 'used' && <Badge label="Used" tone="success" />}
                  {item.status === 'inactive' && <Badge label="Off" tone="neutral" />}
                </View>
                {usable && (
                  <View style={styles.row}>
                    <TouchableOpacity style={[styles.action, { borderColor: colors.border }]} onPress={() => setQrFor(item)}>
                      <Ionicons name="qr-code-outline" size={18} color={colors.primary} />
                      <Text style={[typography.body2, { color: colors.foreground, fontWeight: '600' }]}>Show QR</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.action, { borderColor: colors.border }]} onPress={() => share(item)}>
                      <Ionicons name="share-social-outline" size={18} color={colors.primary} />
                      <Text style={[typography.body2, { color: colors.foreground, fontWeight: '600' }]}>Send</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </Card>
            );
          }}
        />
      )}

      <Modal visible={!!qrFor} transparent animationType="fade" onRequestClose={() => setQrFor(null)}>
        <Pressable style={styles.overlay} onPress={() => setQrFor(null)}>
          {qrFor && (
            <View style={[styles.qrCard, { backgroundColor: '#fff' }]}>
              <QrCode value={qrFor.share_url} size={260} />
              <Text style={[styles.code, { color: '#111', textAlign: 'center' }]}>{qrFor.code}</Text>
              <Text style={[typography.body2, { color: '#555', textAlign: 'center' }]}>Scan with the phone camera to sign up with this code ({discountText(qrFor)}).</Text>
            </View>
          )}
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  code: { fontSize: 24, fontWeight: '800', letterSpacing: 3 },
  action: { flex: 1, minHeight: 44, borderWidth: 1, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  qrCard: { borderRadius: 20, padding: 24, gap: 12, alignItems: 'center', width: '100%', maxWidth: 360 },
});
