import { alertManager } from './alertManager';
import i18n from '../i18n';

function getRawErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;

  if (error && typeof error === 'object' && 'message' in error && typeof (error as Record<string, unknown>).message === 'string') {
    return (error as Record<string, unknown>).message as string;
  }

  return '';
}

export function getDisplayErrorMessage(error: unknown): string {
  const rawMessage = getRawErrorMessage(error);
  if (!rawMessage) return i18n.t('errors.network');

  if (/用户未登录|请先登录/.test(rawMessage)) {
    return i18n.t('errors.loginRequired');
  }

  if (/该损坏报告已处理完成/.test(rawMessage)) {
    return i18n.t('errors.damageReportClosed');
  }

  if (/failed to retrieve public url/i.test(rawMessage)) {
    return i18n.t('errors.uploadFailed');
  }

  if (/[\u4e00-\u9fa5]/.test(rawMessage)) return rawMessage;

  const errMessage = rawMessage.toLowerCase();

  if (errMessage.includes('credentials') || errMessage.includes('invalid login')) {
    return i18n.t('errors.authFailed');
  }

  if (errMessage.includes('already registered') || errMessage.includes('user already exists')) {
    return i18n.t('errors.accountExists');
  }

  if (
    errMessage.includes('jwt') ||
    errMessage.includes('auth session missing') ||
    errMessage.includes('refresh token') ||
    errMessage.includes('session') ||
    errMessage.includes('not logged in')
  ) {
    return i18n.t('errors.sessionExpired');
  }

  if (
    errMessage.includes('row-level security') ||
    errMessage.includes('permission denied') ||
    errMessage.includes('not allowed') ||
    errMessage.includes('forbidden') ||
    errMessage.includes('unauthorized') ||
    errMessage.includes('insufficient_privilege')
  ) {
    return i18n.t('errors.permissionDenied');
  }

  if (
    errMessage.includes('time conflict') ||
    errMessage.includes('conflict') ||
    errMessage.includes('overlap') ||
    errMessage.includes('already booked') ||
    errMessage.includes('already reserved') ||
    errMessage.includes('selected date') ||
    errMessage.includes('selected period')
  ) {
    return i18n.t('errors.bookingConflict');
  }

  if (
    errMessage.includes('duplicate') ||
    errMessage.includes('already has') ||
    errMessage.includes('pending booking') ||
    errMessage.includes('approved booking')
  ) {
    return i18n.t('errors.duplicateBooking');
  }

  if (
    errMessage.includes('rpc') ||
    errMessage.includes('pgrst') ||
    errMessage.includes('schema cache') ||
    errMessage.includes('create_booking') ||
    errMessage.includes('activate_booking') ||
    errMessage.includes('return_booking')
  ) {
    return i18n.t('errors.serviceUnavailable');
  }

  if (
    errMessage.includes('fetch') ||
    errMessage.includes('network') ||
    errMessage.includes('timeout') ||
    errMessage.includes('failed to fetch')
  ) {
    return i18n.t('errors.network');
  }

  return rawMessage;
}

/**
 * Global API Error Handler
 * Displays user-friendly error messages based on error types and network issues.
 * Prevents red-screen crashes by gracefully catching and alerting.
 */
export function handleApiError(error: unknown, title?: string) {
  const actualTitle = title || i18n.t('errors.prompt');

  alertManager.alert(actualTitle, getDisplayErrorMessage(error));
}
