import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Dimensions, Animated, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { useTranslation } from 'react-i18next';

const { width } = Dimensions.get('window');
const SCAN_BOX_SIZE = width * 0.7;

interface QRScannerProps {
  onScan: (data: string) => void;
  isScanning: boolean;
}

export default function QRScanner({ onScan, isScanning }: QRScannerProps) {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isScanning) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: SCAN_BOX_SIZE,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      // 组件卸载或 isScanning 变化时停止动画，防止内存泄漏
      return () => loop.stop();
    } else {
      scanLineAnim.stopAnimation();
    }
  }, [isScanning, scanLineAnim]);

  // 权限现在由父组件 ScanScreen 统一且严密地处理
  // 这里的 onBarcodeScanned 仅在 isScanning 为 true 时激活
  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (isScanning && data) {
      onScan(data);
    }
  };

  // 极度防御：如果 permission 尚未就绪，不渲染 CameraView
  if (!permission?.granted) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        onBarcodeScanned={isScanning ? handleBarcodeScanned : undefined}
      >
        <View style={styles.overlay}>
          {/* Top dark area */}
          <View style={[styles.unfocusedArea, styles.topArea]} />

          <View style={styles.middleRow}>
            {/* Left dark area */}
            <View style={styles.unfocusedArea} />

            {/* Clear scanning box */}
            <View style={styles.scannerBox}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />

              {isScanning && (
                <Animated.View
                  style={[
                    styles.scanLine,
                    { transform: [{ translateY: scanLineAnim }] }
                  ]}
                />
              )}
            </View>

            {/* Right dark area */}
            <View style={styles.unfocusedArea} />
          </View>

          {/* Bottom dark area */}
          <View style={[styles.unfocusedArea, styles.bottomArea]}>
            <Text style={styles.scanText}>
              {!isScanning ? t('scan.processing') : t('scan.prompt')}
            </Text>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.text,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.text,
  },
  overlay: {
    flex: 1,
  },
  unfocusedArea: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  topArea: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 40,
  },
  middleRow: {
    flexDirection: 'row',
    height: SCAN_BOX_SIZE,
  },
  bottomArea: {
    paddingTop: 40,
    alignItems: 'center',
  },
  scannerBox: {
    width: SCAN_BOX_SIZE,
    height: SCAN_BOX_SIZE,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  scanLine: {
    height: 2,
    width: '100%',
    backgroundColor: theme.colors.primary,
    position: 'absolute',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  corner: {
    position: 'absolute',
    width: 25,
    height: 25,
    borderColor: theme.colors.primary,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  scanText: {
    color: theme.colors.background,
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 30,
    lineHeight: 22,
  },
});
