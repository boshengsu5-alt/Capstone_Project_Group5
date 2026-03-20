import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar } from 'react-native';
import RootNavigator from './src/navigation/RootNavigator';
import { ToastProvider } from './src/context/ToastContext';
import { NotificationProvider } from './src/context/NotificationContext';

export default function App() {
  const [isAppReady, setIsAppReady] = useState(false);
  const fadeAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    // Show splash for 1.5s, then fade out and set isAppReady
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        setIsAppReady(true);
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [fadeAnim]);

  if (!isAppReady) {
    return (
      <Animated.View style={[styles.splashContainer, { opacity: fadeAnim }]}>
        <StatusBar barStyle="light-content" backgroundColor="#1E1B4B" />
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>U</Text>
        </View>
        <Text style={styles.brandName}>UniGear</Text>
        <Text style={styles.slogan}>高校领先的智能租赁仓库</Text>
        <Text style={styles.loadingText}>系统启动中...</Text>
      </Animated.View>
    );
  }

  return (
    <ToastProvider>
      <NotificationProvider>
        <RootNavigator />
        <ExpoStatusBar style="auto" />
      </NotificationProvider>
    </ToastProvider>
  );
}

const styles = StyleSheet.create({
  // Splash Screen Styles
  splashContainer: {
    flex: 1,
    backgroundColor: '#1E1B4B', // Deep premium purple
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#6366F1', // Electric blue/purple
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  logoText: {
    fontSize: 64,
    fontWeight: '900',
    color: '#ffffff',
  },
  brandName: {
    fontSize: 42,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 2,
  },
  slogan: {
    fontSize: 16,
    color: '#A5B4FC',
    marginTop: 12,
    letterSpacing: 1,
  },
  loadingText: {
    position: 'absolute',
    bottom: 50,
    color: '#A5B4FC',
    fontSize: 14,
  }
});
