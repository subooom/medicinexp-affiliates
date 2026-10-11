// app/(app)/map.tsx — pharmacies around the MR for route planning, coloured by what
// they mean to them. OpenStreetMap tiles in Leaflet (no Google Maps key or cost).
// Offline, the list still works from venues saved on the phone.
import { fieldApi } from '@/api/field';
import { Card, ScreenHeader } from '@/components/ui';
import { useAppTheme } from '@/hooks/use-app-theme';
import { network } from '@/offline/network';
import { venueIndex } from '@/offline/venue-index';
import { typography } from '@/styles/typography';
import { MapPin, MapPinStatus } from '@/types/models';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';

// Any XYZ tile server works. The public OpenStreetMap servers are fine for a small team;
// switch to a hosted provider (e.g. MapTiler, Stadia) with EXPO_PUBLIC_MAP_TILE_URL if usage grows.
const TILE_URL = process.env.EXPO_PUBLIC_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = process.env.EXPO_PUBLIC_MAP_TILE_ATTRIBUTION || '&copy; OpenStreetMap contributors';

const STATUS: Record<MapPinStatus, { label: string; color: string }> = {
  signed_up: { label: 'Signed up', color: '#16a34a' },
  interested: { label: 'Interested', color: '#f59e0b' },
  visited: { label: 'Visited', color: '#5A3DA8' },
  not_visited: { label: 'Not visited', color: '#9ca3af' },
};

const RADII = [1, 3, 5, 10];

function leafletHtml(center: { latitude: number; longitude: number }, pins: MapPin[]) {
  const data = JSON.stringify(
    pins.map((p) => ({ id: p.id, lat: p.latitude, lng: p.longitude, name: p.name, color: STATUS[p.my_status].color, label: STATUS[p.my_status].label }))
  );
  return `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{height:100%;margin:0} .leaflet-popup-content{font:14px sans-serif}</style>
</head><body><div id="map"></div><script>
var map = L.map('map', { zoomControl: false }).setView([${center.latitude}, ${center.longitude}], 15);
L.tileLayer(${JSON.stringify(TILE_URL)}, { maxZoom: 19, attribution: ${JSON.stringify(TILE_ATTRIBUTION)} }).addTo(map);
L.circleMarker([${center.latitude}, ${center.longitude}], { radius: 8, color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }).addTo(map);
${data}.forEach(function (p) {
  var m = L.circleMarker([p.lat, p.lng], { radius: 9, color: '#fff', weight: 2, fillColor: p.color, fillOpacity: 0.95 }).addTo(map);
  var div = document.createElement('div');
  div.innerHTML = '<b></b><br><span style="color:' + p.color + '"></span><br><a href="#">Open</a>';
  div.querySelector('b').textContent = p.name;
  div.querySelector('span').textContent = p.label;
  div.querySelector('a').onclick = function (e) { e.preventDefault(); window.ReactNativeWebView.postMessage(String(p.id)); };
  m.bindPopup(div);
});
</script></body></html>`;
}

export default function MapScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const [here, setHere] = useState<{ latitude: number; longitude: number } | null>(null);
  const [pins, setPins] = useState<MapPin[]>([]);
  const [radius, setRadius] = useState(3);
  const [filter, setFilter] = useState<MapPinStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(!network.isOnline());

  const load = useCallback(async (km: number) => {
    setLoading(true);
    setError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setError('Allow location access to see pharmacies near you.');
        return;
      }
      const position = (await Location.getLastKnownPositionAsync()) ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
      const point = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      setHere(point);

      try {
        const response = await fieldApi.getMap({ ...point, radius: km });
        setPins(response.data.data);
        setOffline(false);
      } catch {
        // Offline: places saved on the phone, without visit status
        const saved = await venueIndex.nearby(point.latitude, point.longitude, km, 200);
        setPins(
          saved.map((v) => ({
            id: v.id,
            name: v.name,
            address: v.address,
            latitude: Number(v.latitude),
            longitude: Number(v.longitude),
            type: v.type?.slug ?? null,
            distance_km: v.distance ?? 0,
            my_status: v.is_customer ? 'signed_up' : 'not_visited',
            last_visit_at: null,
          }))
        );
        setOffline(true);
      }
    } catch {
      setError('Could not find your location. Try again outdoors.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(radius);
  }, [load, radius]);

  const shown = useMemo(() => (filter ? pins.filter((p) => p.my_status === filter) : pins), [pins, filter]);
  const html = useMemo(() => (here ? leafletHtml(here, shown) : null), [here, shown]);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    pins.forEach((p) => (c[p.my_status] = (c[p.my_status] ?? 0) + 1));
    return c;
  }, [pins]);

  const open = (id: number) => router.push({ pathname: '/(app)/venues/[id]', params: { id } });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Pharmacies near me" />

      <View style={styles.mapBox}>
        {loading && !html ? (
          <ActivityIndicator style={{ marginTop: 80 }} color={colors.primary} />
        ) : error ? (
          <Text style={[typography.body2, { color: colors.mutedForeground, textAlign: 'center', padding: 24 }]}>{error}</Text>
        ) : offline ? (
          <Text style={[typography.body2, { color: colors.mutedForeground, textAlign: 'center', padding: 24 }]}>
            The map needs internet. Places saved on your phone are listed below.
          </Text>
        ) : html ? (
          <WebView
            originWhitelist={['*']}
            source={{ html }}
            onMessage={(event) => open(Number(event.nativeEvent.data))}
            style={{ flex: 1 }}
          />
        ) : null}
      </View>

      <View style={styles.controls}>
        <View style={styles.chips}>
          {RADII.map((km) => (
            <TouchableOpacity
              key={km}
              onPress={() => setRadius(km)}
              style={[styles.chip, { borderColor: radius === km ? colors.primary : colors.border, backgroundColor: radius === km ? colors.primary + '15' : colors.card }]}
            >
              <Text style={[typography.caption, { color: radius === km ? colors.primary : colors.foreground, fontWeight: '700' }]}>{km} km</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.chips}>
          {(Object.keys(STATUS) as MapPinStatus[]).map((key) => (
            <TouchableOpacity
              key={key}
              onPress={() => setFilter(filter === key ? null : key)}
              style={[styles.chip, { borderColor: filter === key ? STATUS[key].color : colors.border, backgroundColor: colors.card }]}
            >
              <View style={[styles.dot, { backgroundColor: STATUS[key].color }]} />
              <Text style={[typography.caption, { color: colors.foreground, fontWeight: '600' }]}>
                {STATUS[key].label} {counts[key] ?? 0}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={shown}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingTop: 0, gap: 8 }}
        ListEmptyComponent={
          !loading ? <Text style={[typography.body2, { color: colors.mutedForeground, textAlign: 'center' }]}>No places found in {radius} km.</Text> : null
        }
        renderItem={({ item }) => (
          <Card onPress={() => item.id > 0 && open(item.id)} style={styles.row}>
            <View style={[styles.dot, { backgroundColor: STATUS[item.my_status].color, width: 12, height: 12 }]} />
            <View style={{ flex: 1 }}>
              <Text style={[typography.body1, { color: colors.foreground, fontWeight: '600' }]} numberOfLines={1}>{item.name}</Text>
              <Text style={[typography.caption, { color: colors.mutedForeground }]} numberOfLines={1}>
                {item.distance_km.toFixed(1)} km · {STATUS[item.my_status].label}
                {item.last_visit_at ? ` · last ${new Date(item.last_visit_at).toLocaleDateString()}` : ''}
              </Text>
            </View>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mapBox: { height: 300, backgroundColor: '#e5e7eb' },
  controls: { padding: 12, gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
});
