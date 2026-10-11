// src/components/field/voice-memo.tsx — tap to record a voice note after a visit.
// Where the phone supports it (Android 13+, iOS), speech is turned into text on the
// phone while recording; nothing is sent to an AI service. Older phones just record.
import { useAppTheme } from '@/hooks/use-app-theme';
import { CapturedFile } from '@/offline/attachments';
import { typography } from '@/styles/typography';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus, useAudioRecorder } from 'expo-audio';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const MAX_SECONDS = 180;
const LANGUAGE_KEY = 'voice_memo_language';
const LANGUAGES = [
  { code: 'en-US', label: 'English' },
  { code: 'ne-NP', label: 'नेपाली' },
];

function canTranscribe(): boolean {
  try {
    return ExpoSpeechRecognitionModule.isRecognitionAvailable() && ExpoSpeechRecognitionModule.supportsRecording();
  } catch {
    return false;
  }
}

export function VoiceMemo({ memo, onChange }: { memo: CapturedFile | null; onChange: (memo: CapturedFile | null) => void }) {
  const { colors } = useAppTheme();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const player = useAudioPlayer(null);
  const playerStatus = useAudioPlayerStatus(player);

  const [mode, setMode] = useState<'idle' | 'recording'>('idle');
  const [seconds, setSeconds] = useState(0);
  const [language, setLanguage] = useState('en-US');
  const [liveText, setLiveText] = useState('');
  const usingSpeech = useRef(false);
  const finalText = useRef('');
  const startedAt = useRef(0);
  const audioUri = useRef<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(LANGUAGE_KEY).then((saved) => saved && setLanguage(saved));
  }, []);

  // Recording timer, with an automatic stop
  useEffect(() => {
    if (mode !== 'recording') return;
    const timer = setInterval(() => {
      const elapsed = Math.round((Date.now() - startedAt.current) / 1000);
      setSeconds(elapsed);
      if (elapsed >= MAX_SECONDS) stop();
    }, 500);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Speech recognition events (only used on phones that support recording + recognition)
  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript ?? '';
    if (event.isFinal) {
      finalText.current = `${finalText.current} ${text}`.trim();
      setLiveText(finalText.current);
    } else {
      setLiveText(`${finalText.current} ${text}`.trim());
    }
  });
  useSpeechRecognitionEvent('audioend', (event) => {
    if (event.uri) audioUri.current = event.uri;
  });
  useSpeechRecognitionEvent('end', () => {
    if (usingSpeech.current) finish();
  });
  useSpeechRecognitionEvent('error', (event) => {
    // "no-speech" just means silence; keep whatever audio was recorded
    if (event.error !== 'no-speech' && event.error !== 'aborted') {
      console.warn('Speech recognition error', event.error, event.message);
    }
  });

  const finish = () => {
    const duration = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
    setMode('idle');
    if (!audioUri.current) {
      Alert.alert('Nothing recorded', 'Please try again.');
      return;
    }
    const isWav = audioUri.current.endsWith('.wav');
    onChange({
      uri: audioUri.current,
      mimeType: isWav ? 'audio/wav' : audioUri.current.endsWith('.caf') ? 'audio/x-caf' : 'audio/mp4',
      name: `voice-memo-${Date.now()}.${isWav ? 'wav' : audioUri.current.split('.').pop() || 'm4a'}`,
      durationSeconds: duration,
      transcript: finalText.current || undefined,
    });
  };

  const start = async () => {
    audioUri.current = null;
    finalText.current = '';
    setLiveText('');
    setSeconds(0);

    usingSpeech.current = canTranscribe();

    if (usingSpeech.current) {
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) {
        usingSpeech.current = false;
      }
    }

    if (usingSpeech.current) {
      let onDevice = false;
      try {
        onDevice = ExpoSpeechRecognitionModule.supportsOnDeviceRecognition();
      } catch {
        onDevice = false;
      }
      startedAt.current = Date.now();
      setMode('recording');
      ExpoSpeechRecognitionModule.start({
        lang: language,
        interimResults: true,
        continuous: true,
        requiresOnDeviceRecognition: onDevice,
        addsPunctuation: onDevice,
        recordingOptions: { persist: true },
        androidIntentOptions: { EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 10000 },
      });
      return;
    }

    // Plain recording (older Android, or speech permission refused)
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Microphone needed', 'Allow microphone access in your phone settings to record voice memos.');
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    startedAt.current = Date.now();
    setMode('recording');
  };

  const stop = async () => {
    if (usingSpeech.current) {
      // Emits audioend + the last result, then end -> finish()
      ExpoSpeechRecognitionModule.stop();
      return;
    }
    await recorder.stop();
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
    audioUri.current = recorder.uri;
    finish();
  };

  const play = () => {
    if (!memo) return;
    if (playerStatus.playing) {
      player.pause();
    } else {
      player.replace({ uri: memo.uri });
      player.play();
    }
  };

  const pickLanguage = (code: string) => {
    setLanguage(code);
    AsyncStorage.setItem(LANGUAGE_KEY, code);
  };

  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  if (memo && mode === 'idle') {
    return (
      <View style={[styles.box, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <View style={styles.row}>
          <TouchableOpacity onPress={play} style={[styles.round, { backgroundColor: colors.primary }]} accessibilityLabel={playerStatus.playing ? 'Pause' : 'Play'}>
            <Ionicons name={playerStatus.playing ? 'pause' : 'play'} size={20} color={colors.primaryForeground} />
          </TouchableOpacity>
          <Text style={[typography.body1, { color: colors.foreground, flex: 1, fontWeight: '600' }]}>Voice memo · {mmss(memo.durationSeconds ?? 0)}</Text>
          <TouchableOpacity onPress={() => onChange(null)} accessibilityLabel="Delete voice memo">
            <Ionicons name="trash-outline" size={22} color={colors.destructive} />
          </TouchableOpacity>
        </View>
        <TextInput
          value={memo.transcript ?? ''}
          onChangeText={(text) => onChange({ ...memo, transcript: text })}
          placeholder="Type what you said (optional)"
          placeholderTextColor={colors.placeholder}
          multiline
          style={[styles.transcript, { color: colors.foreground, borderColor: colors.border }]}
        />
      </View>
    );
  }

  return (
    <View style={[styles.box, { borderColor: mode === 'recording' ? colors.destructive : colors.border, backgroundColor: colors.card }]}>
      <View style={styles.row}>
        <TouchableOpacity
          onPress={mode === 'recording' ? stop : start}
          style={[styles.round, { backgroundColor: mode === 'recording' ? colors.destructive : colors.primary, width: 52, height: 52, borderRadius: 26 }]}
          accessibilityLabel={mode === 'recording' ? 'Stop recording' : 'Record voice memo'}
        >
          <Ionicons name={mode === 'recording' ? 'stop' : 'mic'} size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[typography.body1, { color: colors.foreground, fontWeight: '600' }]}>
            {mode === 'recording' ? `Recording… ${mmss(seconds)}` : 'Record a voice memo'}
          </Text>
          <Text style={[typography.caption, { color: colors.mutedForeground }]}>
            {mode === 'recording' ? 'Tap to stop' : 'What did they say? What to do next?'}
          </Text>
        </View>
      </View>
      {mode === 'idle' && canTranscribe() && (
        <View style={[styles.row, { gap: 8 }]}>
          {LANGUAGES.map((l) => (
            <TouchableOpacity
              key={l.code}
              onPress={() => pickLanguage(l.code)}
              style={[styles.chip, { borderColor: language === l.code ? colors.primary : colors.border, backgroundColor: language === l.code ? colors.primary + '15' : 'transparent' }]}
            >
              <Text style={[typography.caption, { color: language === l.code ? colors.primary : colors.foreground, fontWeight: '600' }]}>{l.label}</Text>
            </TouchableOpacity>
          ))}
          <Text style={[typography.caption, { color: colors.mutedForeground, flex: 1 }]}>Written out on your phone</Text>
        </View>
      )}
      {mode === 'recording' && !!liveText && <Text style={[typography.body2, { color: colors.mutedForeground }]}>{liveText}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  round: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  transcript: { borderWidth: 1, borderRadius: 10, padding: 10, minHeight: 60, textAlignVertical: 'top' },
});
