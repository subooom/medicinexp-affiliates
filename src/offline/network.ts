// src/offline/network.ts — is the phone online? (NetInfo, with a manual override for tests)
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

type Listener = (online: boolean) => void;

let online = true;
const listeners = new Set<Listener>();

const isOnlineState = (state: NetInfoState) =>
  // isInternetReachable is null while unknown: treat that as online and let requests decide
  !!state.isConnected && state.isInternetReachable !== false;

NetInfo.addEventListener((state) => {
  const next = isOnlineState(state);
  if (next !== online) {
    online = next;
    listeners.forEach((listener) => listener(online));
  }
});

export const network = {
  isOnline: () => online,
  async refresh(): Promise<boolean> {
    online = isOnlineState(await NetInfo.fetch());
    return online;
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

/** A request that never reached the server (offline, timeout, DNS), as opposed to an HTTP error. */
export const isNetworkError = (error: any) => !error?.status;
