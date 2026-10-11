// src/utils/icons.ts
import Ionicons from '@expo/vector-icons/Ionicons';
import { ComponentProps } from 'react';

export type IconName = ComponentProps<typeof Ionicons>['name'];

// Icon names that come from the API (organization types, material types) are plain
// strings. Use the fallback when the name isn't a real Ionicons glyph.
export const toIconName = (name: string | null | undefined, fallback: IconName): IconName =>
  name && name in Ionicons.glyphMap ? (name as IconName) : fallback;
