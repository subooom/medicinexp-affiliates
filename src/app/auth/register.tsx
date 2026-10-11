// app/auth/register.tsx
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
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contact: '',
    password: '',
    password_confirmation: '',
  });

  const handleRegister = async () => {
    const { name, email, contact, password, password_confirmation } = formData;

    if (!name || !email || !contact || !password || !password_confirmation) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    if (password !== password_confirmation) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await register(formData);
      Alert.alert(
        'Registration Successful 🎉',
        'Your account has been created. Please wait for admin approval.',
        [{ text: 'OK', onPress: () => router.replace('/auth/login') }]
      );
    } catch (error: any) {
      console.log({error})
      Alert.alert('Registration Failed', error.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen keyboard scroll contentContainerStyle={styles.scrollContainer}>

        <View style={styles.logoContainer}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <Logo size="medium" />
        </View>

      <Text style={[typography.h2, styles.title]}>Create Account</Text>
      <Text style={[typography.body1, styles.subtitle]}>Join as an affiliate to start earning.</Text>

      <View style={styles.form}>
        {(['name', 'email', 'contact'] as const).map((field) => (
          <View key={field} style={styles.inputGroup}>
            <Text style={[typography.body2, styles.label]}>
              {field === 'name' ? 'Full Name' : field === 'email' ? 'Email' : 'Contact'}
            </Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name={field === 'name' ? 'person-outline' : field === 'email' ? 'mail-outline' : 'call-outline'}
                size={20}
                color={colors.icon}
                style={styles.inputIcon}
              />
              <TextInput
                style={[typography.body1, styles.input]}
                value={formData[field]}
                onChangeText={(text) => setFormData({ ...formData, [field]: text })}
                placeholder={
                  field === 'name'
                    ? 'Enter your full name'
                    : field === 'email'
                      ? 'Enter your email'
                      : 'Enter your phone number'
                }
                placeholderTextColor={colors.placeholder}
                autoCapitalize={field === 'email' ? 'none' : 'words'}
                keyboardType={field === 'email' ? 'email-address' : field === 'contact' ? 'phone-pad' : 'default'}
                editable={!loading}
              />
            </View>
          </View>
        ))}

        {(['password', 'password_confirmation'] as const).map((field) => (
          <View key={field} style={styles.inputGroup}>
            <Text style={[typography.body2, styles.label]}>
              {field === 'password' ? 'Password' : 'Confirm Password'}
            </Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.icon} style={styles.inputIcon} />
              <TextInput
                style={[typography.body1, styles.input, styles.passwordInput]}
                value={formData[field]}
                onChangeText={(text) => setFormData({ ...formData, [field]: text })}
                placeholder={
                  field === 'password' ? 'Create a password' : 'Confirm your password'
                }
                placeholderTextColor={colors.placeholder}
                secureTextEntry={field === 'password' ? !showPassword : !showConfirmPassword}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() =>
                  field === 'password' ? setShowPassword(!showPassword) : setShowConfirmPassword(!showConfirmPassword)
                }
              >
                <Ionicons
                  name={
                    (field === 'password' ? showPassword : showConfirmPassword)
                      ? 'eye-off-outline'
                      : 'eye-outline'
                  }
                  size={20}
                  color={colors.icon}
                />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={styles.termsContainer}>
          <Text style={[typography.body3, styles.termsText]}>By creating an account, you agree to our</Text>
          <TouchableOpacity>
            <Text style={[typography.body3, styles.termsLink]}> Terms of Service</Text>
          </TouchableOpacity>
          <Text style={[typography.body3, styles.termsText]}> and </Text>
          <TouchableOpacity>
            <Text style={[typography.body3, styles.termsLink]}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.registerButton, loading && styles.disabledButton]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={[typography.button, styles.registerButtonText]}>Create Account</Text>
          )}
        </TouchableOpacity>

        <View style={styles.loginContainer}>
          <Text style={[typography.body2, styles.loginText]}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/auth/login')}>
            <Text style={[typography.body2, styles.loginLink]}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Screen>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    scrollContainer: {
      flexGrow: 1,
      padding: 24,
    },
    logoContainer: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 16,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.card,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,

    },
    title: {
      color: colors.foreground,
    },
    subtitle: {
      color: colors.mutedForeground,
      marginTop: 4,
      marginBottom: 24,
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
    registerButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 16,
      marginTop: 8,
    },
    disabledButton: {
      backgroundColor: colors.icon,
    },
    registerButtonText: {
      color: colors.primaryForeground,
      textAlign: 'center',
    },
    termsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      marginTop: 4,
    },
    termsText: {
      color: colors.mutedForeground,
    },
    termsLink: {
      color: colors.primary,
      fontWeight: '600',
    },
    loginContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 8,
      marginBottom: 16,
    },
    loginText: {
      color: colors.mutedForeground,
    },
    loginLink: {
      color: colors.primary,
      fontWeight: '600',
    },
  });
