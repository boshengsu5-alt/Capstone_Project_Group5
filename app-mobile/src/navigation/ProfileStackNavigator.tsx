import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProfileScreen from '../screens/profile/ProfileScreen';
import NotificationScreen from '../screens/profile/NotificationScreen';
import NotificationDetailScreen from '../screens/profile/NotificationDetailScreen';
import CreditScoreLogScreen from '../screens/profile/CreditScoreLogScreen';
import ChangePasswordScreen from '../screens/profile/ChangePasswordScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import HelpManualScreen from '../screens/profile/SettingsScreen';
import CompensationCenterScreen from '../screens/profile/CompensationCenterScreen';
import type { Notification } from '../../../database/types/supabase';
import { useTranslation } from 'react-i18next';

export type ProfileStackParamList = {
  ProfileMain: undefined;
  EditProfile: undefined;
  Notifications: undefined;
  NotificationDetail: { notification: Notification };
  CreditScoreLog: undefined;
  ChangePassword: undefined;
  HelpManual: undefined;
  Compensation: { focusCaseId?: string; focusBookingId?: string } | undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStackNavigator() {
  const { t } = useTranslation();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, headerBackTitle: t('nav.back') }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ headerShown: true, title: t('nav.editProfile') }}
      />
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
      <Stack.Screen
        name="CreditScoreLog"
        component={CreditScoreLogScreen}
        options={{ headerShown: true, title: t('nav.creditScoreLog') }}
      />
      <Stack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{ headerShown: true, title: t('nav.changePassword') }}
      />
      <Stack.Screen
        name="HelpManual"
        component={HelpManualScreen}
        options={{ headerShown: true, title: t('nav.helpManual') }}
      />
      <Stack.Screen
        name="Compensation"
        component={CompensationCenterScreen}
        options={{ headerShown: true, title: t('nav.compensation') }}
      />
    </Stack.Navigator>
  );
}
