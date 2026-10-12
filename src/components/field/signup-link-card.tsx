// src/components/field/signup-link-card.tsx — send a pharmacy its own sign-up link. The page
// opens with what the rep recorded (owner, shop, PAN, address, the product they liked) and the
// chosen code, so the pharmacy only adds a logo and password. Signing up with it ties the
// pharmacy to this lead.
import { fieldApi } from '@/api/field';
import { leadApi } from '@/api/leads';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { Coupon, Lead } from '@/types/models';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function SignupLinkCard({ lead, phone, whatsappNumber }: { lead: Lead; phone: string | null; whatsappNumber: (phone: string) => string }) {
  const { colors } = useAppTheme();
  const [codes, setCodes] = useState<Coupon[]>([]);
  const [couponId, setCouponId] = useState<number | undefined>();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fieldApi
      .getCoupons()
      .then((response) => {
        const active = response.data.data.codes.filter((code) => code.status === 'active');
        setCodes(active);
        setCouponId(active.find((code) => code.is_main)?.id ?? active[0]?.id);
      })
      .catch(() => setCodes([]));
  }, []);

  const send = async (via: 'whatsapp' | 'share') => {
    setBusy(true);
    try {
      const { url, code } = (await leadApi.signupLink(lead.id, couponId)).data.data;
      const greeting = lead.contact_name ? `Namaste ${lead.contact_name.split(' ')[0]}!` : 'Namaste!';
      const message =
        `${greeting} Here is your MedicineXP sign-up. Your details from my visit are already filled in` +
        (code ? ` and my code ${code} is applied` : '') +
        `. Just check them and add your logo and password: ${url}`;

      if (via === 'whatsapp' && phone) {
        await Linking.openURL(`https://wa.me/${whatsappNumber(phone)}?text=${encodeURIComponent(message)}`);
      } else {
        await Share.share({ message });
      }
    } catch (err: any) {
      Alert.alert('Could not make the link', err.message || 'You need internet for this. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.row}>
        <Ionicons name="link-outline" size={18} color={colors.primary} />
        <Text style={[typography.body1, { flex: 1, color: colors.foreground, fontWeight: '600' }]}>Send sign-up link</Text>
      </View>
      <Text style={[typography.caption, { color: colors.mutedForeground }]}>
        Sign-up opens already filled in with what you recorded here. They only add a logo and password, and the sale is
        counted as yours.
      </Text>

      {codes.length > 1 && (
        <View style={styles.chips}>
          {codes.map((code) => {
            const selected = code.id === couponId;
            return (
              <TouchableOpacity
                key={code.id}
                onPress={() => setCouponId(code.id)}
                style={[styles.chip, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary + '15' : 'transparent' }]}
              >
                <Text style={[typography.caption, { color: selected ? colors.primary : colors.foreground, fontWeight: '600' }]}>
                  {code.code}
                  {code.discount_percentage ? ` · ${code.discount_percentage}% off` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <View style={styles.buttons}>
        {phone && (
          <TouchableOpacity disabled={busy} style={[styles.button, { backgroundColor: '#25D366' }]} onPress={() => send('whatsapp')}>
            <Ionicons name="logo-whatsapp" size={18} color="#fff" />
            <Text style={[typography.caption, { color: '#fff', fontWeight: '600' }]}>WhatsApp</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity disabled={busy} style={[styles.button, { borderWidth: 1, borderColor: colors.primary }]} onPress={() => send('share')}>
          {busy ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="share-social-outline" size={18} color={colors.primary} />}
          <Text style={[typography.caption, { color: colors.primary, fontWeight: '600' }]}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginTop: 12, padding: 14, borderRadius: 12, borderWidth: 1, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  buttons: { flexDirection: 'row', gap: 8, marginTop: 4 },
  button: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
});
