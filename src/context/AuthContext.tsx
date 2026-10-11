// src/context/AuthContext.tsx
import { authApi, programApi } from '@/api/auth';
import { ACTIVE_PROGRAM_KEY } from '@/api/client';
import { Membership, User } from '@/types/models';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * The program to use: the server's saved choice, else the only active membership.
 */
function pickActiveProgramId(user: User): number | null {
  const active = user.memberships.filter((m) => m.status === 'active' && m.program);
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
    setUser(nextUser);
    setActiveProgramId(programId);
    await AsyncStorage.setItem('user_data', JSON.stringify(nextUser));
    if (programId) {
      await AsyncStorage.setItem(ACTIVE_PROGRAM_KEY, String(programId));
    } else {
      await AsyncStorage.removeItem(ACTIVE_PROGRAM_KEY);
    }
  }, []);

  const clearSession = useCallback(async () => {
    await AsyncStorage.multiRemove(['auth_token', 'user_data', ACTIVE_PROGRAM_KEY]);
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
    () => (user?.memberships ?? []).filter((m) => m.status === 'active' && m.program),
    [user]
  );
  const activeMembership = activeMemberships.find((m) => m.program!.id === activeProgramId) ?? null;

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
