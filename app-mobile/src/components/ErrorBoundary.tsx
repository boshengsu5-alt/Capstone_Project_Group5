import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <Ionicons name="alert-circle-outline" size={60} color={theme.colors.danger || '#ff4d4f'} />
          <Text style={styles.title}>组件崩溃了</Text>

          <Text style={styles.message}>
            由于某些意外原因，此功能暂时无法使用。
          </Text>
          {__DEV__ && (
            <Text style={styles.errorDetail}>{this.state.error?.toString()}</Text>
          )}
          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>尝试通过重启解决</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.authBackground,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.background,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  message: {
    fontSize: 14,
    color: theme.colors.gray,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  errorDetail: {
    fontSize: 12,
    color: theme.colors.danger,
    backgroundColor: 'rgba(239,68,68,0.1)',
    padding: theme.spacing.md - 4,
    borderRadius: theme.spacing.sm,
    width: '100%',
    marginBottom: theme.spacing.lg,
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md - 4,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.spacing.sm,
  },
  buttonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
