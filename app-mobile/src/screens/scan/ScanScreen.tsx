import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, StatusBar, TouchableOpacity, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { alertManager } from '../../utils/alertManager';
import { useNavigation, useIsFocused, NavigationProp, ParamListBase } from '@react-navigation/native';
import { useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import QRScanner from '../../components/QRScanner';
import ErrorBoundary from '../../components/ErrorBoundary';
import { getAssetByQrCode, getAssetBySerialNumber } from '../../services/assetService';
import { findApprovedBookingForAsset, findPendingBookingForAsset, activateBooking } from '../../services/bookingService';
import { theme } from '../../theme';

export default function ScanScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualId, setManualId] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  // 每次页面重新获得焦点时，确保可以扫描并检查权限
  useEffect(() => {
    if (isFocused) {
      setIsScanning(true);
      setHasError(false);
      setIsProcessing(false);

      // 如果权限尚未确定，且页面已聚焦，则自动请求权限
      if (permission?.status === 'undetermined') {
        requestPermission();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- 只关心 permission.status 变化，避免 permission 对象引用变化导致无限重执行
  }, [isFocused, permission?.status, requestPermission]);

  const handleScan = useCallback(async (data: string) => {
    if (!isScanning || isProcessing) return;

    setIsScanning(false);

    if (!data || data.trim().length < 5) {
      setHasError(true);
      return;
    }

    setIsProcessing(true);

    try {
      // 用 qr_code 字段查找资产，而非直接用 UUID
      const asset = await getAssetByQrCode(data);
      if (!asset) {
        setHasError(true);
        setIsProcessing(false);
        return;
      }

      // 用真正的 asset.id 查找已审批借用
      const approvedBooking = await findApprovedBookingForAsset(asset.id);

      if (approvedBooking) {
        setIsProcessing(false);

        // 前端先检查是否到了借用开始日期
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startDate = new Date(approvedBooking.start_date);
        startDate.setHours(0, 0, 0, 0);

        if (today < startDate) {
          // 还没到借用日期 → 直接提示，不弹确认取货
          const dateStr = approvedBooking.start_date.slice(0, 10);
          alertManager.alert(
            '未到取货时间',
            `您对「${asset.name}」的借用从 ${dateStr} 开始，请在当天或之后再来扫码取货。`,
            [{ text: '好的', onPress: () => { setIsScanning(true); } }]
          );
        } else {
          // 已到借用日期 → 弹窗确认取货激活
          alertManager.alert(
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
                    alertManager.alert(
                      '取货成功',
                      `设备「${asset.name}」已成功激活！\n请在 ${approvedBooking.end_date} 前归还。`,
                      [{ text: '好的', onPress: () => { setIsScanning(true); } }]
                    );
                  } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : '激活失败，请重试';
                    alertManager.alert('取货失败', msg, [
                      { text: '好的', onPress: () => { setIsScanning(true); } },
                    ]);
                  } finally {
                    setIsProcessing(false);
                  }
                },
              },
            ]
          );
        }
      } else {
        // 没有 approved 借用 → 再查是否有 pending 借用，避免重复预约
        const pendingBooking = await findPendingBookingForAsset(asset.id);
        setIsProcessing(false);

        if (pendingBooking) {
          // 已有待审批的借用 → 提示用户等待，不要重复预约
          alertManager.alert(
            '预约审批中',
            `您对「${asset.name}」的借用申请正在等待管理员审批，请耐心等待。\n\n审批通过后再次扫码即可取货。`,
            [
              {
                text: '查看我的预约',
                onPress: () => {
                  navigation.navigate('BookingsTab', { screen: 'BookingHistory' });
                },
              },
              {
                text: '好的',
                style: 'cancel',
                onPress: () => { setIsScanning(true); },
              },
            ]
          );
        } else {
          // 既没有 approved 也没有 pending → 跳转到详情页发起新预约
          navigation.navigate('HomeTab', {
            screen: 'AssetDetailScreen',
            params: { id: asset.id },
          });
        }
      }
    } catch (error: unknown) {
      console.error('Scan processing failed:', error);
      setHasError(true);
      setIsProcessing(false);
    }
  }, [isScanning, isProcessing, navigation]);

  const handleRetry = () => {
    setHasError(false);
    setIsScanning(true);
    setManualId('');
  };

  const handleManualSubmit = async () => {
    if (!manualId.trim()) {
      alertManager.alert('提示', '请输入设备编号');
      return;
    }

    setIsProcessing(true);
    try {
      // 手动输入按序列号查找，再复用扫码后的业务逻辑
      const asset = await getAssetBySerialNumber(manualId.trim());
      if (!asset) {
        alertManager.alert('未找到设备', `找不到序列号为「${manualId.trim()}」的设备，请检查编号是否正确。`);
        setIsProcessing(false);
        return;
      }
      // 找到后走与扫码相同的流程（用 qr_code 触发 handleScan）
      setIsProcessing(false);
      handleScan(asset.qr_code ?? asset.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '查询失败，请重试';
      alertManager.alert('查询失败', msg);
      setIsProcessing(false);
    }
  };

  // 极其严密的权限判定：只要 status 为 denied，即视为拒绝
  const isPermissionDenied = permission?.status === 'denied';
  // 正在请求中：尚未获得 permission 对象，或者 status 为 undetermined 且尚未授权
  const isPermissionPending = !permission || (permission.status === 'undetermined' && !permission.granted);

  // 渲染扫码器
  const renderScanner = () => (
    <View style={styles.scannerWrapper}>
      <ErrorBoundary
        onReset={() => {
          setIsScanning(true);
          setHasError(false);
          setShowManualInput(false);
        }}
        fallback={
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={60} color={theme.colors.danger} />
            <Text style={styles.errorText}>扫码组件初始化遇到了问题</Text>
            <TouchableOpacity 
              style={styles.retryButton} 
              onPress={() => setShowManualInput(true)}
            >
              <Text style={styles.retryText}>切换到手动输入</Text>
            </TouchableOpacity>
          </View>
        }
      >
        <QRScanner 
          onScan={handleScan} 
          isScanning={isScanning && isFocused && !hasError && !isProcessing} 
        />
      </ErrorBoundary>

      {/* 处理中遮罩 */}
      {isProcessing && (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.processingText}>正在查询资产信息...</Text>
        </View>
      )}

      {/* 识别错误遮罩 */}
      {hasError && (
        <View style={styles.errorContainer}>
          <Ionicons name="close-circle-outline" size={60} color={theme.colors.danger} />
          <Text style={styles.errorText}>无法识别该二维码，或设备不存在</Text>
          <View style={styles.errorButtonRow}>
            <TouchableOpacity style={[styles.inlineButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]} onPress={handleRetry}>
              <Text style={styles.inlineButtonText}>重新扫描</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.inlineButton, { backgroundColor: theme.colors.primary }]} onPress={() => setShowManualInput(true)}>
              <Text style={styles.inlineButtonText}>手动输入</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 手动输入切换按钮 (在扫码器底部) */}
      {!hasError && (
        <TouchableOpacity
          style={styles.manualSwitchButton}
          onPress={() => setShowManualInput(true)}
        >
          <Ionicons name="create-outline" size={20} color="#fff" />
          <Text style={styles.manualSwitchText}>手动输入编号</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // 渲染手动输入页面
  const renderManualInput = () => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.manualContainer}
    >
      <ScrollView contentContainerStyle={styles.manualScrollContent} bounces={false}>
        <View style={styles.manualIconContainer}>
          <Ionicons
            name={isPermissionDenied ? "camera-reverse-outline" : "create-outline"}
            size={80}
            color={theme.colors.primary}
          />
        </View>

        <Text style={styles.manualTitle}>
          {isPermissionDenied ? '相机权限受限' : '手动输入设备编号'}
        </Text>
        <Text style={styles.manualSubtitle}>
          {isPermissionDenied
            ? '由于您拒绝或未开启相机授权，无法使用扫码功能。\n请在下方手动输入设备 ID 以继续。'
            : '如果扫码遇到困难，请在此手动输入设备编号进行查询。'}
        </Text>

        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="输入设备 ID (例如: ASSET-001)"
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

      {/* 
        极其严密的条件判断链：
        1. 先检查是否处于权限申请中的 Loading 状态
        2. 如果被拒绝 (Denied) 或 用户主动要求手动输入 (showManualInput)，展示手动输入界面
        3. 否则展示相机扫码器
      */}
      {isPermissionPending && !showManualInput ? (
        <View style={styles.pendingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.pendingText}>正在准备相机访问...</Text>
        </View>
      ) : (isPermissionDenied || showManualInput) ? (
        renderManualInput()
      ) : (
        renderScanner()
      )}
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
  errorButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  inlineButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  inlineButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
  pendingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  pendingText: {
    color: '#fff',
    marginTop: 15,
    fontSize: 16,
  },
});
