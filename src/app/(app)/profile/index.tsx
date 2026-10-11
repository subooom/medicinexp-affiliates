// app/(app)/profile/index.tsx
import { AppColors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Logout', style: 'destructive', onPress: logout },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleOpenOnboarding = () => {
    router.push('/onboarding?returnTo=/(app)/profile');
  };

  useEffect(() => {
    if (!user?.id) {
      router.push('/auth/login');
    }
  }, [user]);

  const menuItems = [
    {
      icon: 'person-outline' as const,
      label: 'My Profile',
      onPress: () => {},
    },
    {
      icon: 'trophy-outline' as const,
      label: 'Tiers & Rewards',
      onPress: () => router.push('/(app)/tiers'),
      badge: user?.tier?.tier_name || 'New',
    },
    {
      icon: 'business-outline' as const,
      label: 'My Organizations',
      onPress: () => router.push('/(app)/organizations'),
      badge: 'View',
    },
    {
      icon: 'calendar-outline' as const,
      label: 'My Meetups',
      onPress: () => router.push('/(app)/meetups'),
      badge: 'Schedule',
    },
    {
      icon: 'cube-outline' as const,
      label: 'My Inventory',
      onPress: () => router.push('/(app)/inventory'),
      badge: 'Stock',
    },
    {
      icon: 'grid-outline' as const, // or 'apps-outline'
      label: 'Distributions',
      onPress: () => router.push('/(app)/distributions'),
      badge: 'Active',
    },
    {
      icon: 'pricetag-outline' as const, // or 'ticket-outline'
      label: 'Coupons',
      onPress: () => router.push('/(app)/coupons'),
      badge: 'Offers',
    },
    {
      icon: 'call-outline' as const,
      label: 'Call Logs',
      onPress: () => router.push('/(app)/call-logs'),
      badge: 'History',
    },
    {
      icon: 'school-outline' as const,
      label: 'How It Works',
      onPress: handleOpenOnboarding,
      badge: 'Guide',
    },
    {
      icon: 'settings-outline' as const,
      label: 'Settings',
      onPress: () => {},
    },
    {
      icon: 'help-circle-outline' as const,
      label: 'Help & Support',
      onPress: () => {},
    },
    {
      icon: 'information-circle-outline' as const,
      label: 'About',
      onPress: () => {},
    },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={[typography.h3, styles.avatarText]}>
              {user?.name?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
          {user?.tier && (
            <View style={styles.tierBadge}>
              <Text style={[typography.caption, styles.tierText]}>
                {user.tier.tier_name}
              </Text>
            </View>
          )}
        </View>
        <Text style={[typography.h5, styles.userName]}>{user?.name || 'User'}</Text>
        <Text style={[typography.body2, styles.userEmail]}>{user?.email}</Text>
        {user?.contact && (
          <Text style={[typography.body2, styles.userContact]}>{user.contact}</Text>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={[typography.h6, styles.statValue]}>0</Text>
          <Text style={[typography.caption, styles.statLabel]}>Total Sales</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[typography.h6, styles.statValue]}>$0</Text>
          <Text style={[typography.caption, styles.statLabel]}>Total Earned</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[typography.h6, styles.statValue]}>0</Text>
          <Text style={[typography.caption, styles.statLabel]}>Leads</Text>
        </View>
      </View>

      {/* Menu */}
      <View style={styles.menuContainer}>
        {menuItems.map((item, index, arr) => (
          <TouchableOpacity
            key={item.label}
            style={[
              styles.menuItem,
              index === arr.length - 1 && styles.menuItemLast,
            ]}
            onPress={item.onPress}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons 
                name={item.icon} 
                size={22} 
                color={
                  item.icon === 'trophy-outline' ? colors.primary : 
                  item.icon === 'calendar-outline' ? colors.success :
                  item.icon === 'cube-outline' ? colors.accent :
                  colors.mutedForeground
                } 
              />
              <Text style={[typography.body1, styles.menuItemLabel]}>
                {item.label}
              </Text>
            </View>
            <View style={styles.menuItemRight}>
              {item.badge && (
                <View style={[
                  styles.badge,
                  item.label === 'Tiers & Rewards' && { backgroundColor: colors.primary + '15' },
                  item.label === 'My Meetups' && { backgroundColor: colors.success + '15' },
                  item.label === 'My Inventory' && { backgroundColor: colors.accent + '15' },
                  item.badge === 'New' && { backgroundColor: colors.warning + '15' },
                ]}>
                  <Text style={[
                    typography.caption, 
                    styles.badgeText,
                    item.label === 'Tiers & Rewards' && { color: colors.primary },
                    item.label === 'My Meetups' && { color: colors.success },
                    item.label === 'My Inventory' && { color: colors.accent },
                    item.badge === 'New' && { color: colors.warning },
                  ]}>
                    {item.badge}
                  </Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={20} color={colors.border} />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={22} color={colors.destructive} />
        <Text style={[typography.body1, styles.logoutText]}>Logout</Text>
      </TouchableOpacity>

      <Text style={[typography.caption, styles.versionText]}>Version 1.0.0</Text>
    </ScrollView>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      backgroundColor: colors.card,
      alignItems: 'center',
      paddingVertical: 30,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    avatarContainer: {
      position: 'relative',
      marginBottom: 12,
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      color: colors.primaryForeground,
    },
    tierBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      backgroundColor: colors.warning,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    tierText: {
      color: '#FFFFFF',
      fontWeight: '600',
    },
    userName: {
      color: colors.foreground,
    },
    userEmail: {
      color: colors.mutedForeground,
      marginTop: 2,
    },
    userContact: {
      color: colors.mutedForeground,
      marginTop: 2,
    },
    statsContainer: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      paddingVertical: 16,
      marginHorizontal: 16,
      marginTop: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
    },
    statValue: {
      color: colors.foreground,
    },
    statLabel: {
      color: colors.mutedForeground,
      marginTop: 2,
    },
    statDivider: {
      width: 1,
      backgroundColor: colors.border,
    },
    menuContainer: {
      backgroundColor: colors.card,
      marginHorizontal: 16,
      marginTop: 16,
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    menuItemLast: {
      borderBottomWidth: 0,
    },
    menuItemLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    menuItemLabel: {
      color: colors.foreground,
    },
    menuItemRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    badge: {
      backgroundColor: colors.primary + '15',
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 12,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: '600',
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
      marginHorizontal: 16,
      marginTop: 16,
      paddingVertical: 14,
      borderRadius: 12,
      gap: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    logoutText: {
      color: colors.destructive,
      fontWeight: '600',
    },
    versionText: {
      textAlign: 'center',
      color: colors.icon,
      marginTop: 20,
      marginBottom: 30,
    },
  });