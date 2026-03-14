import React, { useState } from 'react';
import { Image, ImageProps, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

interface SafeImageProps extends Omit<ImageProps, 'source'> {
  uri?: string | null;
  placeholderIcon?: keyof typeof Ionicons.glyphMap;
  placeholderSize?: number;
}

/**
 * SafeImage Component
 * Demonstrates defensive programming for images.
 * If the image URI is empty or fails to load, it will fallback to a default view with an icon.
 */
export default function SafeImage({ 
  uri, 
  style, 
  placeholderIcon = 'image-outline',
  placeholderSize = 40,
  ...props 
}: SafeImageProps) {
  const [hasError, setHasError] = useState(false);

  if (!uri || hasError) {
    return (
      <View style={[styles.placeholder, style]}>
        <Ionicons name={placeholderIcon} size={placeholderSize} color={theme.colors.gray} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={style}
      onError={(e) => {
        console.warn('Image load error:', e.nativeEvent.error);
        setHasError(true);
      }}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
});
