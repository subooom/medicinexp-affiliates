// app/(app)/leads/create.tsx
import { LeadForm } from '@/components/leads/lead-form';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

export default function CreateLeadScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const params = useLocalSearchParams<{ venueId?: string; visitId?: string }>();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LeadForm
        venueId={params.venueId ? parseInt(params.venueId) : undefined}
        visitId={params.visitId ? parseInt(params.visitId) : undefined}
        onSaved={(lead) => (lead ? router.replace({ pathname: '/(app)/leads/[id]', params: { id: lead.id } }) : router.back())}
      />
    </View>
  );
}
