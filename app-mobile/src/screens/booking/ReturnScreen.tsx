import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import PhotoCapture from '../../components/PhotoCapture';

export default function ReturnScreen() {
  const [photoCaptured, setPhotoCaptured] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>归还设备</Text>
        
        <View style={styles.card}>
          <Text style={styles.label}>借用设备：</Text>
          <Text style={styles.value}>Sony A7M4 相机</Text>
        </View>

        <Text style={styles.sectionTitle}>强制拍照</Text>
        <Text style={styles.subtext}>为了明确责任，请拍摄设备现状照片：</Text>
        
        <View style={styles.photoContainer}>
          <PhotoCapture 
            onPhotoCaptured={(uri) => {
              console.log("Photo Captured URI:", uri);
              setPhotoCaptured(true);
            }} 
          />
        </View>

        <TouchableOpacity 
          style={styles.simulateButton} 
          onPress={() => setPhotoCaptured(true)}
        >
          <Text style={styles.simulateText}>模拟拍照成功</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.submitButton, !photoCaptured && styles.disabledButton]} 
          disabled={!photoCaptured}
        >
          <Text style={styles.buttonText}>{photoCaptured ? '确认归还并上传' : '请先完成拍照'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7FD' },
  scroll: { padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, color: '#333' },
  card: { backgroundColor: '#fff', padding: 18, borderRadius: 12, marginBottom: 20, flexDirection: 'row', alignItems: 'center' },
  label: { fontSize: 16, color: '#666' },
  value: { fontSize: 18, fontWeight: 'bold', color: '#222', marginLeft: 10 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8, color: '#333' },
  subtext: { fontSize: 14, color: '#666', marginBottom: 16 },
  photoContainer: { marginBottom: 20 },
  simulateButton: { backgroundColor: '#e0e0e0', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 24 },
  simulateText: { color: '#666', fontWeight: 'bold' },
  submitButton: { backgroundColor: '#6200ee', padding: 16, borderRadius: 8, alignItems: 'center' },
  disabledButton: { backgroundColor: '#cccccc' },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' }
});
