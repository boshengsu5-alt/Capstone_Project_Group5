import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar, Image, Easing } from 'react-native';
import RootNavigator from './src/navigation/RootNavigator';
import { ToastProvider } from './src/context/ToastContext';
import { NotificationProvider } from './src/context/NotificationContext';
import AppAlert from './src/components/ui/AppAlert';
import './src/i18n';
import { useTranslation } from 'react-i18next';

export default function App() {
  const { t } = useTranslation();
  const [isAppReady, setIsAppReady] = useState(false);
  const fadeAnim = useState(new Animated.Value(1))[0];
  const pulseAnim = useState(new Animated.Value(0))[0];
  const loadingAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const loadingLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(loadingAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(loadingAnim, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();
    loadingLoop.start();

    // Show the branded splash briefly, then fade out into the app.
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        setIsAppReady(true);
      });
    }, 1600);

    return () => {
      clearTimeout(timer);
      pulseLoop.stop();
      loadingLoop.stop();
    };
  }, [fadeAnim, loadingAnim, pulseAnim]);

  const logoTranslateY = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });
  const logoScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.035],
  });
  const auraScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1.08],
  });
  const auraOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.24, 0.42],
  });
  const loadingShift = loadingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-26, 26],
  });
  const loadingGlow = loadingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  if (!isAppReady) {
    return (
      <Animated.View style={[styles.splashContainer, { opacity: fadeAnim }]}>
        <StatusBar barStyle="light-content" backgroundColor="#0C0F18" />
        <View pointerEvents="none" style={styles.backdrop}>
          <View style={[styles.glowOrb, styles.glowOrbAmber]} />
          <View style={[styles.glowOrb, styles.glowOrbViolet]} />
          <View style={[styles.gridLine, styles.gridLineTop]} />
          <View style={[styles.gridLine, styles.gridLineBottom]} />
        </View>

        <View style={styles.heroContent}>
          <View style={styles.eyebrowBadge}>
            <View style={styles.eyebrowDot} />
            <Text style={styles.eyebrowText}>{t('splash.eyebrow')}</Text>
          </View>

          <Animated.View
            style={[
              styles.logoStage,
              {
                transform: [{ translateY: logoTranslateY }, { scale: logoScale }],
              },
            ]}
          >
            <Animated.View
              style={[
                styles.logoAura,
                {
                  opacity: auraOpacity,
                  transform: [{ scale: auraScale }],
                },
              ]}
            />
            <View style={styles.logoOrbitLarge} />
            <View style={styles.logoOrbitSmall} />
            <Image
              source={require('./assets/adaptive-icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </Animated.View>

          <Text style={styles.brandName}>UniGear</Text>
          <View style={styles.brandDivider} />
          <Text style={styles.slogan}>{t('splash.slogan')}</Text>
        </View>

        <View style={styles.loadingCluster}>
          <Text style={styles.loadingText}>{t('splash.loading')}</Text>
          <View style={styles.loadingTrack}>
            <Animated.View
              style={[
                styles.loadingPulse,
                {
                  opacity: loadingGlow,
                  transform: [{ translateX: loadingShift }],
                },
              ]}
            />
          </View>
        </View>
      </Animated.View>
    );
  }

  return (
    <ToastProvider>
      <NotificationProvider>
        <RootNavigator />
        <AppAlert />
        <ExpoStatusBar style="auto" />
      </NotificationProvider>
    </ToastProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#0C0F18',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  glowOrb: {
    position: 'absolute',
    borderRadius: 999,
  },
  glowOrbAmber: {
    width: 360,
    height: 360,
    top: 110,
    left: -70,
    backgroundColor: 'rgba(244, 193, 79, 0.16)',
  },
  glowOrbViolet: {
    width: 420,
    height: 420,
    right: -130,
    bottom: 180,
    backgroundColor: 'rgba(139, 123, 255, 0.18)',
  },
  gridLine: {
    position: 'absolute',
    left: 28,
    right: 28,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  gridLineTop: {
    top: 136,
  },
  gridLineBottom: {
    bottom: 124,
  },
  heroContent: {
    alignItems: 'center',
    paddingHorizontal: 28,
    marginTop: -48,
  },
  eyebrowBadge: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(244, 193, 79, 0.16)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginBottom: 28,
  },
  eyebrowDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: '#F4C14F',
  },
  eyebrowText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: '#F3D68B',
  },
  logoStage: {
    width: 236,
    height: 236,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  logoAura: {
    position: 'absolute',
    width: 208,
    height: 208,
    borderRadius: 999,
    backgroundColor: 'rgba(114, 97, 255, 0.22)',
  },
  logoOrbitLarge: {
    position: 'absolute',
    width: 226,
    height: 226,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  logoOrbitSmall: {
    position: 'absolute',
    width: 188,
    height: 188,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(244, 193, 79, 0.12)',
  },
  logoImage: {
    width: 168,
    height: 168,
  },
  brandName: {
    fontSize: 46,
    fontWeight: '900',
    color: '#F7F8FC',
    letterSpacing: -1.2,
  },
  brandDivider: {
    width: 76,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#F4C14F',
    marginTop: 18,
    marginBottom: 18,
    opacity: 0.92,
  },
  slogan: {
    fontSize: 16,
    lineHeight: 24,
    color: '#AEB7C8',
    letterSpacing: 0.2,
    textAlign: 'center',
    maxWidth: 300,
  },
  loadingCluster: {
    position: 'absolute',
    left: 32,
    right: 32,
    bottom: 72,
    alignItems: 'center',
  },
  loadingText: {
    color: '#AEB7C8',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 14,
  },
  loadingTrack: {
    width: 132,
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  loadingPulse: {
    width: 52,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#F4C14F',
    marginLeft: 38,
  },
});
