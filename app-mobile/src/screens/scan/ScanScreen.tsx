import React from 'react';
import { StyleSheet, Text, View, SafeAreaView } from 'react-native';
import QRScanner from '../../components/QRScanner';

export default function ScanScreen() {
  const handleScan = (data: string) => {
    console.log("Extracted QR Code Data:", data);
    alert(`扫描成功: ${data}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>设备扫码出库</Text>
      <View style={styles.scannerWrapper}>
        <QRScanner onScan={handleScan} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
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
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanMask: {
    // 这里可以使用一张带透明镂空的视图来实现更好的扫描框效果，目前用边框实现
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#00FF00',
    backgroundColor: 'transparent',
    borderRadius: 16,
  },
  scanHint: {
    color: '#ffffff',
    marginTop: 30,
    fontSize: 16,
    fontWeight: '500',
  },
});
