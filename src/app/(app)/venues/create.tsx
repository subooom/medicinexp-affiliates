// app/(app)/venues/create.tsx
import { VenueForm } from '@/components/venues/venue-form';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

export default function CreateVenueScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <VenueForm
        onSaved={(venue) => router.replace({ pathname: '/(app)/venues/[id]', params: { id: venue.id } })}
      />
    </View>
  );
}
