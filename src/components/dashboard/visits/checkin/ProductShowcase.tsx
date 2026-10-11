// components/ProductShowcase.tsx
import { Organization, Product } from '@/types/models';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { FlatList, Image, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

interface ProductShowcaseProps {
  products: Product[];
  onSelect: (productId: number) => void;
  colors: any;
  selectedOrg: Organization | null;
  onToggle: () => void;
  isVisible: boolean;
}

export const ProductShowcase = ({
  products,
  onSelect,
  colors,
  selectedOrg,
  onToggle,
  isVisible,
}: ProductShowcaseProps) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [organizationFilter, setOrganizationFilter] = useState<number | null>(null);
  const [showProducts, setShowProducts] = useState(isVisible);

  const orgIds = [...new Set(products.map(p => p.organization_id).filter(Boolean))];

  const handleToggle = () => {
    setShowProducts(!showProducts);
    onToggle();
  };

  const filteredProducts = organizationFilter
    ? products.filter(p => p.organization_id === organizationFilter)
    : products;

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'NPR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <>
      {/* Header Toggle */}
      <TouchableOpacity
        style={[styles.toggleHeader, { backgroundColor: '#ffffff', borderColor: colors.border }]}
        onPress={handleToggle}
        activeOpacity={0.8}
      >
        <View style={styles.toggleLeft}>
          <Ionicons name="cash-outline" size={20} color={colors.primary} />
          <Text style={[styles.toggleTitle, { color: colors.foreground }]}>
            Show Products ({products.length})
          </Text>
        </View>
        <View style={styles.toggleRight}>
          <Switch
            value={showProducts}
            onValueChange={handleToggle}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={showProducts ? colors.primaryForeground : colors.primaryForeground}
          />
        </View>
      </TouchableOpacity>

      {showProducts && (
        <View style={[styles.content, { borderColor: colors.border }]}>
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
                const product = products.find(p => p.organization_id === id);
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
                      {product?.organization?.name || 'Unknown'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Product Grid */}
          {filteredProducts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={32} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No products available
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredProducts}
              keyExtractor={(item) => item.id.toString()}
              numColumns={2}
              columnWrapperStyle={styles.productRow}
              renderItem={({ item }) => {
                const isSelected = selectedProduct?.id === item.id;
                const metadata = item.metadata || {};
                const tags = [];

                if (metadata.popularity === 'most_popular') tags.push('🔥 Most Popular');
                if (metadata.tier) tags.push(metadata.tier);

                return (
                  <TouchableOpacity
                    style={[
                      styles.productCard,
                      { backgroundColor: colors.card, borderColor: colors.border },
                      isSelected && { borderColor: colors.primary, borderWidth: 2 },
                    ]}
                    onPress={() => {
                      setSelectedProduct(item);
                      onSelect(item.id);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.productImageWrapper}>
                      {item.image_url ? (
                        <Image source={{ uri: item.image_url }} style={styles.productImage} resizeMode="cover" />
                      ) : (
                        <View style={[styles.productImagePlaceholder, { backgroundColor: colors.primary + '15' }]}>
                          <Ionicons name="cube-outline" size={32} color={colors.primary} />
                        </View>
                      )}
                      {tags.length > 0 && (
                        <View style={[styles.productTag, { backgroundColor: colors.primary }]}>
                          <Text style={[styles.productTagText, { color: colors.primaryForeground }]}>
                            {tags[0]}
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text style={[styles.productName, { color: colors.foreground }]} numberOfLines={2}>
                      {item.name}
                    </Text>

                    <View style={styles.productPriceRow}>
                      <Text style={[styles.productPrice, { color: colors.foreground }]}>
                        {formatPrice(item.price)}
                        <Text style={[styles.productPriceUnit, { color: colors.mutedForeground }]}>
                          /{item.unit || 'mo'}
                        </Text>
                      </Text>
                    </View>

                    {item.description && (
                      <Text style={[styles.productDescription, { color: colors.mutedForeground }]} numberOfLines={2}>
                        {item.description}
                      </Text>
                    )}

                    {metadata.setup_fee && (
                      <View style={[styles.setupFeeBadge, { backgroundColor: colors.success + '15' }]}>
                        <Text style={[styles.setupFeeText, { color: colors.success }]}>
                          Setup: {formatPrice(metadata.setup_fee)}
                        </Text>
                      </View>
                    )}

                    {isSelected && (
                      <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
                        <Ionicons name="checkmark" size={12} color={colors.primaryForeground} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  toggleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  toggleRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 10,
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
  productRow: {
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  productCard: {
    width: '48%',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    position: 'relative',
  },
  productImageWrapper: {
    width: '100%',
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 6,
  },
  productImage: {
    width: '100%',
    height: 80,
  },
  productImagePlaceholder: {
    width: '100%',
    height: 80,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productTag: {
    position: 'absolute',
    top: 4,
    left: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  productTagText: {
    fontSize: 8,
    fontWeight: '700',
  },
  productName: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  productPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 13,
    fontWeight: '700',
  },
  productPriceUnit: {
    fontSize: 10,
    fontWeight: '400',
  },
  productDescription: {
    fontSize: 9,
    marginTop: 2,
  },
  setupFeeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  setupFeeText: {
    fontSize: 8,
    fontWeight: '600',
  },
  selectedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 12,
    marginTop: 6,
  },
});