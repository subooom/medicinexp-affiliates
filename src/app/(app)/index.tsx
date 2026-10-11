// app/(app)/index.tsx (Dashboard) - Clean Professional Edition
import { api } from '@/api';
import { Logo } from '@/components/common/logo';
import { SyncStatusIndicator } from '@/components/common/sync-status';
import { AppColors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

// Types based on your API response
interface DashboardData {
  mr: {
    id: number;
    name: string;
    email: string;
  };
  tier: { name: string } | null;
  metrics: {
    total_visits?: number;
    total_leads?: number;
    total_sales?: number;
    total_commission_earned?: string;
    month_commission?: string;
    conversion_rate?: string;
  } | null;
  summary: {
    leads: number;
    converted: number;
    conversion_rate: number;
    pending_commission: string;
    total_commission: string;
  };
  recent_activity: {
    visits: Array<{ id: number; organization: string; date: string; status: string }>;
    leads: Array<{ id: number; customer_name: string; created_at: string; status: string }>;
  };
  progress: {
    next_tier?: string;
    progress?: number;
    requirements?: {
      sales?: { current: number; required: number; met: boolean };
      revenue?: { current: number; required: number; met: boolean };
      conversions?: { current: number; required: number; met: boolean };
      visits?: { current: number; required: number; met: boolean };
      distributions?: { current: number; required: number; met: boolean };
    };
    all_met?: boolean;
  } | null;
}

// Tier metadata from commission_tiers
interface TierMetadata {
  badge: string;
  color: string;
  currency: string;
  plan: string;
  pricing: {
    first_year: number;
    monthly_after: number;
  };
  benefits: string[];
  requirements: string[];
}

// Professional motivational messages
const motivationalFootnotes = [
  "Every visit you log helps build a smarter healthcare network.",
  "Your data contributes to better inventory management for clinics.",
  "Tracking distributions helps pharmacies reduce expired stock.",
  "Your leads help connect more healthcare organizations with medicinexp.",
  "Each visit logged helps optimize medical supply chains.",
  "Your activity helps us identify which materials are most useful.",
  "Tracking visits helps us understand healthcare access patterns.",
  "Your feedback on materials helps us improve what we offer.",
  "Every lead you generate strengthens the healthcare ecosystem.",
  "Your sales data helps us identify what products are most needed.",
  "Consistent logging helps us spot trends in healthcare demand.",
  "Your activity contributes to better healthcare delivery overall.",
  "Tracking sales helps us understand what patients need most.",
  "Your visits help build a more connected healthcare community.",
  "Every interaction adds to our understanding of healthcare needs.",
  "Your data helps us improve healthcare logistics.",
  "Tracking materials helps us optimize inventory for everyone.",
  "Your leads help expand access to quality healthcare products.",
  "Your sales help us understand which solutions work best.",
  "Your participation makes the healthcare system more efficient.",
];

const getRandomFootnote = () => {
  return motivationalFootnotes[Math.floor(Math.random() * motivationalFootnotes.length)];
};

// Bronze tier metadata
const BRONZE_TIER_METADATA: TierMetadata = {
  badge: "🥉",
  color: "#CD7F32",
  currency: "NPR",
  plan: "Basic",
  pricing: {
    first_year: 5000,
    monthly_after: 888,
  },
  benefits: [
    "1 active coupon",
    "5% commission rate",
    "Access to basic features",
    "Monthly performance report",
  ],
  requirements: [
    "1-5 sales",
    "रू 5,000-10,000 revenue",
    "1+ conversions",
    "3+ visits",
    "5+ distributions",
  ],
};

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  
  // Modal states
  const [visitsModalVisible, setVisitsModalVisible] = useState(false);
  const [leadsModalVisible, setLeadsModalVisible] = useState(false);
  const [salesModalVisible, setSalesModalVisible] = useState(false);
  const [distributionsModalVisible, setDistributionsModalVisible] = useState(false);
  const [conversionsModalVisible, setConversionsModalVisible] = useState(false);
  const [benefitsModalVisible, setBenefitsModalVisible] = useState(false);
  const [modalFootnote, setModalFootnote] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await api.dashboard.get();
      setDashboardData(response.data.data);
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

  const openModal = (modalSetter: (value: boolean) => void) => {
    setModalFootnote(getRandomFootnote());
    modalSetter(true);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Safe data extraction
  const hasTier = dashboardData?.tier?.name ?? null;
  const totalVisits = dashboardData?.recent_activity?.visits?.length || 0;
  const totalLeads = dashboardData?.summary?.leads || 0;
  const totalSales = dashboardData?.summary?.converted || 0;
  const totalCommission = parseFloat(dashboardData?.summary?.total_commission || '0');
  const conversionRate = dashboardData?.summary?.conversion_rate || 0;
  const pendingCommission = parseFloat(dashboardData?.summary?.pending_commission || '0');

  const hasAnyActivity = totalVisits > 0 || totalLeads > 0 || totalSales > 0;
  const isActive = totalVisits >= 3 || totalLeads >= 1 || totalSales >= 1;

  // Get requirements
  const getNextTierRequirements = () => {
    const progress = dashboardData?.progress;
    if (!progress || !progress.requirements) return null;
    
    const requirements = progress.requirements;
    const items = [];
    
    if (requirements.sales) {
      items.push({
        label: 'Sales',
        current: requirements.sales.current,
        required: requirements.sales.required,
        met: requirements.sales.met,
        icon: 'trending-up-outline',
      });
    }
    if (requirements.revenue) {
      items.push({
        label: 'Revenue',
        current: `रू ${requirements.revenue.current.toLocaleString()}`,
        required: `रू ${requirements.revenue.required.toLocaleString()}`,
        met: requirements.revenue.met,
        icon: 'cash-outline',
      });
    }
    if (requirements.conversions) {
      items.push({
        label: 'Conversions',
        current: requirements.conversions.current,
        required: requirements.conversions.required,
        met: requirements.conversions.met,
        icon: 'repeat-outline',
      });
    }
    if (requirements.visits) {
      items.push({
        label: 'Visits',
        current: requirements.visits.current,
        required: requirements.visits.required,
        met: requirements.visits.met,
        icon: 'location-outline',
      });
    }
    if (requirements.distributions) {
      items.push({
        label: 'Distributions',
        current: requirements.distributions.current,
        required: requirements.distributions.required,
        met: requirements.distributions.met,
        icon: 'cube-outline',
      });
    }
    
    return items;
  };

  const nextTierRequirements = getNextTierRequirements();
  const nextTierName = dashboardData?.progress?.next_tier || null;
  const progressPercent = dashboardData?.progress?.progress || 0;

  const recentVisits = dashboardData?.recent_activity?.visits || [];
  const hasRecentActivity = recentVisits.length > 0 || totalLeads > 0;

  // First tier requirements
  const getFirstTierRequirements = () => {
    if (hasTier) {
      const reqs = dashboardData?.progress?.requirements;
      if (!reqs) return null;
      
      return {
        visits: { 
          current: reqs.visits?.current || 0, 
          required: reqs.visits?.required || 0, 
          met: reqs.visits?.met || false, 
          label: 'Visits', 
          icon: 'location-outline',
          data: recentVisits.slice(0, 5)
        },
        leads: { 
          current: reqs.sales?.current || 0, 
          required: reqs.sales?.required || 0, 
          met: reqs.sales?.met || false, 
          label: 'Sales', 
          icon: 'trending-up-outline',
          data: []
        },
        sales: { 
          current: reqs.revenue?.current || 0, 
          required: reqs.revenue?.required || 0, 
          met: reqs.revenue?.met || false, 
          label: 'Revenue', 
          icon: 'cash-outline',
          data: []
        },
        conversions: { 
          current: reqs.conversions?.current || 0, 
          required: reqs.conversions?.required || 0, 
          met: reqs.conversions?.met || false, 
          label: 'Conversions', 
          icon: 'repeat-outline',
          data: dashboardData?.recent_activity?.leads?.filter((l: any) => l.status === 'converted').slice(0, 5) || []
        },
        distributions: { 
          current: reqs.distributions?.current || 0, 
          required: reqs.distributions?.required || 0, 
          met: reqs.distributions?.met || false, 
          label: 'Distributions', 
          icon: 'cube-outline',
          data: []
        },
      };
    }
    
    return {
      visits: { 
        current: Math.min(totalVisits, 3), 
        required: 3, 
        met: totalVisits >= 3, 
        label: 'Visits', 
        icon: 'location-outline',
        data: recentVisits.slice(0, 5)
      },
      leads: { 
        current: Math.min(totalLeads, 1), 
        required: 1, 
        met: totalLeads >= 1, 
        label: 'Leads', 
        icon: 'people-outline',
        data: dashboardData?.recent_activity?.leads?.slice(0, 5) || []
      },
      sales: { 
        current: Math.min(totalSales, 1), 
        required: 1, 
        met: totalSales >= 1, 
        label: 'Sales', 
        icon: 'trending-up-outline',
        data: []
      },
      conversions: { 
        current: Math.min(totalSales, 1), 
        required: 1, 
        met: totalSales >= 1, 
        label: 'Conversions', 
        icon: 'repeat-outline',
        data: dashboardData?.recent_activity?.leads?.filter((l: any) => l.status === 'converted').slice(0, 5) || []
      },
      distributions: { 
        current: 0, 
        required: 5, 
        met: false, 
        label: 'Distributions', 
        icon: 'cube-outline',
        data: []
      },
    };
  };

  const firstTierReqs = getFirstTierRequirements();
  
  const defaultReqs = {
    visits: { current: 0, required: 3, met: false, label: 'Visits', icon: 'location-outline', data: [] },
    leads: { current: 0, required: 1, met: false, label: 'Leads', icon: 'people-outline', data: [] },
    sales: { current: 0, required: 1, met: false, label: 'Sales', icon: 'trending-up-outline', data: [] },
    conversions: { current: 0, required: 1, met: false, label: 'Conversions', icon: 'repeat-outline', data: [] },
    distributions: { current: 0, required: 5, met: false, label: 'Distributions', icon: 'cube-outline', data: [] },
  };
  
  const reqs = firstTierReqs || defaultReqs;
  
  const allReqsMet = reqs.visits.met && reqs.leads.met && 
                      reqs.sales.met && reqs.conversions.met &&
                      reqs.distributions.met;

  const calculateProgress = () => {
    const total = 5;
    let met = 0;
    if (reqs.visits.met) met++;
    if (reqs.leads.met) met++;
    if (reqs.sales.met) met++;
    if (reqs.conversions.met) met++;
    if (reqs.distributions.met) met++;
    return Math.round((met / total) * 100);
  };

  const tierProgress = calculateProgress();
  const completedSteps = Object.values(reqs).filter(r => r.met).length;
  const totalSteps = 5;

  const getProgressColor = (percent: number) => {
    if (percent >= 100) return colors.success;
    if (percent >= 75) return colors.primary;
    if (percent >= 50) return colors.accent;
    if (percent >= 25) return colors.warning;
    return colors.destructive;
  };

  const getProgressBgColor = (percent: number) => {
    if (percent >= 100) return colors.success + '20';
    if (percent >= 75) return colors.primary + '20';
    if (percent >= 50) return colors.accent + '20';
    if (percent >= 25) return colors.warning + '20';
    return colors.destructive + '20';
  };

  const getStepPercent = (current: number, required: number) => {
    if (required === 0) return 100;
    return Math.min(Math.round((current / required) * 100), 100);
  };

  const getActionButton = () => {
    if (hasTier && dashboardData?.progress?.all_met) {
      return {
        text: "Tier Complete",
        route: "/(app)/visits/checkin",
        icon: "trophy",
      };
    }
    
    if (hasTier) {
      const nextReq = nextTierRequirements?.find(r => !r.met);
      if (nextReq) {
        const routeMap: Record<string, string> = {
          'Visits': '/(app)/visits/checkin',
          'Sales': '/(app)/leads',
          'Revenue': '/(app)/leads',
          'Conversions': '/(app)/leads',
          'Distributions': '/(app)/distributions',
        };
        return {
          text: `${nextReq.label} Needed`,
          route: routeMap[nextReq.label] || '/(app)/visits/checkin',
          icon: "arrow-forward",
        };
      }
      return {
        text: "View Progress",
        route: "/(app)/visits/checkin",
        icon: "trending-up",
      };
    }
    
    if (allReqsMet) {
      return {
        text: "Unlock Bronze",
        route: "/(app)/leads",
        icon: "trophy",
      };
    }
    
    const incomplete = Object.entries(reqs).find(([key, req]) => !req.met);
    if (incomplete) {
      const [key, req] = incomplete;
      const routeMap: Record<string, string> = {
        'visits': '/(app)/visits/checkin',
        'leads': '/(app)/leads/create',
        'sales': '/(app)/leads',
        'conversions': '/(app)/leads',
        'distributions': '/(app)/distributions',
      };
      return {
        text: req.label,
        route: routeMap[key] || '/(app)/visits/checkin',
        icon: "arrow-forward",
      };
    }
    
    return {
      text: "Start Journey",
      route: "/(app)/visits/checkin",
      icon: "rocket",
    };
  };

  const actionButton = getActionButton();

  // Render modal
  const renderMilestoneModal = (
    visible: boolean,
    setVisible: (value: boolean) => void,
    title: string,
    icon: string,
    data: any[],
    emptyMessage: string,
    actionButtonText: string,
    actionRoute: string,
    renderItem: (item: any) => JSX.Element
  ) => {
    return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => setVisible(false)}
    >
      <View style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)' }]}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <View style={styles.modalHeaderLeft}>
              <Ionicons name={icon} size={24} color={colors.primary} />
              <Text style={[typography.h4, styles.modalTitle, { color: colors.foreground }]}>{title}</Text>
            </View>
            <TouchableOpacity onPress={() => setVisible(false)}>
              <Ionicons name="close" size={24} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {data.length > 0 ? (
              data.map((item, index) => renderItem(item))
            ) : (
              <View style={styles.modalEmptyContainer}>
                <Ionicons name={icon} size={48} color={colors.mutedForeground} />
                <Text style={[typography.body1, styles.modalEmptyText, { color: colors.mutedForeground }]}>
                  {emptyMessage}
                </Text>
              </View>
            )}
            
            <View style={[styles.modalFootnoteContainer, { backgroundColor: colors.primary + '10' }]}>
              <Ionicons name="bulb-outline" size={18} color={colors.primary} />
              <Text style={[typography.body2, styles.modalFootnoteText, { color: colors.mutedForeground }]}>
                {modalFootnote}
              </Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.modalActionButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                setVisible(false);
                router.push(actionRoute as any);
              }}
            >
              <Text style={[typography.button, styles.modalActionText, { color: colors.primaryForeground }]}>
                {actionButtonText}
              </Text>
              <Ionicons name="arrow-forward" size={18} color={colors.primaryForeground} />
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )};

  // Render benefits modal
  const renderBenefitsModal = () => (
    <Modal
      visible={benefitsModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setBenefitsModalVisible(false)}
    >
      <View style={[styles.modalOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)' }]}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <LinearGradient
            colors={['#6C3CE1', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.benefitsModalHeader}
          >
            <View style={styles.benefitsModalHeaderContent}>
              <Text style={styles.benefitsModalTitle}>Bronze Tier Benefits</Text>
              <TouchableOpacity onPress={() => setBenefitsModalVisible(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
          </LinearGradient>
          
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            <View style={[styles.benefitsPlanCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary }]}>
              <Text style={[typography.h5, styles.benefitsPlanName, { color: colors.primary }]}>
                {BRONZE_TIER_METADATA.plan} Plan
              </Text>
              <View style={styles.benefitsPricingRow}>
                <View style={styles.benefitsPricingItem}>
                  <Text style={[typography.caption, styles.benefitsPricingLabel, { color: colors.mutedForeground }]}>
                    First Year
                  </Text>
                  <Text style={[typography.h5, styles.benefitsPricingValue, { color: colors.foreground }]}>
                    रू {BRONZE_TIER_METADATA.pricing.first_year.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.benefitsPricingDivider} />
                <View style={styles.benefitsPricingItem}>
                  <Text style={[typography.caption, styles.benefitsPricingLabel, { color: colors.mutedForeground }]}>
                    Monthly After
                  </Text>
                  <Text style={[typography.h5, styles.benefitsPricingValue, { color: colors.foreground }]}>
                    रू {BRONZE_TIER_METADATA.pricing.monthly_after.toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={[typography.h6, styles.benefitsSectionTitle, { color: colors.foreground, marginTop: 16 }]}>
              What You Get
            </Text>
            {BRONZE_TIER_METADATA.benefits.map((benefit, index) => (
              <View key={index} style={[styles.benefitsItem, { borderBottomColor: colors.border }]}>
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                <Text style={[typography.body2, styles.benefitsItemText, { color: colors.foreground }]}>
                  {benefit}
                </Text>
              </View>
            ))}

            <Text style={[typography.h6, styles.benefitsSectionTitle, { color: colors.foreground, marginTop: 16 }]}>
              Requirements
            </Text>
            {BRONZE_TIER_METADATA.requirements.map((req, index) => {
              let isMet = false;
              if (req.includes('sales') && totalSales >= 1) isMet = true;
              if (req.includes('revenue') && totalSales >= 1) isMet = true;
              if (req.includes('conversions') && totalSales >= 1) isMet = true;
              if (req.includes('visits') && totalVisits >= 3) isMet = true;
              
              return (
                <View key={index} style={[styles.benefitsRequirementItem, { borderBottomColor: colors.border }]}>
                  <Ionicons 
                    name={isMet ? "checkmark-circle" : "ellipse-outline"} 
                    size={18} 
                    color={isMet ? colors.success : colors.mutedForeground} 
                  />
                  <Text style={[
                    typography.body2, 
                    styles.benefitsRequirementText, 
                    { color: isMet ? colors.success : colors.mutedForeground }
                  ]}>
                    {req}
                  </Text>
                </View>
              );
            })}

            <View style={[styles.benefitsProgressSummary, { backgroundColor: colors.background }]}>
              <Text style={[typography.body2, styles.benefitsProgressText, { color: colors.foreground }]}>
                Progress: {completedSteps}/{totalSteps} requirements met
              </Text>
              <View style={[styles.benefitsProgressBar, { backgroundColor: colors.border }]}>
                <View 
                  style={[
                    styles.benefitsProgressFill, 
                    { 
                      width: `${tierProgress}%`,
                      backgroundColor: tierProgress >= 100 ? colors.success : colors.primary 
                    }
                  ]} 
                />
              </View>
            </View>

            <View style={[styles.modalFootnoteContainer, { backgroundColor: colors.primary + '10', marginTop: 12 }]}>
              <Ionicons name="bulb-outline" size={18} color={colors.primary} />
              <Text style={[typography.body2, styles.modalFootnoteText, { color: colors.mutedForeground }]}>
                {modalFootnote || "Complete all requirements to unlock Bronze tier and start earning!"}
              </Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.modalActionButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                setBenefitsModalVisible(false);
                if (!allReqsMet) {
                  router.push(actionButton.route as any);
                }
              }}
            >
              <Text style={[typography.button, styles.modalActionText, { color: colors.primaryForeground }]}>
                {allReqsMet ? "Bronze Unlocked" : actionButton.text}
              </Text>
              <Ionicons name="arrow-forward" size={18} color={colors.primaryForeground} />
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const showFirstSteps = hasAnyActivity || hasTier;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Header with subtle gradient */}
      <LinearGradient
        colors={['#6C3CE1', '#8B5CF6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerTopBar}>
        <SyncStatusIndicator />
          <Logo size="large" backdropColor="darker" />
          <TouchableOpacity style={styles.tierBadge} onPress={() => router.push('/profile')}>
            <Ionicons name="medal" size={14} color="#FBBF24" />
            <Text style={[typography.caption, styles.tierBadgeText, { color: '#fff' }]}>
              {hasTier || 'Explorer'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.welcomeRow}>
          <View>
            <Text style={styles.welcomeTitle}>Howdy, {dashboardData?.mr?.name || user?.name}!</Text>
            <Text style={styles.welcomeSubtitle}>Ready to hustle today?</Text>
          </View>
          <View style={styles.payoutBadge}>
            <Ionicons name="timer-outline" size={12} color="#34D399" />
            <Text style={styles.payoutText}>Payout in 4 days</Text>
          </View>
        </View>

        {/* Commission Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.heroLabel}>Your Commission</Text>
              <Text style={styles.heroMainValue}>रू {totalCommission.toFixed(2)}</Text>
            </View>
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingText}>Pending: रू {pendingCommission.toFixed(2)}</Text>
            </View>
          </View>

          <View style={styles.heroDivider} />

          <View style={styles.heroBottomRow}>
            <View style={styles.heroStatItem}>
              <Text style={styles.subEarningLabel}>Lifetime Earnings</Text>
              <Text style={styles.heroStatValue}>रू {totalCommission.toFixed(2)}</Text>
            </View>
            <View style={styles.separatorVertical} />
            <View style={styles.heroStatItem}>
              <Text style={styles.subEarningLabel}>Pending Now</Text>
              <Text style={styles.heroStatValue}>रू {pendingCommission.toFixed(2)}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Quick Actions */}
      <View style={styles.quickActionsSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity style={styles.quickActionTile} onPress={() => router.push('/(app)/visits/checkin')}>
            <View style={[styles.quickIcon, { backgroundColor: '#EEF2FF' }]}>
              <Ionicons name="location" size={22} color="#4F46E5" />
            </View>
            <Text style={styles.quickActionLabel}>Check In</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionTile} onPress={() => router.push('/(app)/leads/create')}>
            <View style={[styles.quickIcon, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="person-add" size={22} color="#16A34A" />
            </View>
            <Text style={styles.quickActionLabel}>New Lead</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionTile} onPress={() => router.push('/(app)/materials')}>
            <View style={[styles.quickIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="cube" size={22} color="#D97706" />
            </View>
            <Text style={styles.quickActionLabel}>Materials</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionTile} onPress={() => router.push('/(app)/coupons')}>
            <View style={[styles.quickIcon, { backgroundColor: '#FCE7F3' }]}>
              <Ionicons name="ticket" size={22} color="#DB2777" />
            </View>
            <Text style={styles.quickActionLabel}>Coupons</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.contentArea}>
        
        {/* Progress */}
        {(hasTier || hasAnyActivity) && (
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <View style={styles.progressLeft}>
                <Ionicons 
                  name={hasTier ? "trending-up-outline" : "rocket-outline"} 
                  size={14} 
                  color={colors.primary} 
                />
                <Text style={[typography.body2, styles.progressLabel, { color: colors.mutedForeground }]}>
                  {hasTier 
                    ? `Progress to ${dashboardData?.progress?.next_tier || 'Next Tier'}`
                    : 'Progress to Bronze Tier'
                  }
                </Text>
              </View>
              <Text style={[typography.caption, styles.progressValue, { color: colors.primary }]}>
                {hasTier ? `${progressPercent}%` : `${tierProgress}%`}
              </Text>
            </View>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: hasTier 
                      ? `${Math.min(progressPercent, 100)}%` 
                      : `${Math.min(tierProgress, 100)}%`,
                    backgroundColor: (hasTier && progressPercent >= 100) || (!hasTier && allReqsMet) 
                      ? colors.success 
                      : colors.primary 
                  }
                ]} 
              />
            </View>
          </View>
        )}

        {/* Performance Metrics */}
        {(isActive || hasTier) && (
          <>
            <Text style={[typography.h6, styles.sectionTitle, { color: colors.foreground }]}>Performance</Text>
            
            <View style={styles.metricsRow}>
              <View style={[styles.metricCard, { backgroundColor: '#EEF2FF' }]}>
                <Text style={[typography.caption, styles.metricLabel, { color: '#4F46E5' }]}>Sales</Text>
                <Text style={[typography.h4, styles.metricValue, { color: '#1E1B4B' }]}>{totalSales}</Text>
              </View>
              <View style={[styles.metricCard, { backgroundColor: '#F0FDF4' }]}>
                <Text style={[typography.caption, styles.metricLabel, { color: '#16A34A' }]}>Leads</Text>
                <Text style={[typography.h4, styles.metricValue, { color: '#1E1B4B' }]}>{totalLeads}</Text>
              </View>
            </View>

            <View style={styles.metricsRow}>
              <View style={[styles.metricCard, { backgroundColor: '#FEF3C7' }]}>
                <Text style={[typography.caption, styles.metricLabel, { color: '#D97706' }]}>Conversion</Text>
                <Text style={[typography.h4, styles.metricValue, { color: '#1E1B4B' }]}>{conversionRate}%</Text>
              </View>
              <View style={[styles.metricCard, { backgroundColor: '#FCE7F3' }]}>
                <Text style={[typography.caption, styles.metricLabel, { color: '#DB2777' }]}>Visits</Text>
                <Text style={[typography.h4, styles.metricValue, { color: '#1E1B4B' }]}>{totalVisits}</Text>
              </View>
            </View>
          </>
        )}

        {/* Target Section */}
        {hasTier && nextTierName && nextTierRequirements && nextTierRequirements.length > 0 && (
          <View style={[styles.targetCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.targetHeader}>
              <View style={styles.targetTitleContainer}>
                <Ionicons name="rocket-outline" size={18} color={colors.primary} />
                <Text style={[typography.h6, styles.targetTitle, { color: colors.foreground }]}>
                  Target: {nextTierName}
                </Text>
              </View>
              <View style={[styles.targetProgressBadge, { backgroundColor: colors.primary + '15' }]}>
                <Text style={[typography.caption, styles.targetProgressText, { color: colors.primary }]}>
                  {progressPercent}% Complete
                </Text>
              </View>
            </View>

            <View style={styles.targetItemsContainer}>
              {nextTierRequirements.map((req, index) => (
                <View key={index} style={[styles.targetItem, { borderBottomColor: colors.border }]}>
                  <View style={styles.targetItemLeft}>
                    <Ionicons name={req.icon} size={16} color={req.met ? colors.success : colors.mutedForeground} />
                    <Text style={[typography.body2, styles.targetItemLabel, { color: colors.mutedForeground }]}>
                      {req.label}
                    </Text>
                  </View>
                  <View style={styles.targetItemRight}>
                    <Text style={[typography.body2, styles.targetItemCurrent, { color: req.met ? colors.success : colors.foreground }]}>
                      {req.current}
                    </Text>
                    <Text style={[typography.caption, styles.targetItemSeparator, { color: colors.mutedForeground }]}>
                      /
                    </Text>
                    <Text style={[typography.body2, styles.targetItemRequired, { color: colors.mutedForeground }]}>
                      {req.required}
                    </Text>
                    {req.met && (
                      <Ionicons name="checkmark-circle" size={16} color={colors.success} style={styles.targetItemCheck} />
                    )}
                  </View>
                </View>
              ))}
            </View>

            {dashboardData?.progress?.all_met && (
              <View style={[styles.targetCompleteContainer, { backgroundColor: colors.success + '15' }]}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <Text style={[typography.body2, styles.targetCompleteText, { color: colors.success }]}>
                  All requirements met for {nextTierName}!
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Recent Activity */}
        {hasRecentActivity && (
          <View style={[styles.recentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[typography.h6, styles.recentTitle, { color: colors.foreground }]}>
              Recent Activity
            </Text>
            
            {recentVisits.length > 0 && (
              <View style={styles.recentList}>
                <TouchableOpacity onPress={() => router.push('/(app)/visits')}>
                  <Text style={[typography.caption, styles.recentLabel, { color: colors.primary }]}>
                    Visits ({recentVisits.length}) →
                  </Text>
                </TouchableOpacity>
                {recentVisits.slice(0, 3).map((visit, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={[styles.recentItem, { borderBottomColor: colors.border }]}
                    onPress={() => router.push(`/(app)/visits/${visit.id}`)}
                  >
                    <View style={styles.recentLeft}>
                      <Ionicons name="location-outline" size={14} color={colors.primary} />
                      <Text style={[typography.body2, styles.recentText, { color: colors.foreground }]}>
                        {visit.organization}
                      </Text>
                    </View>
                    <View style={[styles.recentStatus, { 
                      backgroundColor: visit.status === 'completed' ? colors.success + '20' : colors.accent + '20' 
                    }]}>
                      <Text style={[typography.caption, styles.recentStatusText, { 
                        color: visit.status === 'completed' ? colors.success : colors.mutedForeground 
                      }]}>
                        {visit.status || 'planned'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
                {recentVisits.length > 3 && (
                  <TouchableOpacity onPress={() => router.push('/(app)/visits')}>
                    <Text style={[typography.caption, styles.viewAllText, { color: colors.primary }]}>
                      View all {recentVisits.length} visits →
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {totalLeads > 0 && (
              <View style={[styles.recentList, { marginTop: recentVisits.length > 0 ? 12 : 0 }]}>
                <TouchableOpacity onPress={() => router.push('/(app)/leads')}>
                  <Text style={[typography.caption, styles.recentLabel, { color: colors.primary }]}>
                    Leads ({totalLeads}) →
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.recentItem, { borderBottomColor: colors.border }]}
                  onPress={() => router.push('/(app)/leads')}
                >
                  <View style={styles.recentLeft}>
                    <Ionicons name="person-add-outline" size={14} color={colors.success || '#10B981'} />
                    <Text style={[typography.body2, styles.recentText, { color: colors.foreground }]}>
                      {totalLeads} leads created
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* First Steps */}
        {showFirstSteps && (
          <View style={[styles.stepsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.stepsHeader}>
              <Text style={[typography.h6, styles.stepsTitle, { color: colors.foreground }]}>
                {hasTier ? `Progress to ${dashboardData?.progress?.next_tier || 'Next Tier'}` : 'First Steps to Bronze'}
              </Text>
              <View style={[styles.stepsBadge, { backgroundColor: colors.primary + '15' }]}>
                <Text style={[typography.caption, styles.stepsBadgeText, { color: colors.primary }]}>
                  {completedSteps}/{totalSteps} Done
                </Text>
              </View>
            </View>

            <View style={styles.stepsList}>
              {Object.entries(reqs).map(([key, req]) => (
                <TouchableOpacity 
                  key={key}
                  style={styles.stepItem} 
                  onPress={() => {
                    const modalMap: Record<string, any> = {
                      visits: setVisitsModalVisible,
                      leads: hasTier ? setSalesModalVisible : setLeadsModalVisible,
                      sales: setSalesModalVisible,
                      conversions: setConversionsModalVisible,
                      distributions: setDistributionsModalVisible,
                    };
                    openModal(modalMap[key] || setVisitsModalVisible);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.stepLeft}>
                    <Ionicons 
                      name={req.icon as any} 
                      size={16} 
                      color={req.met ? colors.success : colors.mutedForeground} 
                    />
                    <View style={styles.stepTextContainer}>
                      <Text style={[typography.body2, styles.stepText, { color: colors.foreground }]}>
                        {req.required} {req.label}
                      </Text>
                      <Text style={[typography.caption, styles.stepSubtext, { color: colors.mutedForeground }]}>
                        {req.current} of {req.required} completed
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.stepPercent, { backgroundColor: getProgressBgColor(getStepPercent(req.current, req.required)) }]}>
                    <Text style={[typography.caption, styles.stepPercentText, { 
                      color: getProgressColor(getStepPercent(req.current, req.required))
                    }]}>
                      {getStepPercent(req.current, req.required)}%
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {allReqsMet && (
              <View style={[styles.stepsComplete, { backgroundColor: colors.success + '15' }]}>
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                <Text style={[typography.body2, styles.stepsCompleteText, { color: colors.success }]}>
                  {hasTier ? `All requirements met for ${dashboardData?.progress?.next_tier || 'next tier'}!` : 'All steps complete! Bronze tier unlocked!'}
                </Text>
              </View>
            )}
            
            <TouchableOpacity 
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                if (allReqsMet && hasTier && dashboardData?.progress?.all_met) {
                  setModalFootnote(getRandomFootnote());
                  setBenefitsModalVisible(true);
                } else {
                  router.push(actionButton.route as any);
                }
              }}
            >
              <Ionicons 
                name={actionButton.icon as any} 
                size={18} 
                color={colors.primaryForeground} 
              />
              <Text style={[typography.button, styles.actionButtonText, { color: colors.primaryForeground }]}>
                {actionButton.text}
              </Text>
              <Ionicons name="arrow-forward" size={18} color={colors.primaryForeground} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Modals */}
      {renderMilestoneModal(
        visitsModalVisible,
        setVisitsModalVisible,
        'Your Visits',
        'location-outline',
        reqs.visits.data,
        'No visits yet. Start your journey by checking in!',
        'Create a Visit',
        '/(app)/visits/checkin',
        (item) => (
          <View key={item.id} style={[styles.modalItem, { borderBottomColor: colors.border }]}>
            <View style={styles.modalItemLeft}>
              <Ionicons name="location-outline" size={16} color={colors.primary} />
              <Text style={[typography.body2, styles.modalItemText, { color: colors.foreground }]}>{item.customer}</Text>
            </View>
            <Text style={[typography.caption, styles.modalItemDate, { color: colors.mutedForeground }]}>
              {new Date(item.date).toLocaleDateString()}
            </Text>
          </View>
        )
      )}

      {renderMilestoneModal(
        leadsModalVisible,
        setLeadsModalVisible,
        'Your Leads',
        'people-outline',
        reqs.leads.data,
        'No leads yet. Start generating leads today!',
        'Create a Lead',
        '/(app)/leads/create',
        (item) => (
          <View key={item.id} style={[styles.modalItem, { borderBottomColor: colors.border }]}>
            <View style={styles.modalItemLeft}>
              <Ionicons name="person-outline" size={16} color={colors.primary} />
              <Text style={[typography.body2, styles.modalItemText, { color: colors.foreground }]}>{item.customer_name}</Text>
            </View>
            <Text style={[typography.caption, styles.modalItemDate, { color: colors.mutedForeground }]}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        )
      )}

      {renderMilestoneModal(
        salesModalVisible,
        setSalesModalVisible,
        'Your Sales',
        'trending-up-outline',
        reqs.sales.data,
        'No sales yet. Convert your leads into customers!',
        'Register a Sale',
        '/(app)/leads',
        (item) => (
          <View key={item.id} style={[styles.modalItem, { borderBottomColor: colors.border }]}>
            <View style={styles.modalItemLeft}>
              <Ionicons name="cash-outline" size={16} color={colors.success} />
              <Text style={[typography.body2, styles.modalItemText, { color: colors.foreground }]}>Sale #{item.id || 'N/A'}</Text>
            </View>
            <Text style={[typography.caption, styles.modalItemDate, { color: colors.mutedForeground }]}>
              {new Date(item.created_at || Date.now()).toLocaleDateString()}
            </Text>
          </View>
        )
      )}

      {renderMilestoneModal(
        conversionsModalVisible,
        setConversionsModalVisible,
        'Your Conversions',
        'repeat-outline',
        reqs.conversions.data,
        'No conversions yet. Turn your leads into customers!',
        'Convert a Lead',
        '/(app)/leads',
        (item) => (
          <View key={item.id} style={[styles.modalItem, { borderBottomColor: colors.border }]}>
            <View style={styles.modalItemLeft}>
              <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
              <Text style={[typography.body2, styles.modalItemText, { color: colors.foreground }]}>{item.customer_name}</Text>
            </View>
            <Text style={[typography.caption, styles.modalItemDate, { color: colors.mutedForeground }]}>
              {new Date(item.created_at || Date.now()).toLocaleDateString()}
            </Text>
          </View>
        )
      )}

      {renderMilestoneModal(
        distributionsModalVisible,
        setDistributionsModalVisible,
        'Your Distributions',
        'cube-outline',
        reqs.distributions.data,
        'No distributions yet. Start distributing materials!',
        'Distribute Materials',
        '/(app)/visits/checkin',
        (item) => (
          <View key={item.id} style={[styles.modalItem, { borderBottomColor: colors.border }]}>
            <View style={styles.modalItemLeft}>
              <Ionicons name="cube-outline" size={16} color={colors.accent} />
              <Text style={[typography.body2, styles.modalItemText, { color: colors.foreground }]}>{item.name || 'Material'}</Text>
            </View>
            <Text style={[typography.caption, styles.modalItemDate, { color: colors.mutedForeground }]}>
              {new Date(item.created_at || Date.now()).toLocaleDateString()}
            </Text>
          </View>
        )
      )}

      {renderBenefitsModal()}
    </ScrollView>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    contentContainer: { paddingBottom: 32 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    
    // Header
    header: { padding: 20, paddingTop: 40, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
    headerTopBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    welcomeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, marginTop: 42 },
    welcomeSubtitle: { fontSize: 16, marginTop:2, color: 'rgba(255, 255, 255, 0.67)', fontWeight: '500' },
    welcomeTitle: { fontSize: 22, fontWeight: '700', color: '#fff', letterSpacing: -0.5 },
    tierBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16, gap: 4 },
    tierBadgeText: { color: '#fff', fontWeight: '500' },
    payoutBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(29, 224, 149, 0.26)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4 },
    payoutText: { color: '#15fa9b', fontSize: 10, fontWeight: '600' },
    
    // Hero Card
    heroCard: {
      backgroundColor: 'rgba(255,255,255,0.08)',
      borderRadius: 20,
      padding: 18,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.06)',
    },
    heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    heroLabel: { color: '#ffffff', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    heroMainValue: { color: '#FFFFFF', fontSize: 30, fontWeight: '800', marginTop: 2, letterSpacing: -0.5 },
    pendingBadge: { backgroundColor: 'rgba(29, 224, 149, 0.26)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    pendingText: { color: '#15fa9b', fontSize: 10, fontWeight: '600' },
    heroDivider: { height: 1, backgroundColor: 'rgba(255, 255, 255, 0.08)', marginVertical: 12 },
    heroBottomRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
    heroStatItem: { alignItems: 'center', gap: 2 },
    subEarningLabel: { color: '#eff2f7', fontSize: 11, fontWeight: '500' },
    heroStatValue: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    separatorVertical: { width: 1, height: 24, backgroundColor: 'rgba(255, 255, 255, 0.08)' },

    // Quick Actions
    quickActionsSection: { paddingHorizontal: 16, paddingTop: 16 },
    quickActionsGrid: { flexDirection: 'row', gap: 10 },
    quickActionTile: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, paddingVertical: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
    quickIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
    quickActionLabel: { fontSize: 11, fontWeight: '600', color: '#334155' },
    sectionTitle: { fontSize: 15, fontWeight: '600', color: '#0F172A', marginBottom: 10 },

    // Content Area
    contentArea: { padding: 16 },
    
    // Progress
    progressContainer: { paddingHorizontal: 4, paddingVertical: 6, marginBottom: 4 },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    progressLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    progressLabel: { fontWeight: '500', fontSize: 13 },
    progressValue: { fontWeight: '600', fontSize: 12 },
    progressBar: { height: 4, borderRadius: 2, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 2 },

    // Metrics
    metricsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    metricCard: { flex: 1, borderRadius: 12, padding: 14 },
    metricValue: { color: colors.foreground, marginTop: 2, fontWeight: '700' },
    metricLabel: { color: colors.mutedForeground },

    // Target Card
    targetCard: { borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1 },
    targetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    targetTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    targetTitle: { fontWeight: '600' },
    targetProgressBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    targetProgressText: { fontWeight: '600', fontSize: 11 },
    targetItemsContainer: { gap: 6 },
    targetItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4, borderBottomWidth: 1 },
    targetItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    targetItemLabel: { fontWeight: '500' },
    targetItemRight: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    targetItemCurrent: { fontWeight: '600' },
    targetItemSeparator: { fontWeight: '400' },
    targetItemRequired: { fontWeight: '400' },
    targetItemCheck: { marginLeft: 4 },
    targetCompleteContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 8, borderRadius: 8, marginTop: 10, gap: 6 },
    targetCompleteText: { fontWeight: '600' },

    // Recent Activity
    recentCard: { borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1 },
    recentTitle: { fontWeight: '600', marginBottom: 10 },
    recentList: { gap: 6 },
    recentLabel: { fontWeight: '500', marginBottom: 2 },
    recentItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4, borderBottomWidth: 1 },
    recentLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    recentText: { flex: 1 },
    recentStatus: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    recentStatusText: { fontSize: 10, fontWeight: '500', textTransform: 'capitalize' },
    viewAllText: { fontWeight: '500', marginTop: 4 },

    // Steps
    stepsCard: { borderRadius: 14, padding: 16, borderWidth: 1 },
    stepsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    stepsTitle: { fontWeight: '600' },
    stepsBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    stepsBadgeText: { fontWeight: '600', fontSize: 11 },
    stepsList: { gap: 4 },
    stepItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
    stepLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    stepTextContainer: { marginLeft: 8, flex: 1 },
    stepText: { fontWeight: '500' },
    stepSubtext: { fontSize: 11 },
    stepPercent: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, minWidth: 32, alignItems: 'center' },
    stepPercentText: { fontWeight: '600', fontSize: 11 },
    stepsComplete: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 8, borderRadius: 8, marginTop: 10, gap: 6 },
    stepsCompleteText: { fontWeight: '600' },
    actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, marginTop: 12, gap: 6 },
    actionButtonText: { fontWeight: '600' },

    // Modals
    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', paddingBottom: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
    modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    modalTitle: { fontWeight: '600' },
    modalBody: { padding: 16 },
    modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1 },
    modalItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    modalItemText: { fontWeight: '500' },
    modalItemDate: { fontSize: 12 },
    modalEmptyContainer: { alignItems: 'center', paddingVertical: 30 },
    modalEmptyText: { textAlign: 'center', marginTop: 12 },
    modalFootnoteContainer: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, marginTop: 12, gap: 6 },
    modalFootnoteText: { flex: 1, fontStyle: 'italic', fontSize: 13 },
    modalActionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, marginTop: 12, gap: 6 },
    modalActionText: { fontWeight: '600' },

    // Benefits Modal
    benefitsModalHeader: { padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    benefitsModalHeaderContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    benefitsModalTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
    benefitsPlanCard: { borderRadius: 12, padding: 16, borderWidth: 1 },
    benefitsPlanName: { fontWeight: '700', textAlign: 'center', marginBottom: 10 },
    benefitsPricingRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
    benefitsPricingItem: { alignItems: 'center' },
    benefitsPricingLabel: { fontSize: 12 },
    benefitsPricingValue: { fontWeight: '700', marginTop: 2 },
    benefitsPricingDivider: { width: 1, height: 24, backgroundColor: colors.border },
    benefitsSectionTitle: { fontWeight: '600', marginBottom: 6 },
    benefitsItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, gap: 8 },
    benefitsItemText: { fontWeight: '500' },
    benefitsRequirementItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, gap: 8 },
    benefitsRequirementText: { fontWeight: '500' },
    benefitsProgressSummary: { padding: 10, borderRadius: 8, marginTop: 12 },
    benefitsProgressText: { fontWeight: '500', marginBottom: 4 },
    benefitsProgressBar: { height: 4, borderRadius: 2, overflow: 'hidden' },
    benefitsProgressFill: { height: '100%', borderRadius: 2 },
  });