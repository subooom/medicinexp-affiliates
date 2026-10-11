// app/(app)/venues/edit/[id].tsx
import { venueApi } from '@/api/venues';
import { VenueForm } from '@/components/venues/venue-form';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { Venue } from '@/types/models';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

export default function EditVenueScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    venueApi
      .getById(parseInt(id))
      .then((response) => setVenue(response.data.data.venue))
      .catch((err) => setError(err.message || 'Could not load this place'));
  }, [id]);

  if (!venue) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        {error ? (
          <Text style={[typography.body1, { color: colors.mutedForeground }]}>{error}</Text>
        ) : (
          <ActivityIndicator size="large" color={colors.primary} />
        )}
      </View>
    );
  }

  if (!venue.can_edit) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: colors.background }}>
        <Text style={[typography.body1, { color: colors.mutedForeground, textAlign: 'center' }]}>
          Only the person who added this place can edit it.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <VenueForm venue={venue} onSaved={() => router.back()} />
    </View>
  );
}
