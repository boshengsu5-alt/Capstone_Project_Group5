import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/home/HomeScreen';
import CategoryScreen from '../screens/home/CategoryScreen';
import AssetDetailScreen from '../screens/asset/AssetDetailScreen';
import BookingFormScreen from '../screens/booking/BookingFormScreen';

export type HomeStackParamList = {
  HomeScreen: { categoryId?: string } | undefined;
  CategoryScreen: undefined;
  AssetDetailScreen: { id: string };
  BookingFormScreen: {
    assetId: string;
    startDate: string;
    endDate: string;
  };
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#fff' } }}>
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen name="CategoryScreen" component={CategoryScreen} options={{ headerShown: true, title: '分类' }} />
      <Stack.Screen name="AssetDetailScreen" component={AssetDetailScreen} options={{ headerShown: true, title: '物品详情' }} />
      <Stack.Screen name="BookingFormScreen" component={BookingFormScreen} options={{ headerShown: true, title: '借用申请' }} />
    </Stack.Navigator>
  );
}
