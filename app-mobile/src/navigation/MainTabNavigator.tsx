import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeStackNavigator from './HomeStackNavigator';
import BookingsStackNavigator from './BookingsStackNavigator';
import ScanScreen from '../screens/scan/ScanScreen';
import ProfileStackNavigator from './ProfileStackNavigator';
import { useNotifications } from '../context/NotificationContext';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  const { unreadCount } = useNotifications();

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
      <Tab.Screen name="HomeTab" component={HomeStackNavigator} options={{ title: '首页' }} />
      <Tab.Screen name="BookingsTab" component={BookingsStackNavigator} options={{ title: '借用记录' }} />
      <Tab.Screen name="ScanTab" component={ScanScreen} options={{ title: '扫码' }} />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{
          title: '我的',
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
