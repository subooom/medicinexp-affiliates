// components/MaterialDropoff.tsx — Flexbox Grid Layout with Tapable Material Names
import { MarketingMaterial, Organization } from '@/types/models';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// ============================================================
// CONFIGURATION
// ============================================================
const CONFIG = {
  TILE_SIZE: 70,
  TILE_PADDING: 8,
  DROP_ZONE_PADDING: 12,
  COLS: 3, // Number of columns in drop zone
  MAX_PER_VENUE: 3,
};

interface MaterialDropoffProps {
  materials: MarketingMaterial[];
  onDropoff: (materialId: number, quantity: number) => void;
  onClear: () => void;
  colors: any;
  selectedOrg: Organization | null;
}

interface DroppedItem {
  materialId: number;
  id: string;
}

// ============================================================
// ORGANIZATION INFO MODAL — Slides from bottom
// ============================================================
const OrgInfoModal = ({
  visible,
  onClose,
  org,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  org: Organization | null;
  colors: any;
}) => {
  if (!org) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>{org.name}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            {org.address && (
              <View style={styles.modalRow}>
                <Ionicons name="location-outline" size={16} color={colors.mutedForeground} />
                <Text style={[styles.modalText, { color: colors.foreground }]} numberOfLines={2}>
                  {org.address}, {org.city}
                </Text>
              </View>
            )}
            {org.phone && (
              <View style={styles.modalRow}>
                <Ionicons name="call-outline" size={16} color={colors.mutedForeground} />
                <Text style={[styles.modalText, { color: colors.foreground }]}>{org.phone}</Text>
              </View>
            )}
            {org.email && (
              <View style={styles.modalRow}>
                <Ionicons name="mail-outline" size={16} color={colors.mutedForeground} />
                <Text style={[styles.modalText, { color: colors.foreground }]}>{org.email}</Text>
              </View>
            )}
            {org.type && (
              <View style={[styles.modalTypeBadge, { backgroundColor: colors.primary + '15' }]}>
                <Text style={[styles.modalTypeText, { color: colors.primary }]}>
                  {org.type.name}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

// ============================================================
// DROP IN TILE — Flexbox grid item
// ============================================================
const DropInTile = ({ 
  item, 
  onRemove, 
  getMaterial, 
  colors 
}: { 
  item: DroppedItem; 
  onRemove: (id: string) => void; 
  getMaterial: (id: number) => MarketingMaterial | undefined;
  colors: any;
}) => {
  const material = getMaterial(item.materialId);
  if (!material) return null;

  const tileSize = (100 / CONFIG.COLS) - CONFIG.TILE_PADDING;

  return (
    <View
      style={[
        styles.droppedTile,
        { 
          width: `${tileSize}%`,
          aspectRatio: 1,
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      {material.image_url ? (
        <Image source={{ uri: material.image_url }} style={styles.droppedImage} resizeMode="cover" />
      ) : (
        <Ionicons name="cube-outline" size={18} color={colors.primary} />
      )}
      <TouchableOpacity
        style={[styles.removeBtn, { backgroundColor: colors.danger }]}
        onPress={() => onRemove(item.id)}
        activeOpacity={0.8}
      >
        <Ionicons name="close" size={10} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

export const MaterialDropoff = ({ materials, onDropoff, onClear, colors, selectedOrg }: MaterialDropoffProps) => {
  const [selectedMaterial, setSelectedMaterial] = useState<MarketingMaterial | null>(null);
  const [droppedItems, setDroppedItems] = useState<DroppedItem[]>([]);
  const [organizationFilter, setOrganizationFilter] = useState<number | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalOrg, setModalOrg] = useState<Organization | null>(null);

  const orgIds = [...new Set(materials.map(m => m.affiliated_organization_id).filter(Boolean))];

  const handleOrgPress = (org: Organization) => {
    setModalOrg(org);
    setModalVisible(true);
  };

  const handleDropoff = (material: MarketingMaterial) => {
    const currentCount = droppedItems.filter(i => i.materialId === material.id).length;
    const maxLimit = material.max_distribution_per_venue ?? CONFIG.MAX_PER_VENUE;

    if (currentCount >= maxLimit) return;

    const newItem: DroppedItem = {
      materialId: material.id,
      id: `${material.id}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    
    setDroppedItems(prev => [...prev, newItem]);
    onDropoff(material.id, droppedItems.filter(i => i.materialId === material.id).length + 1);
  };

  const handleRemove = (id: string) => {
    const item = droppedItems.find(i => i.id === id);
    if (item) {
      const remaining = droppedItems.filter(i => i.id !== id);
      setDroppedItems(remaining);
      onDropoff(item.materialId, remaining.filter(i => i.materialId === item.materialId).length);
    }
  };

  const handleClearAll = () => {
    setDroppedItems([]);
    onClear();
  };

  const handleKeepOne = () => {
    const seen = new Set();
    const kept: DroppedItem[] = [];
    for (const item of droppedItems) {
      if (!seen.has(item.materialId)) {
        seen.add(item.materialId);
        kept.push(item);
      }
    }
    setDroppedItems(kept);
  };

  const filteredMaterials = organizationFilter 
    ? materials.filter(m => m.affiliated_organization_id === organizationFilter)
    : materials;

  const totalDropped = droppedItems.length;
  const getMaterial = (id: number) => materials.find(m => m.id === id);

  const isAtMax = (materialId: number) => {
    const material = getMaterial(materialId);
    if (!material) return false;
    const currentCount = droppedItems.filter(i => i.materialId === materialId).length;
    const maxLimit = material.max_distribution_per_venue ?? CONFIG.MAX_PER_VENUE;
    return currentCount >= maxLimit;
  };

  const getRemaining = (materialId: number) => {
    const material = getMaterial(materialId);
    if (!material) return 0;
    const currentCount = droppedItems.filter(i => i.materialId === materialId).length;
    const maxLimit = material.max_distribution_per_venue ?? CONFIG.MAX_PER_VENUE;
    return Math.max(0, maxLimit - currentCount);
  };

  // ============================================================
  // BUILD SUMMARY LINE — All material names tapable
  // ============================================================
  const getSummaryText = () => {
    if (totalDropped === 0) return null;

    const groups: { [key: number]: { name: string; count: number; org?: Organization } } = {};
    for (const item of droppedItems) {
      const mat = getMaterial(item.materialId);
      if (!mat) continue;
      if (!groups[item.materialId]) {
        groups[item.materialId] = {
          name: mat.name,
          count: 0,
          org: mat.affiliated_organization,
        };
      }
      groups[item.materialId].count++;
    }

    const entries = Object.values(groups);
    const venueName = selectedOrg?.name || 'this venue';

    // Build parts with tapable materials
    const parts = entries.map((g, index) => {
      const plural = g.count > 1 ? 's' : '';
      const org = g.org;
      return {
        text: `${g.count} `,
        materialName: g.name,
        suffix: `${plural}`,
        org: org,
        comma: index < entries.length - 1 ? ', ' : '',
      };
    });

    return {
      parts,
      venue: venueName,
    };
  };

  const summary = getSummaryText();

  return (
    <View style={styles.container}>
      {/* CTA Banner */}
      {totalDropped === 0 && (
        <View style={[styles.ctaBanner, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}>
          <Ionicons name="hand-left-outline" size={24} color={colors.primary} />
          <Text style={[styles.ctaText, { color: colors.primary }]}>
            Tap a material below to drop it here
          </Text>
        </View>
      )}

      {/* Organization Filter */}
      {orgIds.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.filterPill,
              !organizationFilter && styles.filterPillActive,
              { borderColor: colors.border }
            ]}
            onPress={() => setOrganizationFilter(null)}
          >
            <Text style={[styles.filterText, !organizationFilter && styles.filterTextActive, { color: colors.foreground }]}>
              All
            </Text>
          </TouchableOpacity>
          {orgIds.map(id => {
            const mat = materials.find(m => m.affiliated_organization_id === id);
            const isActive = organizationFilter === id;
            return (
              <TouchableOpacity
                key={id}
                style={[
                  styles.filterPill,
                  isActive && styles.filterPillActive,
                  { borderColor: colors.border }
                ]}
                onPress={() => setOrganizationFilter(id)}
              >
                <Text style={[styles.filterText, isActive && styles.filterTextActive, { color: colors.foreground }]}>
                  {mat?.affiliated_organization?.name || 'Unknown'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Material Grid */}
      <View style={styles.materialGrid}>
        {filteredMaterials.map((material) => {
          const droppedCount = droppedItems.filter(i => i.materialId === material.id).length;
          const isSelected = selectedMaterial?.id === material.id;
          const remaining = getRemaining(material.id);
          const atMax = isAtMax(material.id);
          
          return (
            <TouchableOpacity
              key={material.id}
              activeOpacity={0.7}
              onPress={() => {
                if (!atMax) {
                  setSelectedMaterial(material);
                  handleDropoff(material);
                }
              }}
              style={[
                styles.materialCard,
                { backgroundColor: colors.card, borderColor: colors.border },
                isSelected && { borderColor: colors.primary, borderWidth: 2 },
                atMax && { opacity: 0.5, borderColor: colors.mutedForeground },
              ]}
              disabled={atMax}
            >
              <View style={styles.materialImageWrapper}>
                {material.image_url ? (
                  <Image source={{ uri: material.image_url }} style={styles.materialImage} resizeMode="cover" />
                ) : (
                  <View style={[styles.materialImagePlaceholder, { backgroundColor: colors.primary + '15' }]}>
                    <Ionicons name="cube-outline" size={32} color={colors.primary} />
                  </View>
                )}
                {droppedCount > 0 && (
                  <View style={[styles.materialBadge, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.materialBadgeText, { color: colors.primaryForeground }]}>
                      {droppedCount}
                    </Text>
                  </View>
                )}
                {atMax && (
                  <View style={[styles.maxBadge, { backgroundColor: colors.danger }]}>
                    <Text style={[styles.maxBadgeText, { color: '#fff' }]}>MAX</Text>
                  </View>
                )}
                {!atMax && remaining > 0 && (
                  <View style={[styles.remainingBadge, { backgroundColor: colors.mutedForeground + '80' }]}>
                    <Text style={[styles.remainingBadgeText, { color: '#fff' }]}>
                      +{remaining}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.materialName, { color: colors.foreground }]} numberOfLines={1}>
                {material.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Drop Zone — Flexbox Grid Layout */}
      <View
        style={[
          styles.dropZone,
          { borderColor: totalDropped > 0 ? colors.success : colors.primary },
          { backgroundColor: totalDropped > 0 ? colors.success + '08' : colors.primary + '06' },
        ]}
      >
        {totalDropped === 0 ? (
          <View style={styles.dropZoneEmpty}>
            <Ionicons name="basketball-outline" size={28} color={colors.mutedForeground} />
            <Text style={[styles.dropZoneLabel, { color: colors.mutedForeground }]}>
              Tap a material to drop it here
            </Text>
          </View>
        ) : (
          <View style={styles.dropZoneFilled}>
            {droppedItems.map((item) => (
              <DropInTile
                key={item.id}
                item={item}
                onRemove={handleRemove}
                getMaterial={getMaterial}
                colors={colors}
              />
            ))}
          </View>
        )}
      </View>

      {/* Control Buttons */}
      {totalDropped > 0 && (
        <View style={styles.controlRow}>
          <TouchableOpacity
            style={[styles.controlBtn, { backgroundColor: colors.danger + '15', borderColor: colors.danger }]}
            onPress={handleClearAll}
          >
            <Ionicons name="trash-outline" size={16} color={colors.danger} />
            <Text style={[styles.controlBtnText, { color: colors.danger }]}>Clear All</Text>
          </TouchableOpacity>
          {droppedItems.length > 1 && (
            <TouchableOpacity
              style={[styles.controlBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}
              onPress={handleKeepOne}
            >
              <Ionicons name="layers-outline" size={16} color={colors.primary} />
              <Text style={[styles.controlBtnText, { color: colors.primary }]}>Keep One Each</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Summary Line — All material names tapable */}
      {summary && (
        <View style={[styles.summaryContainer, { borderTopColor: colors.border }]}>
          <Text style={[styles.summaryText, { color: colors.foreground }]}>
            Dropping{' '}
            {summary.parts.map((part, index) => (
              <Text key={index}>
                {part.text}
                <Text
                  style={[
                    styles.summaryMaterial,
                    { color: colors.primary, textDecorationLine: 'underline' },
                  ]}
                  onPress={() => {
                    if (part.org) {
                      handleOrgPress(part.org);
                    }
                  }}
                >
                  {part.materialName}
                </Text>
                {part.suffix}
                <Text style={{ color: colors.foreground }}>{part.comma}</Text>
              </Text>
            ))}
            <Text style={{ color: colors.foreground }}>
              {' '}at {summary.venue}
            </Text>
          </Text>
        </View>
      )}

      {/* Organization Info Modal — Slides from bottom */}
      <OrgInfoModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        org={modalOrg}
        colors={colors}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  ctaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: 12,
    gap: 8,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 6,
  },
  filterPillActive: {
    backgroundColor: '#3B368C',
    borderColor: '#3B368C',
  },
  filterText: {
    fontSize: 11,
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
  materialGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 6,
  },
  materialCard: {
    width: '48%',
    borderRadius: 10,
    padding: 6,
    borderWidth: 1,
    alignItems: 'center',
  },
  materialImageWrapper: {
    width: '100%',
    height: 70,
    borderRadius: 6,
    position: 'relative',
    marginBottom: 2,
  },
  materialImage: {
    width: '100%',
    height: 70,
  },
  materialImagePlaceholder: {
    width: '100%',
    height: 70,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  materialName: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },
  materialBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  materialBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  maxBadge: {
    position: 'absolute',
    top: -3,
    left: -3,
    width: 28,
    height: 16,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  maxBadgeText: {
    fontSize: 8,
    fontWeight: '700',
  },
  remainingBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 16,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  remainingBadgeText: {
    fontSize: 8,
    fontWeight: '600',
  },
  dropZone: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    minHeight: 140,
    padding: CONFIG.DROP_ZONE_PADDING,
  },
  dropZoneEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 100,
  },
  dropZoneLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  dropZoneFilled: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    padding: 4,
    minHeight: 120,
    alignContent: 'flex-start',
  },
  droppedTile: {
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
    position: 'relative',
  },
  droppedImage: {
    width: '90%',
    height: '90%',
    borderRadius: 6,
  },
  removeBtn: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(180, 0, 0, 0.85)',
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 12,
  },
  controlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  controlBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  summaryContainer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    flexWrap: 'wrap',
  },
  summaryMaterial: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    width: '100%',
    maxHeight: '70%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalBody: {
    padding: 16,
    gap: 12,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalText: {
    fontSize: 14,
    flex: 1,
  },
  modalTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  modalTypeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});