import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProfileScreen from '../screens/profile/ProfileScreen';
import NotificationScreen from '../screens/profile/NotificationScreen';
import NotificationDetailScreen from '../screens/profile/NotificationDetailScreen';
import type { Notification } from '../../../database/types/supabase';

export type ProfileStackParamList = {
  ProfileMain: undefined;
  Notifications: undefined;
  NotificationDetail: { notification: Notification };
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen
        name="Notifications"
        component={NotificationScreen}
        options={{ headerShown: true, title: '消息通知' }}
      />
      <Stack.Screen
        name="NotificationDetail"
        component={NotificationDetailScreen}
        options={{ headerShown: true, title: '通知详情' }}
      />
    </Stack.Navigator>
  );
}
