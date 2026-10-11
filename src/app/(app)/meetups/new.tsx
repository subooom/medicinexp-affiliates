// app/(app)/meetups/new.tsx — ask the program (or MedicineXP) for a meetup
import { Button, Field, ScreenHeader } from '@/components/ui';
import { useAppTheme } from '@/hooks/use-app-theme';
import { queuedMessage, sendOrQueue } from '@/offline/send';
import { typography } from '@/styles/typography';
import { uuidv4 } from '@/utils/uuid';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

export default function NewMeetupScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const [title, setTitle] = useState('');
  const [purpose, setPurpose] = useState('');
  const [place, setPlace] = useState('');
  const [preferredAt, setPreferredAt] = useState<Date | null>(null);
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const clientUuid = useRef(uuidv4());

  const submit = async () => {
    if (!title.trim()) {
      Alert.alert('What is it about?', 'Give the meetup a short title.');
      return;
    }
    setSaving(true);
    try {
      const result = await sendOrQueue({
        method: 'post',
        url: '/meetups',
        label: `Meetup request: ${title.trim()}`,
        data: {
          title: title.trim(),
          purpose: purpose.trim() || undefined,
          location_name: place.trim() || undefined,
          preferred_at: preferredAt?.toISOString(),
          client_uuid: clientUuid.current,
        },
      });
      Alert.alert('Request sent', result.queued ? queuedMessage : 'You will be told when it is scheduled.');
      router.back();
    } catch (error: any) {
      Alert.alert('Could not send', error.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenHeader title="Ask for a meetup" />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
        <Field label="What about?" value={title} onChangeText={setTitle} placeholder="e.g. Training on the new plans" maxLength={255} />
        <Field label="Details (optional)" value={purpose} onChangeText={setPurpose} placeholder="What do you want to discuss?" multiline />
        <Field label="Where would suit you? (optional)" value={place} onChangeText={setPlace} placeholder="e.g. Itahari office" />
        <View style={{ gap: 6 }}>
          <Text style={[typography.body2, { color: colors.foreground, fontWeight: '600' }]}>When would suit you? (optional)</Text>
          <TouchableOpacity onPress={() => setPicking(true)} style={{ minHeight: 50, borderWidth: 1, borderRadius: 12, borderColor: colors.border, backgroundColor: colors.inputBackground, justifyContent: 'center', paddingHorizontal: 14 }}>
            <Text style={[typography.body1, { color: preferredAt ? colors.foreground : colors.placeholder }]}>
              {preferredAt ? preferredAt.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Pick a time'}
            </Text>
          </TouchableOpacity>
        </View>
        <Button title="Send request" icon="send" onPress={submit} loading={saving} />
      </ScrollView>
      <DateTimePickerModal
        isVisible={picking}
        mode="datetime"
        minimumDate={new Date()}
        onConfirm={(date) => { setPreferredAt(date); setPicking(false); }}
        onCancel={() => setPicking(false)}
      />
    </View>
  );
}
