import React, { useState, useEffect, useCallback } from 'react';
import { Alert, StyleSheet, Text, View, StatusBar, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import QRScanner from '../../components/QRScanner';
import { getAssetById } from '../../services/assetService';
import { findApprovedBookingForAsset, activateBooking } from '../../services/bookingService';
import { theme } from '../../theme';

export default function ScanScreen() {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const [isScanning, setIsScanning] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // 每次页面重新获得焦点时，确保可以扫描
  useEffect(() => {
    if (isFocused) {
      setIsScanning(true);
      setHasError(false);
      setIsProcessing(false);
    }
  }, [isFocused]);

  const handleScan = useCallback(async (data: string) => {
    if (!isScanning || isProcessing) return;

    setIsScanning(false);

    if (!data || data.trim().length < 5) {
      setHasError(true);
      return;
    }

    setIsProcessing(true);

    try {
      // 验证资产是否存在
      const asset = await getAssetById(data);
      if (!asset) {
        setHasError(true);
        setIsProcessing(false);
        return;
      }

      // 检查用户是否有该资产的已审批借用
      const approvedBooking = await findApprovedBookingForAsset(data);

      if (approvedBooking) {
        // 用户有 approved 借用 → 弹窗确认取货激活
        setIsProcessing(false);
        Alert.alert(
          '确认取货',
          `检测到您对「${asset.name}」有一个已审批的借用申请。\n\n确认取货后状态将变为「已借用」，借用周期开始计时。`,
          [
            {
              text: '取消',
              style: 'cancel',
              onPress: () => { setIsScanning(true); },
            },
            {
              text: '确认取货',
              onPress: async () => {
                setIsProcessing(true);
                try {
                  await activateBooking(approvedBooking.id);
                  Alert.alert(
                    '取货成功',
                    `设备「${asset.name}」已成功激活！\n请在 ${approvedBooking.end_date} 前归还。`,
                    [{ text: '好的', onPress: () => { setIsScanning(true); } }]
                  );
                } catch (err: unknown) {
                  const msg = err instanceof Error ? err.message : '激活失败，请重试';
                  Alert.alert('取货失败', msg, [
                    { text: '好的', onPress: () => { setIsScanning(true); } },
                  ]);
                } finally {
                  setIsProcessing(false);
                }
              },
            },
          ]
        );
      } else {
        // 没有 approved 借用 → 跳转到详情页浏览/预约
        setIsProcessing(false);
        navigation.navigate('HomeTab', {
          screen: 'AssetDetailScreen',
          params: { id: data },
        });
      }
    } catch (error) {
      setHasError(true);
      setIsProcessing(false);
    }
  }, [isScanning, isProcessing, navigation]);

  const handleRetry = () => {
    setHasError(false);
    setIsScanning(true);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.title}>设备扫码</Text>
        <Text style={styles.subtitle}>扫码取货或查看资产详情</Text>
      </View>

      <View style={styles.scannerWrapper}>
        <QRScanner onScan={handleScan} isScanning={isScanning && isFocused && !hasError && !isProcessing} />

        {/* 处理中遮罩 */}
        {isProcessing && (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.processingText}>正在查询资产信息...</Text>
          </View>
        )}

        {/* 错误遮罩 */}
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
  processingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 20,
    gap: 16,
  },
  processingText: {
    color: '#fff',
    fontSize: 16,
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
    backgroundColor: theme.colors.primary,
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
