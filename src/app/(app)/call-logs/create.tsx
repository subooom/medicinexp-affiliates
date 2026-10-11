// app/(app)/call-logs/create.tsx
import { CallLogForm } from '@/components/call-logs/call-log-form';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

export default function CreateCallLogScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const params = useLocalSearchParams<{ leadId?: string; venueId?: string; scheduled?: string }>();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <CallLogForm
        leadId={params.leadId ? parseInt(params.leadId) : undefined}
        venueId={params.venueId ? parseInt(params.venueId) : undefined}
        scheduled={params.scheduled === '1'}
        onSaved={() => router.back()}
      />
    </View>
  );
}
