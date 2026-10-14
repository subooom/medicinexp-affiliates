// src/utils/maps.ts — open the phone's maps app at a point (Google Maps in the browser as a fallback)
import { Linking, Platform } from 'react-native';

export const openMaps = (latitude: number | null, longitude: number | null, label: string) => {
  if (latitude == null || longitude == null) return;
  const url =
    Platform.OS === 'ios'
      ? `maps:0,0?q=${encodeURIComponent(label)}@${latitude},${longitude}`
      : `geo:0,0?q=${latitude},${longitude}(${encodeURIComponent(label)})`;
  Linking.openURL(url).catch(() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`));
};
