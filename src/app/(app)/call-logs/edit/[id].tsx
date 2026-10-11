// app/(app)/call-logs/edit/[id].tsx
import { callLogApi } from '@/api/call-logs';
import { CallLogForm } from '@/components/call-logs/call-log-form';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { CallLog } from '@/types/models';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

export default function EditCallLogScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [callLog, setCallLog] = useState<CallLog | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    callLogApi
      .getById(parseInt(id))
      .then((response) => setCallLog(response.data.data))
      .catch((err) => setError(err.message || 'Could not load this call'));
  }, [id]);

  if (!callLog) {
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
      <CallLogForm callLog={callLog} onSaved={() => router.back()} />
    </View>
  );
}
