// src/styles/typography.ts
import { StyleSheet } from 'react-native';

export const typography = StyleSheet.create({
  // Headings
  h1: {
    fontFamily: 'JosefinSans-Bold',
    fontSize: 32,
    lineHeight: 40,
  },
  h2: {
    fontFamily: 'JosefinSans-Bold',
    fontSize: 28,
    lineHeight: 36,
  },
  h3: {
    fontSize: 24,
    lineHeight: 32,
  },
  h4: {
    fontSize: 20,
    lineHeight: 28,
  },
  h5: {
    fontSize: 18,
    lineHeight: 24,
  },
  h6: {
    fontSize: 16,
    lineHeight: 22,
  },
  
  // Body
  body1: {
    fontSize: 16,
    lineHeight: 24,
  },
  body2: {
    fontSize: 14,
    lineHeight: 20,
  },
  body3: {
    fontSize: 12,
    lineHeight: 18,
  },
  
  // Special
  button: {
    fontSize: 16,
    lineHeight: 24,
  },
  buttonSmall: {
    fontSize: 14,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.5,
  },
  overline: {
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});

// Helper function to combine styles
export const withFont = (styles: any) => {
  return { ...styles, fontFamily: 'JosefinSans-Regular' };
};