// components/team-up/qr-scanner.tsx — scan a teammate's team-up QR inside the app.
// The camera module loads only when the scanner opens, so an older build without it still
// runs the Team up screen (it just says the app needs updating).
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import { Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type CameraModule = typeof import('expo-camera');

function loadCamera(): CameraModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-camera') as CameraModule;
  } catch {
    return null;
  }
}

/** "medicinexp://team-up?code=ABC123" or a bare "ABC123" → "ABC123". */
export function codeFromScan(data: string): string | null {
  const fromLink = data.match(/[?&]code=([A-Za-z0-9]{6})\b/);
  if (fromLink) return fromLink[1].toUpperCase();
  const bare = data.trim().match(/^[A-Za-z0-9]{6}$/);
  return bare ? bare[0].toUpperCase() : null;
}

export function QrScanner({ visible, onClose, onCode }: { visible: boolean; onClose: () => void; onCode: (code: string) => void }) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      {visible && <ScannerBody onClose={onClose} onCode={onCode} />}
    </Modal>
  );
}

function ScannerBody({ onClose, onCode }: { onClose: () => void; onCode: (code: string) => void }) {
  const { colors } = useAppTheme();
  const camera = useRef(loadCamera()).current;

  if (!camera) {
    return (
      <Message
        icon="refresh-circle-outline"
        text="Scanning needs the latest version of the app. Until then, scan the QR with your phone's camera, or type the code."
        onClose={onClose}
      />
    );
  }
  return <Scanner camera={camera} onClose={onClose} onCode={onCode} colors={colors} />;
}

function Scanner({ camera, onClose, onCode, colors }: { camera: CameraModule; onClose: () => void; onCode: (code: string) => void; colors: ReturnType<typeof useAppTheme>['colors'] }) {
  const [permission, requestPermission] = camera.useCameraPermissions();
  const [wrong, setWrong] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) requestPermission();
  }, [permission, requestPermission]);

  if (!permission) return <View style={{ flex: 1, backgroundColor: '#000' }} />;

  if (!permission.granted) {
    return (
      <Message
        icon="camera-outline"
        text="Allow the camera to scan your teammate's code."
        action={permission.canAskAgain ? { label: 'Allow camera', onPress: requestPermission } : { label: 'Open settings', onPress: () => Linking.openSettings() }}
        onClose={onClose}
      />
    );
  }

  const CameraView = camera.CameraView;
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={({ data }) => {
          if (done.current) return;
          const code = codeFromScan(data);
          if (!code) {
            setWrong(true);
            return;
          }
          done.current = true;
          onCode(code);
        }}
      />
      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <TouchableOpacity onPress={onClose} style={styles.close} accessibilityLabel="Close scanner">
          <Ionicons name="close" size={26} color="#fff" />
        </TouchableOpacity>
        <View style={styles.frame} />
        <Text style={[typography.body1, styles.hint]}>
          {wrong ? "That isn't a team-up code. Point at your teammate's Team up QR." : "Point at your teammate's Team up QR"}
        </Text>
      </SafeAreaView>
    </View>
  );
}

function Message({ icon, text, action, onClose }: { icon: 'camera-outline' | 'refresh-circle-outline'; text: string; action?: { label: string; onPress: () => void }; onClose: () => void }) {
  const { colors } = useAppTheme();
  return (
    <SafeAreaView style={[styles.message, { backgroundColor: colors.background }]}>
      <Ionicons name={icon} size={48} color={colors.primary} />
      <Text style={[typography.body1, { color: colors.foreground, textAlign: 'center' }]}>{text}</Text>
      {action && (
        <TouchableOpacity onPress={action.onPress} style={[styles.button, { backgroundColor: colors.primary }]}>
          <Text style={[typography.button, { color: colors.primaryForeground }]}>{action.label}</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={onClose} style={styles.button}>
        <Text style={[typography.button, { color: colors.mutedForeground }]}>Close</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  close: { position: 'absolute', top: 48, right: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  frame: { width: 240, height: 240, borderRadius: 20, borderWidth: 3, borderColor: '#fff' },
  hint: { color: '#fff', marginTop: 24, textAlign: 'center', paddingHorizontal: 32, textShadowColor: '#000', textShadowRadius: 4 },
  message: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
  button: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, minWidth: 180, alignItems: 'center' },
});
