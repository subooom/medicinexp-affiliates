// src/hooks/useFonts.ts
import { JosefinSans_100Thin, JosefinSans_200ExtraLight, JosefinSans_300Light, JosefinSans_400Regular, JosefinSans_500Medium, JosefinSans_600SemiBold, JosefinSans_700Bold } from '@expo-google-fonts/josefin-sans';
import { useFonts } from 'expo-font';

export function useCustomFonts() {
  const [fontsLoaded] = useFonts({
    'JosefinSans-Thin': JosefinSans_100Thin,
    'JosefinSans-ExtraLight': JosefinSans_200ExtraLight,
    'JosefinSans-Light': JosefinSans_300Light,
    'JosefinSans-Regular': JosefinSans_400Regular,
    'JosefinSans-Medium': JosefinSans_500Medium,
    'JosefinSans-SemiBold': JosefinSans_600SemiBold,
    'JosefinSans-Bold': JosefinSans_700Bold,
  });

  return fontsLoaded;
}