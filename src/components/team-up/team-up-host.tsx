// components/team-up/team-up-host.tsx — mounted once inside the signed-in app. Keeps today's
// team-up fresh, asks about incoming requests wherever the rep is, and opens the split bar as
// soon as a team-up starts (whichever way it started).
import { teamUpApi } from '@/api/team-ups';
import { useAuth } from '@/context/AuthContext';
import { teamUpStore, useTeamUp } from '@/hooks/use-team-up';
import { apiErrorMessage } from '@/utils/errors';
import { useEffect, useRef } from 'react';
import { Alert, AppState } from 'react-native';
import { SplitModal } from './split-modal';

// Light check while the app is open (requests and the teammate's split); screens that need
// live updates (split bar, code waiting) poll faster on their own
const POLL_MS = 30000;

export function TeamUpHost() {
  const { running, incoming } = useTeamUp();
  const programId = useAuth().activeMembership?.program?.id;
  const seenRunning = useRef<number | null | undefined>(undefined);
  const askedAbout = useRef(new Set<number>());

  // Program switch: start over for the new program
  useEffect(() => {
    teamUpStore.reset();
    seenRunning.current = undefined;
    if (!programId) return;
    teamUpStore.refresh().catch(() => undefined);

    const timer = setInterval(() => {
      if (AppState.currentState === 'active') teamUpStore.refresh().catch(() => undefined);
    }, POLL_MS);
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') teamUpStore.refresh().catch(() => undefined);
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [programId]);

  // A team-up just started: straight to the split bar
  useEffect(() => {
    const id = running?.id ?? null;
    if (seenRunning.current !== undefined && id && id !== seenRunning.current && !running?.split.agreed) {
      teamUpStore.openSplit(id);
    }
    seenRunning.current = id;
  }, [running?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Someone asked: answer wherever the rep is (once per request)
  useEffect(() => {
    const request = incoming.find((t) => !askedAbout.current.has(t.id));
    if (!request) return;
    askedAbout.current.add(request.id);
    const name = request.partner?.name ?? 'A teammate';
    const answer = async (accept: boolean) => {
      try {
        const res = await teamUpApi.respond(request.id, accept);
        teamUpStore.apply(res.data.data);
        if (accept) teamUpStore.openSplit(request.id);
      } catch (err) {
        Alert.alert('Team up', apiErrorMessage(err, 'Could not answer the request.'));
      }
    };
    Alert.alert('Team up?', `${name} wants to team up with you today. Your check-ins and new leads count for both of you.`, [
      { text: 'Not now', style: 'cancel', onPress: () => answer(false) },
      { text: 'Team up', onPress: () => answer(true) },
    ]);
  }, [incoming]);

  return <SplitModal />;
}
