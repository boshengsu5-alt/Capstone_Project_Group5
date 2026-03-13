import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

const { width } = Dimensions.get('window');
const SCAN_BOX_SIZE = width * 0.7;

interface QRScannerProps {
  onScan: (data: string) => void;
  isScanning: boolean;
}

export default function QRScanner({ onScan, isScanning }: QRScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isScanning) {
      Animated.loop(
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
      ).start();
    } else {
      scanLineAnim.stopAnimation();
    }
  }, [isScanning]);

  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.infoText}>正在请求相机权限...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="camera-outline" size={64} color={theme.colors.primary} />
        <Text style={styles.permissionText}>需要相机权限才能扫描二维码</Text>
        <TouchableOpacity style={styles.authButton} onPress={requestPermission}>
          <Text style={styles.authButtonText}>立即授权</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (isScanning && data) {
      onScan(data);
    }
  };

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
              {!isScanning ? "处理中..." : "将二维码对准框内，即可自动识别"}
            </Text>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
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
  infoText: {
    fontSize: 16,
    color: theme.colors.gray,
  },
  permissionText: {
    fontSize: 16,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  authButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: 99,
  },
  authButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
