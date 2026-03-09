import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProfileScreen from '../screens/profile/ProfileScreen';
import NotificationScreen from '../screens/profile/NotificationScreen';

export type ProfileStackParamList = {
  ProfileMain: undefined;
  Notifications: undefined;
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
    </Stack.Navigator>
  );
}
