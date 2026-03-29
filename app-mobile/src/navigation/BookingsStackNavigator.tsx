import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BookingHistoryScreen from '../screens/booking/BookingHistoryScreen';
import ReturnScreen from '../screens/booking/ReturnScreen';
import DamageReportScreen from '../screens/damage/DamageReportScreen';
import CompensationCenterScreen from '../screens/profile/CompensationCenterScreen';
import { useTranslation } from 'react-i18next';

export type BookingsStackParamList = {
  BookingHistory: undefined;
  ReturnScreen: { bookingId: string; assetName?: string };
  DamageReport: { assetId: string; bookingId: string; mode?: 'create' | 'edit' };
  Compensation: { focusCaseId?: string; focusBookingId?: string } | undefined;
};

const Stack = createNativeStackNavigator<BookingsStackParamList>();

export default function BookingsStackNavigator() {
  const { t } = useTranslation();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, headerBackTitle: t('nav.back') }}>
      <Stack.Screen name="BookingHistory" component={BookingHistoryScreen} />
      <Stack.Screen
        name="ReturnScreen"
        component={ReturnScreen}
        options={{ headerShown: true, title: t('nav.returnAsset') }}
      />
      <Stack.Screen
        name="DamageReport"
        component={DamageReportScreen}
        options={{ headerShown: true, title: t('nav.reportDamage') }}
      />
      <Stack.Screen
        name="Compensation"
        component={CompensationCenterScreen}
        options={{ headerShown: true, title: t('nav.compensation') }}
      />
    </Stack.Navigator>
  );
}
