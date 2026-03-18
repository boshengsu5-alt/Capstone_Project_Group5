import React, { useState, useEffect, useCallback } from 'react';
import { Alert, StyleSheet, Text, View, StatusBar, TouchableOpacity, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import QRScanner from '../../components/QRScanner';
import { getAssetById } from '../../services/assetService';
import { findApprovedBookingForAsset, activateBooking } from '../../services/bookingService';
import { theme } from '../../theme';

export default function ScanScreen() {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualId, setManualId] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

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
    setManualId('');
  };

  const handleManualSubmit = () => {
    if (!manualId.trim()) {
      Alert.alert('提示', '请输入设备编号');
      return;
    }
    handleScan(manualId.trim());
  };

  // 如果权限被拒绝，或者用户手动切换
  const isPermissionDenied = permission?.status === 'denied' && !permission.granted;

  // 渲染扫码器
  const renderScanner = () => (
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

      {/* 手动输入切换按钮 (在扫码器底部) */}
      <TouchableOpacity
        style={styles.manualSwitchButton}
        onPress={() => setShowManualInput(true)}
      >
        <Ionicons name="create-outline" size={20} color="#fff" />
        <Text style={styles.manualSwitchText}>手动输入编号</Text>
      </TouchableOpacity>
    </View>
  );

  // 渲染手动输入页面
  const renderManualInput = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.manualContainer}
    >
      <ScrollView contentContainerStyle={styles.manualScrollContent}>
        <View style={styles.manualIconContainer}>
          <Ionicons
            name={isPermissionDenied ? "camera-reverse-outline" : "create-outline"}
            size={80}
            color={theme.colors.primary}
          />
        </View>

        <Text style={styles.manualTitle}>
          {isPermissionDenied ? '未获取相机权限' : '手动输入设备编号'}
        </Text>
        <Text style={styles.manualSubtitle}>
          {isPermissionDenied
            ? '由于无法使用相机，请手动输入设备上的编号'
            : '如果扫码遇到困难，请手动输入设备编号'}
        </Text>

        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="输入设备 ID (如: ASSET-001)"
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={manualId}
            onChangeText={setManualId}
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, !manualId.trim() && styles.submitButtonDisabled]}
          onPress={handleManualSubmit}
          disabled={!manualId.trim() || isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>立即查询</Text>
          )}
        </TouchableOpacity>

        {!isPermissionDenied && (
          <TouchableOpacity
            style={styles.backToScanButton}
            onPress={() => setShowManualInput(false)}
          >
            <Text style={styles.backToScanText}>返回扫码</Text>
          </TouchableOpacity>
        )}

        {isPermissionDenied && (
          <TouchableOpacity
            style={styles.requestAgainButton}
            onPress={requestPermission}
          >
            <Text style={styles.requestAgainText}>再次尝试开启相机</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.title}>设备扫码</Text>
        <View style={styles.titleUnderline} />
      </View>

      {(isPermissionDenied || showManualInput) ? renderManualInput() : renderScanner()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    alignItems: 'center',
    backgroundColor: '#000',
    zIndex: 10,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1,
  },
  titleUnderline: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.primary,
    marginTop: 8,
    borderRadius: 2,
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
  manualSwitchButton: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  manualSwitchText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  manualContainer: {
    flex: 1,
    backgroundColor: '#121212',
  },
  manualScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 30,
    paddingTop: 60,
    alignItems: 'center',
  },
  manualIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  manualTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  manualSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  inputWrapper: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 30,
  },
  input: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    color: '#fff',
    fontSize: 18,
    letterSpacing: 1,
  },
  submitButton: {
    width: '100%',
    backgroundColor: theme.colors.primary,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonDisabled: {
    backgroundColor: 'rgba(99, 102, 241, 0.4)',
    shadowOpacity: 0,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backToScanButton: {
    marginTop: 30,
    padding: 10,
  },
  backToScanText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  requestAgainButton: {
    marginTop: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  requestAgainText: {
    color: '#fff',
    fontSize: 14,
  },
});
