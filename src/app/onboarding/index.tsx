// app/onboarding/index.tsx — the short welcome tour (English / नेपाली). Opened from the login
// screen or Profile; finishing goes back there. The Guide (app)/guide has the details.
import { IconName } from '@/utils/icons';
import { Logo } from '@/components/common/logo';
import { AppColors } from '@/constants/colors';
import { useAppTheme } from '@/hooks/use-app-theme';
import { typography } from '@/styles/typography';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Href, router, useLocalSearchParams } from 'expo-router';
import { Localized, pick, setLanguage, useLanguage } from '@/utils/language';
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
  title: Localized;
  description: Localized;
  icon: IconName;
  color: string;
}

const TEXT = {
  next: { en: 'Next', ne: 'अर्को' },
  skip: { en: 'Skip', ne: 'छोड्नुहोस्' },
  start: { en: 'Get started', ne: 'सुरु गरौं' },
  done: { en: 'Done', ne: 'सकियो' },
  guide: { en: 'Read the full guide', ne: 'पूरा गाइड पढ्नुहोस्' },
  earn: { en: 'See how you earn, with your numbers', ne: 'आफ्नै अंकसहित कसरी कमाउने हेर्नुहोस्' },
};

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const { colors } = useAppTheme();
  const { width: windowWidth } = useWindowDimensions();
  const styles = createStyles(colors);

  const language = useLanguage();
  const t = (text: Localized) => pick(text, language);
  // Opened from Profile (signed in) or from the login screen: finishing goes back there
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const signedIn = !!returnTo && returnTo.includes('(app)');

  // The current rules in five steps; the Guide has the details
  const slides: OnboardingSlide[] = [
    {
      id: '1',
      title: { en: 'Bring pharmacies on board', ne: 'फार्मेसीलाई जोड्नुहोस्' },
      description: {
        en: 'Visit pharmacies, show them what your program offers, and earn when they sign up and pay.',
        ne: 'फार्मेसी जानुहोस्, प्रोग्रामले के दिन्छ देखाउनुहोस्, र उनीहरू साइन अप गरी भुक्तानी गरेपछि कमाउनुहोस्।',
      },
      icon: 'storefront-outline',
      color: colors.primary,
    },
    {
      id: '2',
      title: { en: 'Check in at every shop', ne: 'हरेक पसलमा चेक-इन' },
      description: {
        en: 'Check in where you are, leave materials and add a shop photo. The pitch kit is right there in the form, and it all works without internet.',
        ne: 'भएकै ठाउँमा चेक-इन गर्नुहोस्, सामग्री छोड्नुहोस् र पसलको फोटो थप्नुहोस्। पिच किट फारममै छ, र इन्टरनेट बिना पनि सबै चल्छ।',
      },
      icon: 'location-outline',
      color: '#10B981',
    },
    {
      id: '3',
      title: { en: 'Leads and your code', ne: 'लिड र तपाईंको कोड' },
      description: {
        en: 'Save interested shops as leads and follow up. They sign up with your code or a link you send. A discount on your code comes out of your commission.',
        ne: 'चासो भएका पसल लिडमा राख्नुहोस् र फलो-अप गर्नुहोस्। उनीहरू तपाईंको कोड वा पठाएको लिंकबाट साइन अप गर्छन्। कोडको छुट तपाईंको कमिसनबाट कटौती हुन्छ।',
      },
      icon: 'pricetag-outline',
      color: colors.secondary,
    },
    {
      id: '4',
      title: { en: 'Earn more as you grow', ne: 'बढ्दै जाँदा बढी कमाइ' },
      description: {
        en: 'Your tier sets your rate, and the rate is locked for each pharmacy you sign. Tiers only go up. Weekly activity adds a bonus to every sale.',
        ne: 'टियरले दर तय गर्छ, र साइन गरेको हरेक फार्मेसीको दर स्थिर रहन्छ। टियर माथि मात्र जान्छ। हप्ताको कामले हरेक बिक्रीमा बोनस थप्छ।',
      },
      icon: 'trophy-outline',
      color: '#F59E0B',
    },
    {
      id: '5',
      title: { en: 'Work together', ne: 'मिलेर काम गर्नुहोस्' },
      description: {
        en: 'Out with another rep? Team up for the day and agree a split together. Sales from that day are shared your way.',
        ne: 'अर्को रेपसँग हुनुहुन्छ? दिनभरका लागि Team up गर्नुहोस् र सँगै भाग तय गर्नुहोस्। त्यो दिनको बिक्री त्यही अनुसार बाँडिन्छ।',
      },
      icon: 'people-outline',
      color: colors.accent,
    },
  ];

  const handleComplete = async () => {
    await AsyncStorage.setItem('hasSeenOnboarding', 'true').catch(() => undefined);
    // Back to where the tour was opened from (Profile or the login screen)
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace((returnTo || '/auth/login') as Href);
    }
  };

  const openGuide = () => router.replace('/(app)/guide');

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
        {t(item.title)}
      </Text>

      <Text style={[typography.body1, styles.description, { color: colors.mutedForeground }]}>
        {t(item.description)}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Logo size="medium" />
      </View>

      {/* English / नेपाली */}
      <TouchableOpacity
        style={[styles.languageButton, { borderColor: colors.primary, backgroundColor: colors.primary + '14' }]}
        onPress={() => setLanguage(language === 'en' ? 'ne' : 'en')}
        accessibilityLabel={language === 'en' ? 'नेपालीमा हेर्नुहोस्' : 'Show in English'}
      >
        <Ionicons name="language" size={14} color={colors.primary} />
        <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>{language === 'en' ? 'ने' : 'EN'}</Text>
      </TouchableOpacity>

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
                {t(signedIn ? TEXT.done : TEXT.start)}
              </Text>
              <Ionicons name="arrow-forward" size={20} color={colors.primaryForeground} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.nextButton, { backgroundColor: colors.primary }]}
              onPress={handleNext}
            >
              <Text style={[typography.button, styles.nextButtonText, { color: colors.primaryForeground }]}>
                {t(TEXT.next)}
              </Text>
              <Ionicons name="arrow-forward" size={20} color={colors.primaryForeground} />
            </TouchableOpacity>
          )}
        </View>

        {/* Last slide, signed in: the Guide has the details. Otherwise: skip the tour. */}
        {/* The earning slide, signed in: open How you earn with the rep's own numbers */}
        {slides[currentIndex]?.id === '4' && signedIn ? (
          <TouchableOpacity style={styles.skipButton} onPress={() => router.replace('/(app)/earn')}>
            <Ionicons name="cash-outline" size={16} color={colors.primary} />
            <Text style={[typography.body2, styles.skipText, { color: colors.primary }]}>{t(TEXT.earn)}</Text>
          </TouchableOpacity>
        ) : currentIndex === slides.length - 1 && signedIn ? (
          <TouchableOpacity style={styles.skipButton} onPress={openGuide}>
            <Ionicons name="book-outline" size={16} color={colors.primary} />
            <Text style={[typography.body2, styles.skipText, { color: colors.primary }]}>{t(TEXT.guide)}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={[typography.body2, styles.skipText, { color: colors.mutedForeground }]}>{t(TEXT.skip)}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    languageButton: {
      position: 'absolute',
      top: 52,
      right: 20,
      zIndex: 11,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 8,
      paddingVertical: 4,
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