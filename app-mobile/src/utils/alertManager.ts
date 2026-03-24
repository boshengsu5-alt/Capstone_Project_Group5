// ============================================================
// Alert Manager — 全局弹窗管理器（单例）
// 替代 React Native 原生 Alert，支持 Web + Native，风格统一
// ============================================================

export type AlertButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

export type AlertConfig = {
  title: string;
  message?: string;
  buttons?: AlertButton[];
};

/** 由 AppAlert 组件注册的显示函数 */
let _show: ((config: AlertConfig) => void) | null = null;

export const alertManager = {
  /** AppAlert 组件挂载时注册自己的 show 函数 */
  register(fn: (config: AlertConfig) => void) {
    _show = fn;
  },

  /**
   * Show a custom alert dialog. Works on both web and native.
   * 显示自定义弹窗，兼容 Web 和 Native。
   *
   * @param title - Dialog title. 弹窗标题
   * @param message - Optional body text. 可选正文
   * @param buttons - Action buttons. 操作按钮，默认只有"确定"
   */
  alert(title: string, message?: string, buttons?: AlertButton[]) {
    if (_show) {
      _show({ title, message, buttons });
    }
  },
};
