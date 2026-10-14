// src/components/common/HintButton.tsx
import { useAppTheme } from '@/hooks/use-app-theme';
import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

interface HintButtonProps {
  variant?: 'light' | 'dark';
}

export function HintButton({ variant = 'light' }: HintButtonProps) {
  const { colors } = useAppTheme();

  const handlePress = () => {
    router.push('/onboarding?returnTo=/auth/login');
  };

  const textColor = variant === 'light' ? colors.mutedForeground : colors.mutedForeground;
  const iconColor = variant === 'light' ? colors.mutedForeground : colors.mutedForeground;

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.7}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="school-outline" size={16} color={iconColor} />
        </View>
        <Text style={[styles.text, { color: textColor }]}>
          New here? 
          <Text style={[styles.linkText, { color: colors.primary }]}> Learn how it works</Text>
        </Text>
        <Ionicons name="chevron-forward" size={14} color={iconColor} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconContainer: {
    marginRight: 2,
  },
  text: {
    fontSize: 13,
    fontFamily: 'JosefinSans-Regular',
  },
  linkText: {
    fontFamily: 'JosefinSans-SemiBold',
    fontWeight: '600',
  },
});