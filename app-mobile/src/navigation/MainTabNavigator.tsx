import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeStackNavigator from './HomeStackNavigator';
import BookingsStackNavigator from './BookingsStackNavigator';
import ScanScreen from '../screens/scan/ScanScreen';
import ProfileStackNavigator from './ProfileStackNavigator';
import { useNotifications } from '../context/NotificationContext';
import { useTranslation } from 'react-i18next';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  const { unreadCount } = useNotifications();
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'HomeTab') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'BookingsTab') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'ScanTab') {
            iconName = focused ? 'scan-circle' : 'scan-circle-outline';
          } else if (route.name === 'ProfileTab') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeStackNavigator} options={{ title: t('tabs.home') }} />
      <Tab.Screen name="BookingsTab" component={BookingsStackNavigator} options={{ title: t('tabs.bookings') }} />
      <Tab.Screen name="ScanTab" component={ScanScreen} options={{ title: t('tabs.scan') }} />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{
          title: t('tabs.profile'),
          tabBarBadge: unreadCount > 0 ? '' : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#FF3B30',
            minWidth: 10,
            height: 10,
            borderRadius: 5,
            marginTop: 4,
          }
        }}
      />
    </Tab.Navigator>
  );
}
