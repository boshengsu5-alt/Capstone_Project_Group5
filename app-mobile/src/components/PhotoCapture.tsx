import React, { useRef, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Image } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { theme } from '../theme';

interface PhotoCaptureProps {
  onPhotoCaptured: (photoUri: string) => void;
}

export default function PhotoCapture({ onPhotoCaptured }: PhotoCaptureProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  if (!permission) {
    return <View style={styles.container}><Text style={styles.text}>加载相机...</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>需要相机权限才能拍照归还</Text>
        <TouchableOpacity style={styles.actionButton} onPress={requestPermission}>
          <Text style={styles.actionText}>授权相机</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });

        // 使用 expo-image-manipulator 降低画质/压缩尺寸
        const manipResult = await ImageManipulator.manipulateAsync(
          photo.uri,
          [{ resize: { width: 800 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );

        setPreviewUri(manipResult.uri);
        onPhotoCaptured(manipResult.uri);
      } catch (error) {
        console.error("拍照失败", error);
      }
    }
  };

  const retakePicture = () => {
    setPreviewUri(null);
  };

  return (
    <View style={styles.container}>
      {previewUri ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: previewUri }} style={styles.previewImage} />
          <TouchableOpacity style={styles.retakeButton} onPress={retakePicture}>
            <Text style={styles.retakeText}>重新拍摄</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.cameraContainer}>
          <CameraView ref={cameraRef} style={styles.camera} facing="back" />
          <View style={styles.overlay}>
            <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
              <View style={styles.innerButton} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 350,
    width: '100%',
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: { fontSize: 16, color: theme.colors.background, marginBottom: 20 },
  actionButton: { backgroundColor: theme.colors.primary, padding: 12, borderRadius: 8 },
  actionText: { color: theme.colors.background, fontWeight: 'bold' },
  cameraContainer: { flex: 1, width: '100%' },
  camera: { flex: 1 },
  overlay: {
    position: 'absolute',
    bottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: theme.colors.gray,
  },
  innerButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.danger,
  },
  previewContainer: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  retakeButton: {
    position: 'absolute',
    bottom: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retakeText: { color: theme.colors.background, fontSize: 16, fontWeight: 'bold' },
});
