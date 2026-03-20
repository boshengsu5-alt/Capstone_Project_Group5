import { Alert } from 'react-native';

/**
 * Global API Error Handler
 * Displays user-friendly error messages based on error types and network issues.
 * Prevents red-screen crashes by gracefully catching and alerting.
 */
export function handleApiError(error: any, title = '提示') {
  // Default elegant fallback message
  let displayMessage = '网络开小差了，请稍后再试';
  
  if (error instanceof Error) {
    const errMessage = error.message.toLowerCase();
    
    // Auth specific error mapping
    if (errMessage.includes('credentials') || errMessage.includes('invalid login')) {
      displayMessage = '邮箱或密码错误，请检查后再试';
    } else if (errMessage.includes('already registered') || errMessage.includes('user already exists')) {
      displayMessage = '该账号已被注册';
    } 
    // Network errors
    else if (errMessage.includes('fetch') || errMessage.includes('network') || errMessage.includes('timeout')) {
      displayMessage = '网络开小差了，请稍后再试';
    } 
    // If the error message contains Chinese characters, it's likely our custom business error
    // (e.g. "时间冲突：该设备在所选日期段内已被预订，请选择其他时间")
    else if (/[\u4e00-\u9fa5]/.test(error.message)) {
      displayMessage = error.message;
    } else {
      // Fallback: show the raw English message so developers can see what's wrong
      displayMessage = error.message;
    }
  } else if (typeof error === 'string') {
    if (/[\u4e00-\u9fa5]/.test(error)) {
      displayMessage = error;
    }
  } else if (error && typeof error === 'object' && typeof error.message === 'string') {
    // Supabase PostgrestError or similar plain-object errors with a message field
    const errMessage = error.message;
    if (/[\u4e00-\u9fa5]/.test(errMessage)) {
      displayMessage = errMessage;
    } else if (errMessage) {
      displayMessage = errMessage;
    }
  }
  
  Alert.alert(title, displayMessage);
}

