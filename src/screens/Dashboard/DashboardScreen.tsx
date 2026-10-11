// src/screens/Dashboard/DashboardScreen.tsx
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';

export function DashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await api.dashboard.get();
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.name}</Text>
          </View>
          <View style={styles.tierBadge}>
            <Text style={styles.tierBadgeText}>
              {dashboardData?.tier?.name || 'No Tier'}
            </Text>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statsCard}>
            <Text style={styles.statsLabel}>Total Commission</Text>
            <Text style={styles.statsValue}>
              ${dashboardData?.metrics?.total_commission_earned || 0}
            </Text>
          </View>
          <View style={styles.statsCard}>
            <Text style={styles.statsLabel}>This Month</Text>
            <Text style={styles.statsValue}>
              ${dashboardData?.metrics?.month_commission || 0}
            </Text>
          </View>
        </View>
      </View>

      {/* Metrics Grid */}
      <View style={styles.metricsContainer}>
        <View style={styles.metricsRow}>
          <MetricCard
            title="Total Sales"
            value={dashboardData?.metrics?.total_sales || 0}
            icon="📊"
            color="blue"
          />
          <MetricCard
            title="Total Leads"
            value={dashboardData?.metrics?.total_leads || 0}
            icon="👥"
            color="purple"
          />
        </View>
        <View style={styles.metricsRow}>
          <MetricCard
            title="Conversion Rate"
            value={`${dashboardData?.metrics?.conversion_rate || 0}%`}
            icon="🎯"
            color="green"
          />
          <MetricCard
            title="Visits"
            value={dashboardData?.metrics?.total_visits || 0}
            icon="📍"
            color="orange"
          />
        </View>

        {/* Progress to next tier */}
        {dashboardData?.progress && (
          <View style={styles.progressCard}>
            <Text style={styles.progressTitle}>
              Progress to {dashboardData.progress.next_tier}
            </Text>
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBarFill,
                  { width: `${dashboardData.progress.progress}%` }
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {dashboardData.progress.progress}% Complete
            </Text>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <QuickAction
            title="Check In"
            icon="📍"
            color="blue"
            onPress={() => navigation.navigate('CheckIn')}
          />
          <QuickAction
            title="New Lead"
            icon="👤"
            color="green"
            onPress={() => navigation.navigate('CreateLead')}
          />
          <QuickAction
            title="Distribute"
            icon="📦"
            color="purple"
            onPress={() => navigation.navigate('Distributions')}
          />
          <QuickAction
            title="My Coupons"
            icon="🎫"
            color="orange"
            onPress={() => navigation.navigate('Coupons')}
          />
        </View>

        {/* Recent Activity */}
        {dashboardData?.recent_activity?.length > 0 && (
          <View style={styles.activityCard}>
            <Text style={styles.activityTitle}>Recent Activity</Text>
            {dashboardData.recent_activity.map((activity: any, index: number) => (
              <View key={index} style={[
                styles.activityItem,
                index === dashboardData.recent_activity.length - 1 && styles.activityItemLast
              ]}>
                <Text style={styles.activityText}>{activity.description}</Text>
                <Text style={styles.activityDate}>
                  {new Date(activity.date).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// Helper Components
function MetricCard({ title, value, icon, color }: any) {
  const getColorStyle = () => {
    switch (color) {
      case 'blue': return styles.metricCardBlue;
      case 'purple': return styles.metricCardPurple;
      case 'green': return styles.metricCardGreen;
      case 'orange': return styles.metricCardOrange;
      default: return styles.metricCardBlue;
    }
  };

  return (
    <View style={styles.metricCardWrapper}>
      <View style={[styles.metricCard, getColorStyle()]}>
        <Text style={styles.metricIcon}>{icon}</Text>
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={styles.metricLabel}>{title}</Text>
      </View>
    </View>
  );
}

function QuickAction({ title, icon, color, onPress }: any) {
  const getColorStyle = () => {
    switch (color) {
      case 'blue': return styles.quickActionBlue;
      case 'green': return styles.quickActionGreen;
      case 'purple': return styles.quickActionPurple;
      case 'orange': return styles.quickActionOrange;
      default: return styles.quickActionBlue;
    }
  };

  return (
    <TouchableOpacity style={styles.quickActionWrapper} onPress={onPress}>
      <View style={[styles.quickAction, getColorStyle()]}>
        <Text style={styles.quickActionIcon}>{icon}</Text>
        <Text style={styles.quickActionTitle}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#2563EB',
    padding: 20,
    paddingTop: 40,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  userName: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  tierBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tierBadgeText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  statsCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
  },
  statsLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  statsValue: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  metricsContainer: {
    padding: 16,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  metricCardWrapper: {
    flex: 1,
  },
  metricCard: {
    borderRadius: 12,
    padding: 16,
  },
  metricCardBlue: {
    backgroundColor: '#EFF6FF',
  },
  metricCardPurple: {
    backgroundColor: '#F5F3FF',
  },
  metricCardGreen: {
    backgroundColor: '#ECFDF5',
  },
  metricCardOrange: {
    backgroundColor: '#FFF7ED',
  },
  metricIcon: {
    fontSize: 24,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4,
    color: '#1F2937',
  },
  metricLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  progressCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 4,
  },
  progressText: {
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 14,
    marginTop: 8,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  quickActionWrapper: {
    width: '25%',
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  quickAction: {
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  quickActionBlue: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  quickActionGreen: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  quickActionPurple: {
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
  },
  quickActionOrange: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
  },
  quickActionIcon: {
    fontSize: 24,
  },
  quickActionTitle: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
  activityCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  activityItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  activityItemLast: {
    borderBottomWidth: 0,
  },
  activityText: {
    color: '#374151',
    fontSize: 14,
  },
  activityDate: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 4,
  },
});