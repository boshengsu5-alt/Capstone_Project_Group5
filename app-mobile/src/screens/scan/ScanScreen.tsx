import React, { useEffect } from 'react';
import { StyleSheet, Text, View, SafeAreaView, TouchableOpacity, Vibration, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { getAssetByQRCode } from '../../services/assetService';
import { getApprovedBookingForPickup, activateBooking } from '../../services/bookingService';

interface ScanScreenProps {
  onBack?: () => void;
}

export default function ScanScreen({ onBack }: ScanScreenProps) {
  const navigation = useNavigation<any>();
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleScan = async (data: string) => {
    if (isProcessing) return;
    setIsProcessing(true);

    Vibration.vibrate();
    console.log("Scanned QR Code:", data);

    try {
      const asset = await getAssetByQRCode(data);
      if (!asset) {
        Alert.alert("错误", "未找到该二维码对应的设备", [
          { text: "确定", onPress: () => setIsProcessing(false) }
        ]);
        return;
      }

      const booking = await getApprovedBookingForPickup(asset.id);

      if (booking) {
        Alert.alert(
          "确认取货？",
          `是否确认提取该设备？`,
          [
            {
              text: "取消",
              style: "cancel",
              onPress: () => setIsProcessing(false)
            },
            {
              text: "确认",
              onPress: async () => {
                try {
                  await activateBooking(booking.id);
                  Alert.alert("系统提示", "取货成功，请妥善使用设备！", [
                    {
                      text: "确定", onPress: () => {
                        setIsProcessing(false);
                        navigation.goBack();
                      }
                    }
                  ]);
                } catch (err: any) {
                  Alert.alert("取货失败", err.message, [{ text: "确定", onPress: () => setIsProcessing(false) }]);
                }
              }
            }
          ]
        );
      } else {
        setIsProcessing(false);
        navigation.navigate('HomeTab', {
          screen: 'AssetDetailScreen',
          params: { id: asset.id },
        });
      }
    } catch (err: any) {
      Alert.alert("提示", err.message, [{ text: "确定", onPress: () => setIsProcessing(false) }]);
    }
  };

  useEffect(() => {
    // 强行弹出请求权限的框
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission?.granted]);

  if (!permission) {
    // 正在加载权限状态
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    // Permission not granted
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>我们需要相机的权限才能继续</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>授权相机</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← 返回</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.title}>人脸识别 / 扫码</Text>
        <View style={{ width: 60 }} /> {/* 占位以居中标题 */}
      </View>
      <View style={styles.cameraContainer}>
        {/* facing="front" 确保能看到自己的脸 */}
        <CameraView
          style={styles.camera}
          facing="front"
          onBarcodeScanned={({ data }) => handleScan(data)}
        >
          {/* Mask if needed can be placed here */}
        </CameraView>
      </View>
      <View style={styles.hintContainer}>
        <Text style={styles.hintText}>将二维码对准扫描框，自动识别设备信息</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#111',
    zIndex: 10,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  hintContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    backgroundColor: '#000',
  },
  hintText: {
    color: '#A5B4FC',
    fontSize: 14,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  permissionText: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#6200ee',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
