import React, { useState, useEffect, useCallback } from 'react';
import { Alert, StyleSheet, Text, View, SafeAreaView, StatusBar, TouchableOpacity } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import QRScanner from '../../components/QRScanner';
import { getAssetById } from '../../services/assetService';

export default function ScanScreen() {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const [isScanning, setIsScanning] = useState(true);

  const [hasError, setHasError] = useState(false);

  // 每次页面重新获得焦点时，确保可以扫描
  useEffect(() => {
    if (isFocused) {
      setIsScanning(true);
      setHasError(false);
    }
  }, [isFocused]);

  const handleScan = useCallback(async (data: string) => {
    if (!isScanning) return;
    
    setIsScanning(false); // 立刻阻止重复扫码
    
    // 如果扫到的二维码数据无效（这里简单判断是否为空或长度不足）
    if (!data || data.trim().length < 5) {
      setHasError(true);
      return;
    }

    try {
      // Data scanned is treated as assetId per current logic
      const asset = await getAssetById(data);
      if (!asset) {
        setHasError(true);
        return;
      }

      // 跳转到 AssetDetailScreen 查看详情
      navigation.navigate('AssetDetailScreen', { id: data });
    } catch (error) {
      setHasError(true);
    }
  }, [isScanning, navigation]);

  const handleRetry = () => {
    setHasError(false);
    setIsScanning(true);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.title}>设备扫码</Text>
        <Text style={styles.subtitle}>快速查看资产详情</Text>
      </View>
      
      <View style={styles.scannerWrapper}>
        <QRScanner onScan={handleScan} isScanning={isScanning && isFocused && !hasError} />
        
        {hasError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>无法识别该二维码，或设备不存在</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Text style={styles.retryText}>重新扫描</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 4,
  },
  scannerWrapper: {
    flex: 1,
    position: 'relative',
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 20,
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#6D28D9', // theme.colors.primary (hardcoded for brevity, though ideally imported from theme)
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
