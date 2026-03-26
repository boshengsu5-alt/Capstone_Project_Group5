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
import { useTranslation } from 'react-i18next';

export default function ScanScreen() {
  const { t } = useTranslation();
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
            t('scan.notTimeToPickUp'),
            t('scan.notTimeToPickUpMsg', { asset: asset.name, date: dateStr }),
            [{ text: t('scan.ok'), onPress: () => { setIsScanning(true); } }]
          );
        } else {
          // 已到借用日期 → 弹窗确认取货激活
          alertManager.alert(
            t('scan.confirmPickUp'),
            t('scan.confirmPickUpMsg', { asset: asset.name }),
            [
              {
                text: t('scan.cancel'),
                style: 'cancel',
                onPress: () => { setIsScanning(true); },
              },
              {
                text: t('scan.confirmPickUp'),
                onPress: async () => {
                  setIsProcessing(true);
                  try {
                    await activateBooking(approvedBooking.id);
                    alertManager.alert(
                      t('scan.pickUpSuccess'),
                      t('scan.pickUpSuccessMsg', { asset: asset.name, date: approvedBooking.end_date }),
                      [{ text: t('scan.ok'), onPress: () => { setIsScanning(true); } }]
                    );
                  } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : t('scan.pickUpFailedTryAgain');
                    alertManager.alert(t('scan.pickUpFailed'), msg, [
                      { text: t('scan.ok'), onPress: () => { setIsScanning(true); } },
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
            t('scan.pendingBooking'),
            t('scan.pendingBookingMsg', { asset: asset.name }),
            [
              {
                text: t('scan.viewMyBookings'),
                onPress: () => {
                  navigation.navigate('BookingsTab', { screen: 'BookingHistory' });
                },
              },
              {
                text: t('scan.ok'),
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
      alertManager.alert(t('profile.prompt'), t('scan.enterDeviceId'));
      return;
    }

    setIsProcessing(true);
    try {
      // 手动输入按序列号查找，再复用扫码后的业务逻辑
      const asset = await getAssetBySerialNumber(manualId.trim());
      if (!asset) {
        alertManager.alert(t('scan.deviceNotFound'), t('scan.deviceNotFoundMsg', { id: manualId.trim() }));
        setIsProcessing(false);
        return;
      }
      // 找到后走与扫码相同的流程（用 qr_code 触发 handleScan）
      setIsProcessing(false);
      handleScan(asset.qr_code ?? asset.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('scan.queryFailedTryAgain');
      alertManager.alert(t('scan.queryFailed'), msg);
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
            <Text style={styles.errorText}>{t('scan.scannerInitError')}</Text>
            <TouchableOpacity 
              style={styles.retryButton} 
              onPress={() => setShowManualInput(true)}
            >
              <Text style={styles.retryText}>{t('scan.switchToManual')}</Text>
            </TouchableOpacity>
          </View>
        }
      >
        <QRScanner 
          onScan={handleScan} 
          isScanning={isScanning && isFocused && !hasError && !isProcessing} 
        />
      </ErrorBoundary>

      {isProcessing && (
        <View style={styles.processingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.processingText}>{t('scan.queryingAsset')}</Text>
        </View>
      )}

      {hasError && (
        <View style={styles.errorContainer}>
          <Ionicons name="close-circle-outline" size={60} color={theme.colors.danger} />
          <Text style={styles.errorText}>{t('scan.unrecognizedQrCode')}</Text>
          <View style={styles.errorButtonRow}>
            <TouchableOpacity style={[styles.inlineButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]} onPress={handleRetry}>
              <Text style={styles.inlineButtonText}>{t('scan.rescan')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.inlineButton, { backgroundColor: theme.colors.primary }]} onPress={() => setShowManualInput(true)}>
              <Text style={styles.inlineButtonText}>{t('scan.manualInput')}</Text>
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
          <Text style={styles.manualSwitchText}>{t('scan.manualInputTitle')}</Text>
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
          {isPermissionDenied ? t('scan.cameraRestricted') : t('scan.manualInputTitle')}
        </Text>
        <Text style={styles.manualSubtitle}>
          {isPermissionDenied
            ? t('scan.cameraRestrictedMsg')
            : t('scan.scanDifficultyMsg')}
        </Text>

        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder={t('scan.inputIdPlaceholder')}
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
            <Text style={styles.submitButtonText}>{t('scan.queryNow')}</Text>
          )}
        </TouchableOpacity>

        {!isPermissionDenied && (
          <TouchableOpacity
            style={styles.backToScanButton}
            onPress={() => setShowManualInput(false)}
          >
            <Text style={styles.backToScanText}>{t('scan.backToScan')}</Text>
          </TouchableOpacity>
        )}

        {isPermissionDenied && (
          <TouchableOpacity
            style={styles.requestAgainButton}
            onPress={requestPermission}
          >
            <Text style={styles.requestAgainText}>{t('scan.tryCameraAgain')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.title}>{t('scan.title')}</Text>
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
          <Text style={styles.pendingText}>{t('scan.preparingCamera')}</Text>
        </View>
      ) : (isPermissionDenied || showManualInput) ? (
        renderManualInput()
      ) : isFocused ? (
        renderScanner()
      ) : (
        <View style={styles.scannerWrapper} />
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
