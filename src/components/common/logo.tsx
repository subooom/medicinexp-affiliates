// src/components/Logo.tsx
import { useAppTheme } from '@/hooks/use-app-theme';
import { useCallback } from 'react';
import { Image, ImageSourcePropType, StyleSheet, Text, View } from 'react-native';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  backdropColor?: 'lighter' | 'darker';
  source?: ImageSourcePropType;
  aspectRatio?: number; // Manual override if needed
}

export function Logo({ 
  size = 'medium', 
  showText = true, 
  backdropColor = 'lighter',
  source = require('@/assets/images/medicinexp-logo.png'),
  aspectRatio = 3, // Default 3:1 ratio (width:height)
}: LogoProps) {
  const { colorScheme, colors } = useAppTheme();
  
  // Size configuration - HEIGHT is the primary dimension
  const sizes = {
    small: 40,
    medium: 50,
    large: 60,
  };

  const imageHeight = sizes[size] || sizes.medium;
  const imageWidth = imageHeight * aspectRatio;

 
  if(backdropColor === 'darker') {
    source = require('@/assets/images/medicinexp-dark.png');
  } else {
    if (colorScheme === 'dark') {
      source = require('@/assets/images/medicinexp-logo.png');
    } else {
      source = require('@/assets/images/medicinexp-logo.png');
    }
  }

 const getSubTextColor =  useCallback(() => {
    let color = '';
      if (colorScheme === 'light') color = colors.primary100;
      if (colorScheme === 'dark') color = colors.primary900;
      if(backdropColor === 'darker') color =  colors.primary100
      else color = colors.primary100
  
      return color;

    }, [backdropColor, colorScheme]
 )


  const subTextColor = getSubTextColor();

  const getFontSizes = () => {
    if (size === 'small') return { main: 14, sub: 9 };
    if (size === 'medium') return { main: 20, sub: 11 };
    if (size === 'large') return { main: 26, sub: 13 };
    return { main: 20, sub: 11 };
  };

  const fontSizes = getFontSizes();

  return (
    <View style={[styles.container, { 
      height: imageHeight,
      width: imageWidth,
    }]}>
      {/* Logo Image */}
      <Image
        source={source}
        style={[
          styles.image,
          {
            width: imageWidth,
            height: imageHeight,
          }
        ]}
        resizeMode="contain"
      />
      
      {/* Text overlay with absolute positioning */}
      {showText && (
        <View style={[styles.textContainer, {
          position: 'absolute',
          bottom: -fontSizes.main - 4, // Position below the image
          left: 0,
          right: 0,
        }]}>
          <View style={styles.subTextContainer}>
            <View style={[styles.dot, { backgroundColor: colors.primary100 }]} />
            <Text style={[
              styles.subText,
              {
                fontSize: fontSizes.sub,
                color: subTextColor,
                letterSpacing: 2,
                lineHeight: fontSizes.sub * 1.2,
              }
            ]}>
              AFFILIATES
            </Text>
            <View style={[styles.dot, { backgroundColor: colors.primary100 }]} />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  image: {
    borderRadius: 4,
    flexShrink: 0,
  },
  textContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  mainText: {
    fontFamily: 'JosefinSans-Bold',
    fontWeight: 'bold',
    letterSpacing: 0.5,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  subTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    gap: 6,
    flexWrap: 'nowrap',
    position: 'absolute',
    top:-36,
    right:9
  },
  subText: {
    fontFamily: 'JosefinSans-Light',
    fontWeight: '600',
    fontSize: 14,
    textTransform: 'uppercase',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    flexShrink: 0,
  },
});