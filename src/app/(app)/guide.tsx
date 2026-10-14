// app/(app)/guide.tsx — everything a rep needs to know about the app, in English or Nepali.
// The text comes from the server's rep-guide.json (cached, with a copy built into the app).
// Links open the real screen; Back comes back here, to the same open section.
import { Guide, GuideLink, guideApi } from '@/api/guide';
import { ScreenHeader } from '@/components/ui';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { toIconName } from '@/utils/icons';
import { Language, pick, setLanguage, useLanguage } from '@/utils/language';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Href, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const UI = {
  title: { en: 'Guide', ne: 'गाइड' },
  search: { en: 'Search the guide', ne: 'गाइडमा खोज्नुहोस्' },
  faq: { en: 'Quick answers', ne: 'छिटो जवाफ' },
  topics: { en: 'Everything about the app', ne: 'एपबारे सबै कुरा' },
  none: { en: 'Nothing matches. Try another word.', ne: 'केही भेटिएन। अर्को शब्द प्रयोग गर्नुहोस्।' },
};

export default function GuideScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const language = useLanguage();
  const [guide, setGuide] = useState<Guide | null>(null);
  const [query, setQuery] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [openSection, setOpenSection] = useState<string | null>(null);

  // Show what the phone has at once, then swap in a newer version if the server has one
  useEffect(() => {
    let alive = true;
    guideApi.local().then(({ guide: local, etag }) => {
      if (!alive) return;
      setGuide(local);
      guideApi.refresh(etag).then((fresh) => alive && fresh && setGuide(fresh));
    });
    return () => {
      alive = false;
    };
  }, []);

  const t = (text: { en: string; ne?: string }) => pick(text, language);
  const q = query.trim().toLowerCase();
  const matches = (...texts: ({ en: string; ne?: string } | undefined)[]) =>
    !q || texts.some((text) => text && `${text.en} ${text.ne ?? ''}`.toLowerCase().includes(q));

  // While searching, show every matching item with its section open
  const faq = useMemo(() => (guide?.faq ?? []).map((item, index) => ({ item, index })).filter(({ item }) => matches(item.q, item.a)), [guide, q]); // eslint-disable-line react-hooks/exhaustive-deps
  const sections = useMemo(
    () =>
      (guide?.sections ?? [])
        .map((section) => ({ ...section, items: section.items.filter((item) => matches(section.title, item.title, item.body)) }))
        .filter((section) => section.items.length > 0),
    [guide, q] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const open = (link: GuideLink) => router.push(link.route as Href);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader
        title={t(UI.title)}
        right={<LanguageToggle language={language} />}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.search, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}>
          <Ionicons name="search" size={18} color={colors.mutedForeground} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t(UI.search)}
            placeholderTextColor={colors.placeholder}
            style={[typography.body2, { flex: 1, color: colors.foreground, paddingVertical: 10 }]}
          />
          {!!query && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        {faq.length > 0 && (
          <>
            <Text style={[typography.overline, styles.heading, { color: colors.primary }]}>{t(UI.faq)}</Text>
            {faq.map(({ item, index }) => {
              const expanded = !!q || openFaq === index;
              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => setOpenFaq(openFaq === index ? null : index)}
                  style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                  activeOpacity={0.8}
                >
                  <View style={styles.row}>
                    <Ionicons name="help-circle-outline" size={20} color={colors.secondary} />
                    <Text style={[typography.body1, { color: colors.foreground, fontWeight: '600', flex: 1 }]}>{t(item.q)}</Text>
                    <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.mutedForeground} />
                  </View>
                  {expanded && (
                    <>
                      <Text style={[typography.body2, styles.body, { color: colors.foreground }]}>{t(item.a)}</Text>
                      {item.link && <LinkButton text={t(item.link.label)} onPress={() => open(item.link!)} />}
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {sections.length > 0 && <Text style={[typography.overline, styles.heading, { color: colors.primary }]}>{t(UI.topics)}</Text>}
        {sections.map((section) => {
          const expanded = !!q || openSection === section.id;
          return (
            <View key={section.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TouchableOpacity style={styles.row} onPress={() => setOpenSection(openSection === section.id ? null : section.id)}>
                <View style={[styles.icon, { backgroundColor: colors.primary + '1A' }]}>
                  <Ionicons name={toIconName(section.icon, 'book-outline')} size={20} color={colors.primary} />
                </View>
                <Text style={[typography.body1, { color: colors.foreground, fontWeight: '700', flex: 1 }]}>{t(section.title)}</Text>
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
              {expanded &&
                section.items.map((item, index) => (
                  <View key={index} style={[styles.item, { borderTopColor: colors.border }]}>
                    <Text style={[typography.body2, { color: colors.foreground, fontWeight: '700' }]}>{t(item.title)}</Text>
                    <Text style={[typography.body2, styles.body, { color: colors.foreground }]}>{t(item.body)}</Text>
                    {item.link && <LinkButton text={t(item.link.label)} onPress={() => open(item.link!)} />}
                  </View>
                ))}
            </View>
          );
        })}

        {guide && faq.length === 0 && sections.length === 0 && (
          <Text style={[typography.body2, { color: colors.mutedForeground, textAlign: 'center', marginTop: 24 }]}>{t(UI.none)}</Text>
        )}
      </ScrollView>
    </View>
  );
}

/** One tap switches language; it shows the language you'd switch to. */
function LanguageToggle({ language }: { language: Language }) {
  const { colors } = useAppTheme();
  const next: Language = language === 'en' ? 'ne' : 'en';
  return (
    <TouchableOpacity
      onPress={() => setLanguage(next)}
      style={[styles.toggle, { borderColor: colors.primary, backgroundColor: colors.primary + '14' }]}
      accessibilityLabel={next === 'ne' ? 'नेपालीमा हेर्नुहोस्' : 'Show in English'}
    >
      <Ionicons name="language" size={14} color={colors.primary} />
      <Text style={[typography.caption, { fontWeight: '700', color: colors.primary }]}>{next === 'ne' ? 'ने' : 'EN'}</Text>
    </TouchableOpacity>
  );
}

function LinkButton({ text, onPress }: { text: string; onPress: () => void }) {
  const { colors } = useAppTheme();
  return (
    <TouchableOpacity onPress={onPress} style={[styles.link, { backgroundColor: colors.primary + '14' }]}>
      <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>{text}</Text>
      <Ionicons name="arrow-forward" size={14} color={colors.primary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 10, paddingBottom: 48 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12 },
  heading: { marginTop: 12 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  item: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, gap: 4 },
  body: { lineHeight: 21 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, marginTop: 4 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderRadius: 14, paddingHorizontal: 8, paddingVertical: 4 },
});
