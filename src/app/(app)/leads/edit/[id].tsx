// app/(app)/leads/edit/[id].tsx
import { leadApi } from '@/api/leads';
import { LeadForm } from '@/components/leads/lead-form';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { Lead } from '@/types/models';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

export default function EditLeadScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [lead, setLead] = useState<Lead | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    leadApi
      .getById(parseInt(id))
      .then((response) => setLead(response.data.data))
      .catch((err) => setError(err.message || 'Could not load this lead'));
  }, [id]);

  if (!lead) {
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

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LeadForm lead={lead} onSaved={() => router.back()} />
    </View>
  );
}
