// src/context/AuthContext.tsx
import { authApi } from '@/api/auth';
import { User } from '@/types/models';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<any>;
  register: (data: any) => Promise<any>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        const response = await authApi.me();
        // Access response.data since API returns full response
        if (response.data.success) {
          setUser(response.data.data);
        } else {
          await AsyncStorage.removeItem('auth_token');
          router.push('/auth/login')
        }
      }
    } catch (error: any) {
      Alert.alert('Auth check error:', error.response?.data.message || error.message);
      await AsyncStorage.removeItem('auth_token');
        router.push('/auth/login')
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login({ email, password });
      
      // Access response.data
      if (response.data.success) {
        await AsyncStorage.setItem('auth_token', response.data.data.token);
        await AsyncStorage.setItem('user_data', JSON.stringify(response.data.data.user));
        
        setTimeout(checkAuthStatus, 500);
         
        setUser(response.data.data.user);
        return response.data;
      }
      
      throw new Error(response.data.message || 'Login failed');
    } catch (error) {
      throw error;
    }
  };

  const register = async (data: any) => {
    try {
      const response = await authApi.register(data);
      // Access response.data
      if (response.data.success) {
        return response.data;
      }
      
      throw new Error(response.data.message || 'Registration failed');
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error:any) {
      Alert.alert('Logout error:', error.response?.data?.message || error.message || 'Something Happened');
    } finally {
      await AsyncStorage.multiRemove(['auth_token', 'user_data']);
      setUser(null);
      router.push('/auth/login')
    }
  };

  const updateUser = async (updatedUser: User) => {
    setUser(updatedUser);
    await AsyncStorage.setItem('user_data', JSON.stringify(updatedUser));
  };

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateUser,
    checkAuthStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}