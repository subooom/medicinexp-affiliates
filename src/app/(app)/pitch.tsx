// app/(app)/pitch.tsx — what to say and what to show: the program's cheat sheet and the
// demo video, both available offline
import { fieldApi } from '@/api/field';
import { Button, Card, EmptyState, ScreenHeader, SectionTitle } from '@/components/ui';
import { useAppTheme } from '@/hooks/use-app-theme';
import { demoVideo } from '@/offline/demo-video';
import { typography } from '@/styles/typography';
import { FieldKit } from '@/types/models';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

function DemoPlayer({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });
  return <VideoView player={player} style={styles.video} nativeControls contentFit="contain" fullscreenOptions={{ enable: true }} />;
}

export default function PitchScreen() {
  const { colors } = useAppTheme();
  const [kit, setKit] = useState<FieldKit | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<number | null>(null);
  const [open, setOpen] = useState<number | null>(0);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const next = (await fieldApi.getKit()).data.data;
      setKit(next);
      setVideoUri(await demoVideo.localUri(next.program_id));
      // Already current on the phone, or on Wi-Fi: make sure the latest is here
      demoVideo.sync(next).then((uri) => uri && setVideoUri(uri)).catch(() => undefined);
    } catch {
      setKit(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const download = async () => {
    if (!kit?.demo_video) return;
    setProgress(0);
    try {
      const uri = await demoVideo.sync(kit, { force: true, onProgress: setProgress });
      if (uri) setVideoUri(uri);
    } catch {
      Alert.alert('Download failed', 'Check your internet and try again.');
    } finally {
      setProgress(null);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScreenHeader title="Pitch kit" />
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      </View>
    );
  }

  const cards = (kit?.cheat_sheet ?? []).filter(
    (card) => !search.trim() || `${card.title} ${card.body}`.toLowerCase().includes(search.trim().toLowerCase())
  );
  const sizeMb = kit?.demo_video ? (kit.demo_video.bytes / 1048576).toFixed(0) : '0';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Pitch kit" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {!kit ? (
          <EmptyState icon="cloud-offline-outline" title="Not downloaded yet" message="Open this once with internet and it will be saved on your phone." />
        ) : (
          <>
            <SectionTitle>Demo video</SectionTitle>
            {!kit.demo_video ? (
              <Card>
                <Text style={[typography.body2, { color: colors.mutedForeground }]}>{kit.program_name} has not added a demo video yet.</Text>
              </Card>
            ) : videoUri ? (
              <View style={{ gap: 6 }}>
                <DemoPlayer uri={videoUri} />
                <Text style={[typography.caption, { color: colors.mutedForeground }]}>Saved on your phone · plays without internet</Text>
              </View>
            ) : (
              <Card style={{ gap: 10 }}>
                <Text style={[typography.body2, { color: colors.foreground }]}>
                  Download the {kit.program_name} demo ({sizeMb} MB) so you can play it to pharmacy owners without internet. It downloads by itself on Wi-Fi.
                </Text>
                {progress !== null ? (
                  <View style={{ gap: 6 }}>
                    <View style={[styles.bar, { backgroundColor: colors.border }]}>
                      <View style={[styles.barFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: colors.primary }]} />
                    </View>
                    <Text style={[typography.caption, { color: colors.mutedForeground }]}>Downloading… {Math.round(progress * 100)}%</Text>
                  </View>
                ) : (
                  <Button title="Download now" icon="download-outline" onPress={download} />
                )}
              </Card>
            )}

            <SectionTitle>What to say</SectionTitle>
            {(kit.cheat_sheet ?? []).length > 4 && (
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search, e.g. price, Excel"
                placeholderTextColor={colors.placeholder}
                style={[styles.search, { borderColor: colors.border, backgroundColor: colors.inputBackground, color: colors.foreground }]}
              />
            )}
            {cards.length === 0 ? (
              <Card>
                <Text style={[typography.body2, { color: colors.mutedForeground }]}>
                  {kit.cheat_sheet.length === 0 ? 'Your program has not added any tips yet.' : 'Nothing matches.'}
                </Text>
              </Card>
            ) : (
              cards.map((card, index) => (
                <Card key={`${card.title}-${index}`} onPress={() => setOpen(open === index ? null : index)} style={{ gap: 8 }}>
                  <View style={styles.row}>
                    <Text style={[typography.body1, { color: colors.foreground, fontWeight: '600', flex: 1 }]}>{card.title || 'Tip'}</Text>
                    <Ionicons name={open === index ? 'chevron-up' : 'chevron-down'} size={18} color={colors.mutedForeground} />
                  </View>
                  {open === index && <Text style={[typography.body1, { color: colors.foreground, lineHeight: 22 }]}>{card.body}</Text>}
                </Card>
              ))
            )}

            {(kit.contact.name || kit.contact.phone) && (
              <>
                <SectionTitle>Need help?</SectionTitle>
                <Card>
                  <Text style={[typography.body2, { color: colors.foreground }]}>
                    {[kit.contact.name, kit.contact.phone].filter(Boolean).join(' · ')}
                  </Text>
                </Card>
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  video: { width: '100%', aspectRatio: 16 / 9, borderRadius: 12, backgroundColor: '#000' },
  bar: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8 },
  search: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14 },
});
