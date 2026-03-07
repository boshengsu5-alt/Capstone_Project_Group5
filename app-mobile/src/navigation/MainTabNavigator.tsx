import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '../screens/home/HomeScreen';
import BookingHistoryScreen from '../screens/booking/BookingHistoryScreen';
import ScanScreen from '../screens/scan/ScanScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator();

// Keep tab navigator state in memory to preserve user session flow between main modules.
// (保持底部导航栏状态在内存中，为了维持移动端主功能模块间的无缝切换体验)
export default function MainTabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                // Dynamically assign ionic icons based on the active route focus state.
                // (根据当前选中状态动态分配实心/空心图标，提供明确的视觉反馈)
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: keyof typeof Ionicons.glyphMap = 'home';

                    if (route.name === 'Home') {
                        iconName = focused ? 'home' : 'home-outline';
                    } else if (route.name === 'Bookings') {
                        iconName = focused ? 'list' : 'list-outline';
                    } else if (route.name === 'Scan') {
                        iconName = focused ? 'scan-circle' : 'scan-circle-outline';
                    } else if (route.name === 'Profile') {
                        iconName = focused ? 'person' : 'person-outline';
                    }

                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: '#6366f1',
                tabBarInactiveTintColor: 'gray',
            })}
        >
            <Tab.Screen name="Home" component={HomeScreen} options={{ title: '首页' }} />
            <Tab.Screen name="Bookings" component={BookingHistoryScreen} options={{ title: '借用记录' }} />
            <Tab.Screen name="Scan" component={ScanScreen} options={{ title: '扫码' }} />
            <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: '我的' }} />
        </Tab.Navigator>
    );
}
