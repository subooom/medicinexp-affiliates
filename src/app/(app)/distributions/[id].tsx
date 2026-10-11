// app/(app)/distributions/[id].tsx
import { distributionApi } from '@/api/distributions';
import { AppColors } from '@/constants/colors';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import { Distribution } from '@/types/models';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function DistributionDetailScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [distribution, setDistribution] = useState<Distribution | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDistribution();
  }, []);

  const loadDistribution = async () => {
    try {
      const response = await distributionApi.getById(parseInt(id));
      setDistribution(response.data.data);
    } catch (error) {
      console.error('Error loading distribution:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!distribution) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[typography.body1, { color: colors.mutedForeground }]}>Distribution not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header Card */}
      <View style={[styles.headerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.headerTop}>
          {distribution.material?.image_url ? (
            <Image 
              source={{ uri: distribution.material.image_url }} 
              style={styles.headerImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.iconContainer, { backgroundColor: colors.accent + '15' }]}>
              <Ionicons name="cube-outline" size={32} color={colors.accent} />
            </View>
          )}
          <View style={[styles.quantityBadge, { backgroundColor: colors.primary + '15' }]}>
            <Text style={[typography.h4, styles.quantityText, { color: colors.primary }]}>
              ×{distribution.quantity}
            </Text>
          </View>
        </View>

        <Text style={[typography.h3, styles.materialName, { color: colors.foreground }]}>
          {distribution.material?.name || 'Unknown Material'}
        </Text>

        {distribution.material?.type && (
          <View style={[styles.typeBadge, { backgroundColor: distribution.material.type.color + '15' }]}>
            <Text style={[typography.caption, styles.typeText, { color: distribution.material.type.color }]}>
              {distribution.material.type.name}
            </Text>
          </View>
        )}

        <Text style={[typography.body2, styles.orgName, { color: colors.mutedForeground }]}>
          {distribution.organization?.name || 'Unknown Organization'}
        </Text>
        <Text style={[typography.body2, styles.orgAddress, { color: colors.mutedForeground }]}>
          {distribution.organization?.address || ''}
        </Text>
      </View>

      {/* Stats Grid */}
      <View style={[styles.statsGrid, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.statItem}>
          <Text style={[typography.h4, styles.statValue, { color: colors.foreground }]}>{distribution.quantity}</Text>
          <Text style={[typography.caption, styles.statLabel, { color: colors.mutedForeground }]}>Quantity</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[typography.h4, styles.statValue, { color: colors.foreground }]}>
            {new Date(distribution.distribution_date).toLocaleDateString()}
          </Text>
          <Text style={[typography.caption, styles.statLabel, { color: colors.mutedForeground }]}>Date</Text>
        </View>
        {distribution.visit_id && (
          <>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <TouchableOpacity 
                onPress={() => router.push({
                  pathname: '/(app)/visits/[id]',
                  params: { id: distribution.visit_id }
                })}
              >
                <Text style={[typography.h4, styles.statValue, { color: colors.primary }]}>View</Text>
                <Text style={[typography.caption, styles.statLabel, { color: colors.mutedForeground }]}>Visit</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Material Details */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[typography.h5, styles.sectionTitle, { color: colors.foreground }]}>Material Details</Text>
        
        {distribution.material?.sku && (
          <View style={styles.detailRow}>
            <Text style={[typography.body2, styles.detailLabel, { color: colors.mutedForeground }]}>SKU</Text>
            <Text style={[typography.body2, styles.detailValue, { color: colors.foreground }]}>{distribution.material.sku}</Text>
          </View>
        )}
        
        {distribution.material?.unit && (
          <View style={styles.detailRow}>
            <Text style={[typography.body2, styles.detailLabel, { color: colors.mutedForeground }]}>Unit</Text>
            <Text style={[typography.body2, styles.detailValue, { color: colors.foreground }]}>{distribution.material.unit}</Text>
          </View>
        )}
        
        {distribution.material?.description && (
          <View style={[styles.detailRow, styles.detailRowLast]}>
            <Text style={[typography.body2, styles.detailLabel, { color: colors.mutedForeground }]}>Description</Text>
            <Text style={[typography.body2, styles.detailValue, { color: colors.foreground }]}>{distribution.material.description}</Text>
          </View>
        )}
      </View>

      {/* Organization Details */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[typography.h5, styles.sectionTitle, { color: colors.foreground }]}>Organization Details</Text>
        
        {distribution.organization?.email && (
          <View style={styles.detailRow}>
            <Text style={[typography.body2, styles.detailLabel, { color: colors.mutedForeground }]}>Email</Text>
            <Text style={[typography.body2, styles.detailValue, { color: colors.foreground }]}>{distribution.organization.email}</Text>
          </View>
        )}
        
        {distribution.organization?.phone && (
          <View style={styles.detailRow}>
            <Text style={[typography.body2, styles.detailLabel, { color: colors.mutedForeground }]}>Phone</Text>
            <Text style={[typography.body2, styles.detailValue, { color: colors.foreground }]}>{distribution.organization.phone}</Text>
          </View>
        )}
        
        {distribution.received_by && (
          <View style={[styles.detailRow, styles.detailRowLast]}>
            <Text style={[typography.body2, styles.detailLabel, { color: colors.mutedForeground }]}>Received By</Text>
            <Text style={[typography.body2, styles.detailValue, { color: colors.foreground }]}>{distribution.received_by}</Text>
          </View>
        )}
      </View>

      {/* Notes */}
      {distribution.notes && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[typography.h5, styles.sectionTitle, { color: colors.foreground }]}>Notes</Text>
          <Text style={[typography.body2, styles.notesText, { color: colors.mutedForeground }]}>
            {distribution.notes}
          </Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actionsContainer}>
        {distribution.organization && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push({
              pathname: '/(app)/organizations/[id]',
              params: { id: distribution.organization.id }
            })}
            activeOpacity={0.7}
          >
            <Ionicons name="business-outline" size={20} color={colors.primaryForeground} />
            <Text style={[typography.button, styles.actionText, { color: colors.primaryForeground }]}>
              View Organization
            </Text>
          </TouchableOpacity>
        )}
        
        {distribution.visit_id && (
          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton, { backgroundColor: colors.card, borderColor: colors.primary }]}
            onPress={() => router.push({
              pathname: '/(app)/visits/[id]',
              params: { id: distribution.visit_id }
            })}
            activeOpacity={0.7}
          >
            <Ionicons name="location-outline" size={20} color={colors.primary} />
            <Text style={[typography.button, styles.secondaryActionText, { color: colors.primary }]}>
              View Associated Visit
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Metadata */}
      <Text style={[typography.caption, styles.metadataText, { color: colors.mutedForeground }]}>
        Created: {new Date(distribution.created_at).toLocaleString()}
      </Text>
    </ScrollView>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerCard: {
      margin: 16,
      marginBottom: 8,
      padding: 20,
      borderRadius: 16,
      borderWidth: 1,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    headerImage: {
      width: 100,
      height: 100,
      borderRadius: 12,
    },
    iconContainer: {
      width: 60,
      height: 60,
      borderRadius: 30,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quantityBadge: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 12,
    },
    quantityText: {
      fontWeight: '700',
    },
    materialName: {
      fontWeight: '700',
      marginTop: 12,
    },
    typeBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 12,
      marginTop: 4,
    },
    typeText: {
      fontWeight: '500',
    },
    orgName: {
      marginTop: 8,
    },
    orgAddress: {
      marginTop: 2,
    },
    statsGrid: {
      flexDirection: 'row',
      marginHorizontal: 16,
      marginBottom: 8,
      paddingVertical: 16,
      borderRadius: 14,
      borderWidth: 1,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
    },
    statValue: {
      fontWeight: '700',
    },
    statLabel: {
      marginTop: 2,
    },
    statDivider: {
      width: 1,
      backgroundColor: colors.border,
    },
    card: {
      marginHorizontal: 16,
      marginBottom: 8,
      padding: 16,
      borderRadius: 14,
      borderWidth: 1,
    },
    sectionTitle: {
      fontWeight: '600',
      marginBottom: 12,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    detailRowLast: {
      borderBottomWidth: 0,
    },
    detailLabel: {
      fontWeight: '400',
    },
    detailValue: {
      fontWeight: '500',
    },
    notesText: {
      lineHeight: 20,
    },
    actionsContainer: {
      paddingHorizontal: 16,
      marginBottom: 24,
      gap: 8,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: 12,
      gap: 8,
    },
    secondaryButton: {
      borderWidth: 1,
    },
    actionText: {
      fontWeight: '600',
    },
    secondaryActionText: {
      fontWeight: '600',
    },
    metadataText: {
      textAlign: 'center',
      marginTop: 4,
      marginBottom: 24,
    },
  });