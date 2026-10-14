// src/components/field/attachments-card.tsx — photos and voice memos on a visit or lead,
// with buttons to add more
import { Card } from '@/components/ui';
import { useAppTheme } from '@/hooks/use-app-theme';
import { AttachTo, CapturedFile, uploadAttachment } from '@/offline/attachments';
import { queuedMessage } from '@/offline/send';
import { typography } from '@/styles/typography';
import { Attachment } from '@/types/models';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { takePhoto } from './photo-capture';
import { VoiceMemo } from './voice-memo';

function useAuthHeaders() {
  const [headers, setHeaders] = useState<Record<string, string> | null>(null);
  useEffect(() => {
    AsyncStorage.getItem('auth_token').then((token) => setHeaders(token ? { Authorization: `Bearer ${token}` } : {}));
  }, []);
  return headers;
}

function MemoRow({ attachment, headers }: { attachment: Attachment; headers: Record<string, string> }) {
  const { colors } = useAppTheme();
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);

  const toggle = () => {
    if (status.playing) {
      player.pause();
      return;
    }
    if (!status.isLoaded) player.replace({ uri: attachment.url, headers });
    player.play();
  };

  return (
    <View style={{ gap: 4 }}>
      <View style={styles.row}>
        <TouchableOpacity onPress={toggle} style={[styles.play, { backgroundColor: colors.primary }]} accessibilityLabel="Play voice memo">
          <Ionicons name={status.playing ? 'pause' : 'play'} size={18} color={colors.primaryForeground} />
        </TouchableOpacity>
        <Text style={[typography.body2, { color: colors.foreground, flex: 1 }]}>
          Voice memo{attachment.duration_seconds ? ` · ${Math.floor(attachment.duration_seconds / 60)}:${String(attachment.duration_seconds % 60).padStart(2, '0')}` : ''}
        </Text>
      </View>
      {!!attachment.transcript && <Text style={[typography.body2, { color: colors.mutedForeground }]}>“{attachment.transcript}”</Text>}
    </View>
  );
}

export function AttachmentsCard({ attachments, to, label, onAdded }: { attachments: Attachment[]; to: AttachTo; label: string; onAdded: () => void }) {
  const { colors } = useAppTheme();
  const headers = useAuthHeaders();
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [memo, setMemo] = useState<CapturedFile | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const photos = attachments.filter((a) => a.kind === 'photo');
  const memos = attachments.filter((a) => a.kind === 'voice_memo');

  const send = async (kind: 'photo' | 'voice_memo', file: CapturedFile) => {
    setBusy(true);
    try {
      const result = await uploadAttachment(kind, file, to, `${kind === 'photo' ? 'Photo' : 'Voice memo'}: ${label}`);
      if (result.queued) Alert.alert('Saved on your phone', queuedMessage);
      onAdded();
    } catch (error: any) {
      Alert.alert('Could not upload', error.message || 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const addPhoto = async () => {
    const photo = await takePhoto();
    if (photo) send('photo', photo);
  };

  return (
    <Card style={{ margin: 16, marginBottom: 0, gap: 12 }}>
      <View style={styles.row}>
        <Text style={[typography.body1, { color: colors.foreground, fontWeight: '600', flex: 1 }]}>Photos & voice memos</Text>
        {busy && <ActivityIndicator color={colors.primary} />}
      </View>

      {photos.length > 0 && headers && (
        <View style={styles.photos}>
          {photos.map((photo) => (
            <Pressable key={photo.id} onPress={() => setPreview(photo.url)}>
              <Image source={{ uri: photo.url, headers }} style={styles.thumb} contentFit="cover" cachePolicy="disk" />
            </Pressable>
          ))}
        </View>
      )}
      {headers && memos.map((m) => <MemoRow key={m.id} attachment={m} headers={headers} />)}
      {attachments.length === 0 && <Text style={[typography.body2, { color: colors.mutedForeground }]}>Nothing yet.</Text>}

      {recording ? (
        <View style={{ gap: 8 }}>
          <VoiceMemo memo={memo} onChange={setMemo} />
          <View style={styles.row}>
            <TouchableOpacity onPress={() => { setRecording(false); setMemo(null); }} style={{ flex: 1 }}>
              <Text style={[typography.body2, { color: colors.mutedForeground, textAlign: 'center' }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={!memo}
              onPress={() => {
                if (memo) send('voice_memo', memo);
                setRecording(false);
                setMemo(null);
              }}
              style={{ flex: 1, opacity: memo ? 1 : 0.4 }}
            >
              <Text style={[typography.body2, { color: colors.primary, fontWeight: '700', textAlign: 'center' }]}>Save memo</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.row}>
          <TouchableOpacity style={[styles.add, { borderColor: colors.border }]} onPress={addPhoto}>
            <Ionicons name="camera-outline" size={18} color={colors.primary} />
            <Text style={[typography.body2, { color: colors.foreground, fontWeight: '600' }]}>Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.add, { borderColor: colors.border }]} onPress={() => setRecording(true)}>
            <Ionicons name="mic-outline" size={18} color={colors.primary} />
            <Text style={[typography.body2, { color: colors.foreground, fontWeight: '600' }]}>Voice memo</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={!!preview} transparent onRequestClose={() => setPreview(null)}>
        <Pressable style={styles.overlay} onPress={() => setPreview(null)}>
          {preview && headers && <Image source={{ uri: preview, headers }} style={{ width: '100%', height: '80%' }} contentFit="contain" />}
        </Pressable>
      </Modal>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: { width: 84, height: 84, borderRadius: 10 },
  play: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  add: { flex: 1, minHeight: 46, borderWidth: 1, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center' },
});
