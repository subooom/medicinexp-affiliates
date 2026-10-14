// components/field/pitch-kit-card.tsx — one program's pitch kit, folded into the check-in form
// so the rep can pitch without leaving it: products, what to say, and the demo if it's on the phone.
import { fieldApi } from '@/api/field';
import { useAppTheme } from '@/hooks/use-app-theme';
import { demoVideo } from '@/offline/demo-video';
import { typography } from '@/styles/typography';
import { FieldKit, Product } from '@/types/models';
import { formatPaisa } from '@/utils/money';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function Demo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });
  return <VideoView player={player} style={styles.video} nativeControls contentFit="contain" fullscreenOptions={{ enable: true }} />;
}

export function PitchKitCard({ programId, programName, initiallyOpen = false }: { programId: number; programName: string; initiallyOpen?: boolean }) {
  const { colors } = useAppTheme();
  const [open, setOpen] = useState(initiallyOpen);
  const [kit, setKit] = useState<FieldKit | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [tipOpen, setTipOpen] = useState<number | null>(null);
  const [productOpen, setProductOpen] = useState<number | null>(null);

  // Loaded on first open (from the phone's cache when offline)
  useEffect(() => {
    if (!open || loaded) return;
    setLoading(true);
    Promise.all([
      fieldApi.getKit(programId).then((r) => setKit(r.data.data)).catch(() => undefined),
      fieldApi.getProducts(programId).then((r) => setProducts(r.data.data)).catch(() => undefined),
      demoVideo.localUri(programId).then(setVideoUri).catch(() => undefined),
    ]).finally(() => {
      setLoading(false);
      setLoaded(true);
    });
  }, [open, loaded, programId]);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <TouchableOpacity style={styles.header} onPress={() => setOpen(!open)}>
        <Ionicons name="easel-outline" size={20} color={colors.primary} />
        <Text style={[typography.body1, { color: colors.foreground, fontWeight: '700', flex: 1 }]}>{programName} pitch kit</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.mutedForeground} />
      </TouchableOpacity>

      {open && (
        <View style={{ gap: 10 }}>
          {loading && <ActivityIndicator color={colors.primary} />}
          {loaded && !kit && products.length === 0 && (
            <Text style={[typography.body2, { color: colors.mutedForeground }]}>Not on your phone yet. Open it once with internet.</Text>
          )}

          {products.map((product) => (
            <TouchableOpacity key={product.id} onPress={() => setProductOpen(productOpen === product.id ? null : product.id)} style={[styles.item, { borderColor: colors.border }]}>
              <View style={styles.row}>
                <Text style={[typography.body2, { color: colors.foreground, fontWeight: '700', flex: 1 }]}>{product.name}</Text>
                <Text style={[typography.body2, { color: colors.primary, fontWeight: '800' }]}>{formatPaisa(product.first_year_price_paisa)}</Text>
              </View>
              {productOpen === product.id &&
                [product.description, ...product.features].filter(Boolean).map((line) => (
                  <Text key={line as string} style={[typography.caption, { color: colors.foreground }]}>
                    • {line}
                  </Text>
                ))}
            </TouchableOpacity>
          ))}

          {videoUri && <Demo uri={videoUri} />}
          {kit?.demo_video && !videoUri && (
            <Text style={[typography.caption, { color: colors.mutedForeground }]}>Demo video not downloaded yet: get it from the Pitch kit screen on Wi-Fi.</Text>
          )}

          {(kit?.cheat_sheet ?? []).map((tip, index) => (
            <TouchableOpacity key={`${tip.title}-${index}`} onPress={() => setTipOpen(tipOpen === index ? null : index)} style={[styles.item, { borderColor: colors.border }]}>
              <View style={styles.row}>
                <Text style={[typography.body2, { color: colors.foreground, fontWeight: '600', flex: 1 }]}>{tip.title || 'Tip'}</Text>
                <Ionicons name={tipOpen === index ? 'chevron-up' : 'chevron-down'} size={16} color={colors.mutedForeground} />
              </View>
              {tipOpen === index && <Text style={[typography.body2, { color: colors.foreground, lineHeight: 20 }]}>{tip.body}</Text>}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  item: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 6 },
  video: { width: '100%', aspectRatio: 16 / 9, borderRadius: 10, backgroundColor: '#000' },
});
