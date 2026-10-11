// app/(app)/referral.tsx — the MR's referral QR code
import { QrCode } from '@/components/common/qr-code';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Share, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';

export default function ReferralScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const { activeMembership } = useAuth();

  const programName = activeMembership?.program?.name ?? 'MedicineXP';
  const discount = activeMembership?.program?.referral_discount_percentage ?? 0;
  const url = activeMembership?.referral_url;
  const code = activeMembership?.referral_code;

  const share = () => {
    if (!url || !code) return;
    Share.share({
      message: `Sign up for ${programName} here: ${url}\nYour code ${code} is already filled in${discount > 0 ? ` and gives you ${discount}% off` : ''}.`,
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 40 }}>
          <Ionicons name="chevron-back" size={28} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[typography.h4, { color: colors.foreground, fontWeight: '600' }]}>Sign-up QR</Text>
        <View style={{ width: 40 }} />
      </View>

      {!url || !code ? (
        <View style={styles.body}>
          <Text style={[typography.body1, { color: colors.mutedForeground, textAlign: 'center' }]}>
            Your referral code appears here once your program approves you.
          </Text>
        </View>
      ) : (
        <View style={styles.body}>
          <Text style={[typography.body1, { color: colors.foreground, textAlign: 'center' }]}>
            Ask the pharmacy owner to scan this with their phone camera.
          </Text>

          <View style={styles.qrCard}>
            <QrCode value={url} size={Math.min(width - 80, 300)} />
          </View>

          <Text style={[typography.caption, { color: colors.mutedForeground }]}>Your code</Text>
          <Text style={[styles.code, { color: colors.foreground }]}>{code}</Text>
          <Text style={[typography.body2, { color: colors.mutedForeground, textAlign: 'center' }]}>
            It opens the {programName} sign-up page with your code filled in
            {discount > 0 ? ` (${discount}% off for them)` : ''}. When they pay, the commission is yours.
          </Text>

          <TouchableOpacity style={[styles.shareButton, { backgroundColor: colors.primary }]} onPress={share}>
            <Ionicons name="share-social-outline" size={20} color={colors.primaryForeground} />
            <Text style={[typography.button, { color: colors.primaryForeground }]}>Send the link instead</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  body: { flex: 1, alignItems: 'center', padding: 24, gap: 12 },
  qrCard: { padding: 12, borderRadius: 16, backgroundColor: '#fff', marginVertical: 8, elevation: 3, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8 },
  code: { fontSize: 30, fontWeight: '800', letterSpacing: 4 },
  shareButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12, marginTop: 8 },
});
