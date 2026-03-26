import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProfileScreen from '../screens/profile/ProfileScreen';
import NotificationScreen from '../screens/profile/NotificationScreen';
import NotificationDetailScreen from '../screens/profile/NotificationDetailScreen';
import type { Notification } from '../../../database/types/supabase';
import { useTranslation } from 'react-i18next';

export type ProfileStackParamList = {
  ProfileMain: undefined;
  Notifications: undefined;
  NotificationDetail: { notification: Notification };
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStackNavigator() {
  const { t } = useTranslation();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, headerBackTitle: t('nav.back') }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen
        name="Notifications"
        component={NotificationScreen}
        options={{ headerShown: true, title: t('nav.notifications') }}
      />
      <Stack.Screen
        name="NotificationDetail"
        component={NotificationDetailScreen}
        options={{ headerShown: true, title: t('nav.notificationDetail') }}
      />
    </Stack.Navigator>
  );
}
