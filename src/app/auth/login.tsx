// app/auth/login.tsx
import { HintButton } from '@/components/common/hint-button';
import { Logo } from '@/components/common/logo';
import { Screen } from '@/components/common/screen';
import { AppColors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { colors, colorScheme } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      router.replace('/(app)');
    } catch (error: any) {
      Alert.alert('Login Failed', error.response?.data?.message || error.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen keyboard scroll contentContainerStyle={styles.scrollContainer}>
      <View style={styles.logoContainer}>
        <Logo size="large" />
      </View>

      <Text style={[typography.h2, styles.welcomeText]}>Welcome Back</Text>
      <Text style={[typography.body1, styles.subtitle]}>Sign in to your account</Text>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={[typography.body2, styles.label]}>Email</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color={colors.icon} style={styles.inputIcon} />
            <TextInput
              style={[typography.body1, styles.input]}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor={colors.placeholder}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={[typography.body2, styles.label]}>Password</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.icon} style={styles.inputIcon} />
            <TextInput
              style={[typography.body1, styles.input, styles.passwordInput]}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor={colors.placeholder}
              secureTextEntry={!showPassword}
              editable={!loading}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.icon}
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.forgotPassword}>
          <Text style={[typography.body2, styles.forgotPasswordText]}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.loginButton, loading && styles.disabledButton]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={[typography.button, styles.loginButtonText]}>Sign In</Text>
          )}
        </TouchableOpacity>

        <View style={styles.registerContainer}>
          <Text style={[typography.body2, styles.registerText]}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/auth/register')}>
            <Text style={[typography.body2, styles.registerLink]}>Sign Up</Text>
          </TouchableOpacity>
          {/* Hint Button */}
          <View style={styles.hintContainer}>
            <HintButton variant={colorScheme === 'dark' ? 'dark' : 'light'} />
          </View>
        </View>
      </View>
    </Screen>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    scrollContainer: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: 24,
      paddingVertical: 20,
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: 12,
    },
    welcomeText: {
      textAlign: 'center',
      color: colors.foreground,
    },
    subtitle: {
      textAlign: 'center',
      color: colors.mutedForeground,
      marginTop: 4,
      marginBottom: 32,
    },
    form: {
      gap: 16,
    },
    inputGroup: {
      marginBottom: 4,
    },
    label: {
      color: colors.foreground,
      marginBottom: 6,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBackground,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    inputIcon: {
      paddingLeft: 14,
    },
    input: {
      flex: 1,
      paddingVertical: 14,
      paddingHorizontal: 10,
      color: colors.foreground,
    },
    passwordInput: {
      paddingRight: 44,
    },
    eyeButton: {
      position: 'absolute',
      right: 12,
      padding: 8,
    },
    forgotPassword: {
      alignSelf: 'flex-end',
      marginTop: -8,
    },
    forgotPasswordText: {
      color: colors.primary,
    },
    loginButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 16,
      marginTop: 8,
    },
    disabledButton: {
      backgroundColor: colors.icon,
    },
    loginButtonText: {
      color: colors.primaryForeground,
      textAlign: 'center',
    },
    registerContainer: {
      flexDirection: 'column',
      alignItems: 'center',
      marginTop: 8,
      marginBottom:-12,
    },
    registerText: {
      color: colors.mutedForeground,
    },
    registerLink: {
      color: colors.primary,
      fontWeight: '600',
    },
    hintContainer: {
      marginTop: 0,
      alignItems: 'center',
    },
  });
