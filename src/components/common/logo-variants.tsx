// src/components/LogoVariants.tsx
import React from 'react';
import { Image, View, StyleSheet } from 'react-native';

export function LogoGlow() {
  return (
    <Image
      source={require('@/assets/images/logo-glow.png')}
      style={styles.logo}
      resizeMode="contain"
    />
  );
}

export function LogoDark() {
  return (
    <Image
      source={require('@/assets/images/medicinexp-dark.png')}
      style={styles.logo}
      resizeMode="contain"
    />
  );
}

export function LogoSmall() {
  return (
    <Image
      source={require('@/assets/images/medicinexp-logo-small.png')}
      style={styles.logoSmall}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    width: 120,
    height: 120,
  },
  logoSmall: {
    width: 60,
    height: 60,
  },
});