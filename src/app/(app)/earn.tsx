// app/(app)/earn.tsx — "How you earn": every way a rep earns in the current program, a few
// sentences each, with their own numbers (rate, codes, this week's bonus, next payout).
// The server writes the text (EN/ne) so the rules live in one place; links open the live screen.
import { EARN_SEEN_KEY, EarnSection, HowYouEarn, earningsApi } from '@/api/earnings';
import { LanguageToggle } from '@/components/common/language-toggle';
import { ScreenHeader } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useNarrator } from '@/hooks/use-narrator';
import { typography } from '@/styles/typography';
import { readableColor } from '@/utils/color';
import { apiErrorMessage } from '@/utils/errors';
import { toIconName } from '@/utils/icons';
import { pick, useLanguage } from '@/utils/language';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Href, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const UI = {
  title: { en: 'How you earn', ne: 'कसरी कमाउने' },
  intro: {
    en: 'Every way you earn here, with your own numbers. Tap 🔊 to listen.',
    ne: 'यहाँ कमाउने सबै तरिका, तपाईंकै अंकसहित। सुन्न 🔊 थिच्नुहोस्।',
  },
  noTier: { en: 'No tier yet', ne: 'अझै टियर छैन' },
  rates: { en: 'Your rates', ne: 'तपाईंको दर' },
  year: { en: 'Year', ne: 'वर्ष' },
};

export default function HowYouEarnScreen() {
  const { colors, isDark } = useAppTheme();
  const router = useRouter();
  const language = useLanguage();
  const programId = useAuth().activeMembership?.program?.id;
  const [data, setData] = useState<HowYouEarn | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const narrator = useNarrator(language);

  const load = useCallback(async () => {
    try {
      setData((await earningsApi.howYouEarn()).data.data);
      setError(null);
    } catch (err) {
      setError(apiErrorMessage(err, 'Could not load this. Pull down to try again.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Numbers belong to the program the rep is in: reload when it changes
  useEffect(() => {
    setLoading(true);
    setData(null);
    load();
    AsyncStorage.setItem(EARN_SEEN_KEY, '1').catch(() => undefined);
  }, [load, programId]);

  // Stays mounted: stop reading when leaving (or following a link), and on a language switch
  useFocusEffect(useCallback(() => narrator.stop, [narrator.stop]));
  useEffect(() => narrator.stop(), [language]); // eslint-disable-line react-hooks/exhaustive-deps

  const t = (text?: { en: string; ne?: string } | null) => (text ? pick(text, language) : '');
  const tierColor = readableColor(data?.tier?.color, colors.primary, isDark);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title={t(UI.title)} right={<LanguageToggle />} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      >
        <Text style={[typography.body2, { color: colors.mutedForeground }]}>{t(UI.intro)}</Text>

        {loading && <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />}
        {!loading && error && <Text style={[typography.body2, { color: colors.destructive }]}>{error}</Text>}

        {data && (
          <View style={[styles.tier, { borderColor: tierColor + '55', backgroundColor: tierColor + '14' }]}>
            <Ionicons name="trophy" size={22} color={tierColor} />
            <View style={{ flex: 1 }}>
              <Text style={[typography.body1, { color: colors.foreground, fontWeight: '700' }]}>{data.tier?.name ?? t(UI.noTier)}</Text>
              {data.tier && (
                <Text style={[typography.caption, { color: colors.mutedForeground }]}>
                  {t(UI.rates)}: {data.tier.rates.map((rate, i) => `${t(UI.year)} ${i + 1} ${rate}%`).join(' · ')}
                </Text>
              )}
            </View>
          </View>
        )}

        {data?.sections.map((section) => (
          <Section
            key={section.id}
            section={section}
            t={t}
            playing={narrator.speakingId === section.id}
            onPlay={() => narrator.toggle(section.id, [section.title, ...(section.highlight ? [section.highlight] : []), section.body])}
            onLink={() => section.link && router.push(section.link.route as Href)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function Section({
  section,
  t,
  playing,
  onPlay,
  onLink,
}: {
  section: EarnSection;
  t: (text?: { en: string; ne?: string } | null) => string;
  playing: boolean;
  onPlay: () => void;
  onLink: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: colors.primary + '1A' }]}>
          <Ionicons name={toIconName(section.icon, 'cash-outline')} size={20} color={colors.primary} />
        </View>
        <Text style={[typography.body1, { color: colors.foreground, fontWeight: '700', flex: 1 }]}>{t(section.title)}</Text>
        <TouchableOpacity
          onPress={onPlay}
          hitSlop={8}
          style={[styles.play, { backgroundColor: playing ? colors.primary : colors.primary + '14' }]}
          accessibilityLabel={playing ? 'Stop reading' : 'Read aloud'}
        >
          <Ionicons name={playing ? 'stop' : 'volume-high-outline'} size={16} color={playing ? colors.primaryForeground : colors.primary} />
        </TouchableOpacity>
      </View>
      {!!section.highlight && (
        <Text style={[typography.h5, { color: colors.secondary, fontWeight: '800' }]}>{t(section.highlight)}</Text>
      )}
      <Text style={[typography.body2, { color: colors.foreground, lineHeight: 21 }]}>{t(section.body)}</Text>
      {section.link && (
        <TouchableOpacity onPress={onLink} style={[styles.link, { backgroundColor: colors.primary + '14' }]}>
          <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>{t(section.link.label)}</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 48 },
  tier: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 14, padding: 14 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  play: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  link: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14 },
});
