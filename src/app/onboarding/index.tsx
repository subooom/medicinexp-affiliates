// app/onboarding/index.tsx
import { IconName } from '@/utils/icons';
import { Logo } from '@/components/common/logo';
import { AppColors } from '@/constants/colors';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  color: string;
}

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const { colors } = useAppTheme();
  const { width: windowWidth } = useWindowDimensions();
  const styles = createStyles(colors);

  const slides: OnboardingSlide[] = [
    {
      id: '1',
      title: 'Earn with Every Visit',
      description: 'Check in at pharmacies, share coupons, and earn commissions on every sale.',
      icon: 'location-outline',
      color: colors.primary,
    },
    {
      id: '2',
      title: 'Share Coupons, Get Paid',
      description: 'Give your unique coupon codes to customers. When they buy, you earn instantly.',
      icon: 'cash-outline',
      color: '#10B981',
    },
    {
      id: '3',
      title: 'Level Up, Earn More',
      description: 'More visits and sales = higher commission rates. Start earning today!',
      icon: 'trophy-outline',
      color: '#F59E0B',
    },
  ];

  const handleComplete = async () => {
    try {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      router.replace('/auth/login');
    } catch (error) {
      console.error('Error saving onboarding status:', error);
      router.replace('/auth/login');
    }
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      
      if (Platform.OS === 'web' && flatListRef.current) {
        try {
          const flatList: any = flatListRef.current;
          const scrollable: any = flatList.getNativeScrollRef?.() || flatList;
          if (scrollable && typeof scrollable.scrollTo === 'function') {
            scrollable.scrollTo({ x: nextIndex * windowWidth, animated: true });
          }
        } catch (e) {
          console.warn('Scroll fallback:', e);
        }
      } else {
        flatListRef.current?.scrollToIndex({ 
          index: nextIndex, 
          animated: true 
        });
      }
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const renderSlide = ({ item }: { item: OnboardingSlide }) => (
    <View style={[styles.slideContainer, { width: windowWidth }]}>
      <View style={[styles.iconContainer, { backgroundColor: item.color + '15' }]}>
        <Ionicons name={item.icon} size={56} color={item.color} />
      </View>

      <Text style={[typography.h2, styles.title, { color: colors.foreground }]}>
        {item.title}
      </Text>

      <Text style={[typography.body1, styles.description, { color: colors.mutedForeground }]}>
        {item.description}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Logo size="medium" />
      </View>

      {/* Carousel */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        onMomentumScrollEnd={(event) => {
          const offsetX = event.nativeEvent.contentOffset.x;
          const index = Math.round(offsetX / windowWidth);
          if (index !== currentIndex && index < slides.length) {
            setCurrentIndex(index);
          }
        }}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: 120 }}
        snapToInterval={windowWidth}
        snapToAlignment="start"
        decelerationRate={Platform.OS === 'web' ? 0.9 : 'fast'}
        removeClippedSubviews={false}
        getItemLayout={(data, index) => ({
          length: windowWidth,
          offset: windowWidth * index,
          index,
        })}
      />

      {/* Fixed Bottom */}
      <View style={[styles.bottomContainer, { backgroundColor: colors.background }]}>
        <View style={styles.paginationContainer}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentIndex ? styles.activeDot : styles.inactiveDot,
                i === currentIndex && { backgroundColor: colors.primary },
              ]}
            />
          ))}
        </View>

        <View style={styles.buttonContainer}>
          {currentIndex === slides.length - 1 ? (
            <TouchableOpacity
              style={[styles.getStartedButton, { backgroundColor: colors.primary }]}
              onPress={handleComplete}
            >
              <Text style={[typography.button, styles.getStartedText, { color: colors.primaryForeground }]}>
                Get Started
              </Text>
              <Ionicons name="arrow-forward" size={20} color={colors.primaryForeground} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.nextButton, { backgroundColor: colors.primary }]}
              onPress={handleNext}
            >
              <Text style={[typography.button, styles.nextButtonText, { color: colors.primaryForeground }]}>
                Next
              </Text>
              <Ionicons name="arrow-forward" size={20} color={colors.primaryForeground} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={[typography.body2, styles.skipText, { color: colors.mutedForeground }]}>
            Skip
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    logoContainer: {
      position: 'absolute',
      top: 48,
      left: 0,
      right: 0,
      zIndex: 10,
      alignItems: 'center',
    },
    slideContainer: {
      flex: 1,
      paddingHorizontal: 32,
      paddingTop: 140,
      alignItems: 'center',
      justifyContent: 'flex-start',
    },
    iconContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 32,
    },
    title: {
      textAlign: 'center',
      marginBottom: 12,
    },
    description: {
      textAlign: 'center',
      lineHeight: 24,
      paddingHorizontal: 8,
      marginBottom: 16,
    },
    bottomContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: 32,
      paddingTop: 16,
      paddingBottom: 32,
    },
    paginationContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginHorizontal: 4,
    },
    activeDot: {
      width: 24,
    },
    inactiveDot: {
      backgroundColor: '#D1D5DB',
    },
    buttonContainer: {
      width: '100%',
    },
    nextButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: 12,
      gap: 8,
    },
    nextButtonText: {
      fontWeight: '600',
    },
    getStartedButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: 12,
      gap: 8,
    },
    getStartedText: {
      fontWeight: '600',
    },
    skipButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      marginTop: 4,
      gap: 2,
    },
    skipText: {
      fontWeight: '500',
    },
  });