// src/components/field/photo-capture.tsx — take a shop photo (proof of visit)
import { useAppTheme } from '@/hooks/use-app-theme';
import { CapturedFile } from '@/offline/attachments';
import { typography } from '@/styles/typography';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

/** Opens the camera and returns the photo, or null if the MR cancelled. */
export async function takePhoto(): Promise<CapturedFile | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    Alert.alert('Camera needed', 'Allow camera access in your phone settings to take photos.');
    return null;
  }
  const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6, exif: false });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  return { uri: asset.uri, mimeType: asset.mimeType || 'image/jpeg', name: asset.fileName || `photo-${Date.now()}.jpg` };
}

export function PhotoCapture({ photo, onChange, label = 'Shop photo' }: { photo: CapturedFile | null; onChange: (photo: CapturedFile | null) => void; label?: string }) {
  const { colors } = useAppTheme();

  const capture = async () => {
    const next = await takePhoto();
    if (next) onChange(next);
  };

  if (photo) {
    return (
      <View style={styles.preview}>
        <Image source={{ uri: photo.uri }} style={styles.image} contentFit="cover" />
        <View style={{ flex: 1, gap: 8 }}>
          <Text style={[typography.body2, { color: colors.foreground, fontWeight: '600' }]}>{label} added</Text>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <TouchableOpacity onPress={capture}>
              <Text style={[typography.body2, { color: colors.primary, fontWeight: '600' }]}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onChange(null)}>
              <Text style={[typography.body2, { color: colors.destructive, fontWeight: '600' }]}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity style={[styles.button, { borderColor: colors.border, backgroundColor: colors.card }]} onPress={capture}>
      <Ionicons name="camera-outline" size={22} color={colors.primary} />
      <Text style={[typography.body1, { color: colors.foreground, fontWeight: '600' }]}>Take {label.toLowerCase()}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 52, borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  image: { width: 72, height: 72, borderRadius: 10 },
});
