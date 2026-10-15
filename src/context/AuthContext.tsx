// src/context/AuthContext.tsx
import { authApi, programApi } from '@/api/auth';
import { ACTIVE_PROGRAM_KEY, onProgramUnavailable } from '@/api/client';
import { responseCache } from '@/offline/cache';
import { outbox } from '@/offline/outbox';
import { venueIndex } from '@/offline/venue-index';
import { removeAllContacts } from '@/utils/contact-sync';
import { Membership, User } from '@/types/models';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  // Program the MR is working in; every API call is scoped to it
  activeMembership: Membership | null;
  activeMemberships: Membership[];
  // More than one active program and none chosen yet
  needsProgramChoice: boolean;
  login: (email: string, password: string) => Promise<any>;
  register: (data: any) => Promise<any>;
  logout: () => Promise<void>;
  switchProgram: (programId: number) => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  // Re-read memberships from the server (e.g. a program was paused); keeps the session on failure
  refreshUser: () => Promise<void>;
}

/**
 * A membership the rep can work in: approved, and its program not paused by MedicineXP.
 * (Older servers don't send is_active; treat that as on.)
 */
export const isUsableMembership = (membership: Membership) =>
  membership.status === 'active' && !!membership.program && membership.program.is_active !== false;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SUSPENSIONS_SEEN_KEY = 'suspensions_seen';

/** "15 Oct 2026: bad actor" */
export const suspensionText = (membership: Membership) =>
  [
    membership.suspended_at ? new Date(membership.suspended_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null,
    membership.suspension_reason,
  ]
    .filter(Boolean)
    .join(': ');

/**
 * Suspended from a program while another still works: say so once (with the reason), and
 * where the app moved them. With nothing left to work in, the dashboard shows it instead.
 */
async function announceSuspensions(user: User, programId: number | null) {
  const memberships = user.memberships ?? [];
  const suspended = memberships.filter((m) => m.status === 'suspended' && m.program);
  if (suspended.length === 0 || !memberships.some(isUsableMembership)) return;
  const seen: string[] = JSON.parse((await AsyncStorage.getItem(SUSPENSIONS_SEEN_KEY)) || '[]');
  const fresh = suspended.filter((m) => !seen.includes(`${m.id}:${m.suspended_at}`));
  if (fresh.length === 0) return;
  await AsyncStorage.setItem(SUSPENSIONS_SEEN_KEY, JSON.stringify([...seen, ...fresh.map((m) => `${m.id}:${m.suspended_at}`)]));
  const now = memberships.find((m) => m.program?.id === programId);
  Alert.alert(
    `Suspended from ${fresh.map((m) => m.program!.name).join(', ')}`,
    [
      ...fresh.map((m) => suspensionText(m) || 'No reason given.'),
      now ? `You're now working in ${now.program!.name}.` : 'Choose the program you are working in.',
    ].join('\n\n')
  );
}

/**
 * The program to use: the server's saved choice, else the only active membership.
 */
function pickActiveProgramId(user: User): number | null {
  const active = user.memberships.filter(isUsableMembership);
  if (user.active_program_id && active.some((m) => m.program!.id === user.active_program_id)) {
    return user.active_program_id;
  }
  return active.length === 1 ? active[0].program!.id : null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [activeProgramId, setActiveProgramId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applyUser = useCallback(async (nextUser: User) => {
    const programId = pickActiveProgramId(nextUser);
    // Suspended or left every program: lead contacts don't stay on the phone (decided)
    const memberships = nextUser.memberships ?? [];
    if (
      memberships.length > 0 &&
      !memberships.some((m) => m.status === 'active') &&
      memberships.some((m) => m.status === 'suspended' || m.status === 'left')
    ) {
      removeAllContacts();
    }
    setUser(nextUser);
    setActiveProgramId(programId);
    announceSuspensions(nextUser, programId).catch(() => undefined);
    await AsyncStorage.setItem('user_data', JSON.stringify(nextUser));
    if (programId) {
      await AsyncStorage.setItem(ACTIVE_PROGRAM_KEY, String(programId));
    } else {
      await AsyncStorage.removeItem(ACTIVE_PROGRAM_KEY);
    }
  }, []);

  const clearSession = useCallback(async () => {
    await AsyncStorage.multiRemove(['auth_token', 'user_data', ACTIVE_PROGRAM_KEY, 'push_token_sent']);
    setUser(null);
    setActiveProgramId(null);
  }, []);

  const checkAuthStatus = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        const response = await authApi.me();
        await applyUser(response.data.data);
      }
    } catch (error: any) {
      // Offline: keep the cached user so the MR can keep working
      const cached = await AsyncStorage.getItem('user_data');
      if (!error.status && cached) {
        await applyUser(JSON.parse(cached));
      } else {
        await clearSession();
        router.replace('/auth/login');
      }
    } finally {
      setIsLoading(false);
    }
  }, [applyUser, clearSession, router]);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const login = async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    await AsyncStorage.setItem('auth_token', response.data.data.token);
    await applyUser(response.data.data.user);
    return response.data;
  };

  const register = async (data: any) => {
    const response = await authApi.register(data);
    return response.data;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error: any) {
      Alert.alert('Logout error', error.message || 'Something happened');
    } finally {
      // Only on a deliberate logout: the next person on this phone must not see this
      // MR's data. (An expired session keeps unsent offline work for after re-login.)
      await Promise.all([responseCache.clear(), venueIndex.clear(), outbox.clear()]).catch(() => undefined);
      await clearSession();
      router.replace('/auth/login');
    }
  };

  const switchProgram = async (programId: number) => {
    await programApi.switchTo(programId);
    await AsyncStorage.setItem(ACTIVE_PROGRAM_KEY, String(programId));
    setActiveProgramId(programId);
    if (user) {
      const nextUser = { ...user, active_program_id: programId };
      setUser(nextUser);
      await AsyncStorage.setItem('user_data', JSON.stringify(nextUser));
    }
  };

  const activeMemberships = useMemo(
    () => (user?.memberships ?? []).filter(isUsableMembership),
    [user]
  );

  const refreshUser = useCallback(async () => {
    try {
      const response = await authApi.me();
      await applyUser(response.data.data);
    } catch {
      // Offline or a hiccup: keep what we have
    }
  }, [applyUser]);
  const activeMembership = activeMemberships.find((m) => m.program!.id === activeProgramId) ?? null;

  // The server refused the program in use (e.g. suspended just now): re-read the profile so the
  // app moves to another program or shows why. At most every 10 s, however many calls failed.
  const lastRefresh = useRef(0);
  useEffect(
    () =>
      onProgramUnavailable(() => {
        if (Date.now() - lastRefresh.current < 10000) return;
        lastRefresh.current = Date.now();
        refreshUser();
      }),
    [refreshUser]
  );

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    activeMembership,
    activeMemberships,
    needsProgramChoice: !!user && !activeMembership && activeMemberships.length > 1,
    login,
    register,
    logout,
    switchProgram,
    checkAuthStatus,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
