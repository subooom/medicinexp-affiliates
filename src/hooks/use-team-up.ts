// src/hooks/use-team-up.ts — today's team-up, shared by the banner, the team-up screen and
// the split modal, so they never disagree about who you're working with.
import { TeamUp, teamUpApi } from '@/api/team-ups';
import { useSyncExternalStore } from 'react';

interface TeamUpState {
  running: TeamUp | null;
  incoming: TeamUp[];
  outgoing: TeamUp | null;
  loaded: boolean;
  // The split modal is open for this team-up id
  splitOpenFor: number | null;
}

let state: TeamUpState = { running: null, incoming: [], outgoing: null, loaded: false, splitOpenFor: null };
let etag: string | undefined;
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function set(next: Partial<TeamUpState>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

export const teamUpStore = {
  get: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /** Ask the server what changed (cheap: "no change" most of the time). */
  refresh(): Promise<void> {
    if (inFlight) return inFlight;
    inFlight = (async () => {
      try {
        const data = (await teamUpApi.current(etag)).data.data;
        etag = data.etag;
        if (data.changed) {
          set({ running: data.running, incoming: data.incoming, outgoing: data.outgoing, loaded: true });
        }
      } finally {
        inFlight = null;
      }
    })();
    return inFlight;
  },

  /** A response from an action (join, accept, split...): show it now, then re-check. */
  apply(teamUp: TeamUp) {
    if (teamUp.status === 'active') {
      set({ running: teamUp, outgoing: null, incoming: state.incoming.filter((t) => t.id !== teamUp.id) });
    } else if (teamUp.status === 'pending') {
      set({ outgoing: teamUp });
    } else {
      set({
        running: state.running?.id === teamUp.id ? null : state.running,
        outgoing: state.outgoing?.id === teamUp.id ? null : state.outgoing,
        incoming: state.incoming.filter((t) => t.id !== teamUp.id),
      });
    }
    etag = undefined;
  },

  openSplit: (teamUpId: number) => set({ splitOpenFor: teamUpId }),
  closeSplit: () => set({ splitOpenFor: null }),

  /** Signing out or switching program: forget it all. */
  reset() {
    etag = undefined;
    set({ running: null, incoming: [], outgoing: null, loaded: false, splitOpenFor: null });
  },
};

export function useTeamUp(): TeamUpState {
  return useSyncExternalStore(teamUpStore.subscribe, teamUpStore.get, teamUpStore.get);
}

/** "60%" from basis points. */
export const sharePercent = (bp: number | null | undefined) => `${Math.round((bp ?? 0) / 100)}%`;
