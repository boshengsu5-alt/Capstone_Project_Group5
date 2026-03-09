import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BookingHistoryScreen from '../screens/booking/BookingHistoryScreen';
import ReturnScreen from '../screens/booking/ReturnScreen';
import DamageReportScreen from '../screens/damage/DamageReportScreen';

export type BookingsStackParamList = {
  BookingHistory: undefined;
  ReturnScreen: { bookingId: string };
  DamageReport: { assetId: string; bookingId: string };
};

const Stack = createNativeStackNavigator<BookingsStackParamList>();

export default function BookingsStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BookingHistory" component={BookingHistoryScreen} />
      <Stack.Screen
        name="ReturnScreen"
        component={ReturnScreen}
        options={{ headerShown: true, title: '归还设备' }}
      />
      <Stack.Screen
        name="DamageReport"
        component={DamageReportScreen}
        options={{ headerShown: true, title: '损坏报修' }}
      />
    </Stack.Navigator>
  );
}
