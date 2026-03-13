import { Alert, StyleSheet, Text, View, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import QRScanner from '../../components/QRScanner';
import { getAssetById } from '../../services/assetService';

export default function ScanScreen() {
  const navigation = useNavigation<any>();

  const handleScan = async (data: string) => {
    try {
      // Data scanned is treated as assetId per current logic
      const asset = await getAssetById(data);
      if (!asset) {
        Alert.alert('扫描失败', '未找到对应的设备信息，请检查二维码是否有效。');
        return;
      }

      // 跳转到 Home Tab 的 AssetDetailScreen 查看详情
      navigation.navigate('HomeTab', {
        screen: 'AssetDetailScreen',
        params: { id: data },
      });
    } catch (error) {
      Alert.alert('扫描错误', '获取设备信息时出错，请稍后重试。');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>设备扫码出库</Text>
      </View>
      <View style={styles.scannerWrapper}>
        <QRScanner onScan={handleScan} />
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
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#111',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scannerWrapper: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  hintContainer: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  hintText: {
    color: '#A5B4FC',
    fontSize: 14,
  },
});
