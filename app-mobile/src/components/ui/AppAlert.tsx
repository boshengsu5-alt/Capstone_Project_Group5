import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { alertManager, AlertConfig, AlertButton } from '../../utils/alertManager';
import { theme } from '../../theme';

/**
 * Global custom alert dialog. Mount once in App.tsx — replaces all Alert.alert() calls.
 * 全局自定义弹窗组件，在 App.tsx 挂载一次，替代所有 Alert.alert()。
 */
export default function AppAlert() {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<AlertConfig>({ title: '' });
  const scaleAnim = useState(new Animated.Value(0.88))[0];
  // 存储待执行的 onPress，等 Modal 完全消失后再调用（避免 iOS 相机冲突）
  const pendingPress = useRef<(() => void) | null>(null);

  useEffect(() => {
    alertManager.register((newConfig) => {
      setConfig(newConfig);
      setVisible(true);
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 200,
        friction: 14,
      }).start();
    });
  }, []);

  const handleButton = (btn?: AlertButton) => {
    pendingPress.current = btn?.onPress ?? null;
    setVisible(false);
    scaleAnim.setValue(0.88);
    // Android 无 onDismiss，用 setTimeout 兜底；iOS 由 onDismiss 接管
    if (Platform.OS === 'android' && btn?.onPress) {
      setTimeout(() => {
        pendingPress.current?.();
        pendingPress.current = null;
      }, 350);
    }
  };

  // iOS 专属：Modal 视图完全从层级移除后触发，此时可安全打开原生相机/相册
  const handleDismiss = () => {
    if (pendingPress.current) {
      pendingPress.current();
      pendingPress.current = null;
    }
  };

  const buttons: AlertButton[] = config.buttons?.length
    ? config.buttons
    : [{ text: '确定', style: 'default' }];

  // 取消按钮排在第一位，主操作排在最后
  const cancelBtn = buttons.find(b => b.style === 'cancel');
  const actionBtns = buttons.filter(b => b.style !== 'cancel');

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={() => handleButton(cancelBtn)} onDismiss={handleDismiss}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.dialog, { transform: [{ scale: scaleAnim }] }]}>

          {/* 标题 */}
          <Text style={styles.title}>{config.title}</Text>

          {/* 消息正文 */}
          {config.message ? (
            <Text style={styles.message}>{config.message}</Text>
          ) : null}

          {/* 操作按钮区 */}
          <View style={styles.buttonArea}>
            {actionBtns.map((btn, i) => (
              <TouchableOpacity
                key={`action-${i}`}
                style={[
                  styles.btnSolid,
                  btn.style === 'destructive' ? styles.btnDanger : styles.btnPrimary,
                ]}
                onPress={() => handleButton(btn)}
                activeOpacity={0.8}
              >
                <Text style={styles.btnSolidText}>{btn.text}</Text>
              </TouchableOpacity>
            ))}

            {/* 取消按钮单独渲染，风格更轻 */}
            {cancelBtn && (
              <TouchableOpacity
                style={styles.btnGhost}
                onPress={() => handleButton(cancelBtn)}
                activeOpacity={0.7}
              >
                <Text style={styles.btnGhostText}>{cancelBtn.text}</Text>
              </TouchableOpacity>
            )}
          </View>

        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  dialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    fontSize: 15,
    color: theme.colors.gray,
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 8,
  },
  buttonArea: {
    marginTop: 24,
    gap: 10,
  },
  // 实色主按钮（确认 / 危险操作）
  btnSolid: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  btnPrimary: {
    backgroundColor: theme.colors.primary,
  },
  btnDanger: {
    backgroundColor: theme.colors.danger,
  },
  btnSolidText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  // 取消按钮（幽灵风格）
  btnGhost: {
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: theme.colors.inputBackground,
  },
  btnGhostText: {
    color: theme.colors.gray,
    fontSize: 15,
    fontWeight: '600',
  },
});
