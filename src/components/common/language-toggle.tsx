// components/common/language-toggle.tsx — one tap switches English ⇄ नेपाली (remembered on the
// phone). It shows the language you'd switch to. Used in screen headers (fits the 56 px slot).
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { Language, setLanguage, useLanguage } from '@/utils/language';
import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

export function LanguageToggle() {
  const { colors } = useAppTheme();
  const language = useLanguage();
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

const styles = StyleSheet.create({
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderRadius: 14, paddingHorizontal: 8, paddingVertical: 4 },
});
