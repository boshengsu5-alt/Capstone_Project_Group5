import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

interface ErrorViewProps {
  message?: string;
  onRetry: () => void;
}

export default function ErrorView({ message = '加载失败，请检查网络连接', onRetry }: ErrorViewProps) {
  return (
    <View style={styles.container}>
      <Ionicons name="cloud-offline-outline" size={64} color={theme.colors.gray} />
      <Text style={styles.errorText}>{message}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <Ionicons name="refresh" size={20} color={theme.colors.background} style={styles.retryIcon} />
        <Text style={styles.retryButtonText}>点击重试</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.colors.background,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 24,
  },
  retryButton: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 99,
    alignItems: 'center',
    elevation: 2,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  retryIcon: {
    marginRight: 8,
  },
  retryButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
