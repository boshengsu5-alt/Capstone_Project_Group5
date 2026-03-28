import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/home/HomeScreen';
import CategoryScreen from '../screens/home/CategoryScreen';
import AssetDetailScreen from '../screens/asset/AssetDetailScreen';
import BookingFormScreen from '../screens/booking/BookingFormScreen';
import { useTranslation } from 'react-i18next';

export type HomeStackParamList = {
  HomeScreen: { categoryId?: string } | undefined;
  CategoryScreen: { categoryId?: string } | undefined;
  AssetDetailScreen: { id: string };
  BookingFormScreen: {
    assetId: string;
    assetName: string;
    startDate: string;
    endDate: string;
  };
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStackNavigator() {
  const { t } = useTranslation();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#fff' }, headerBackTitle: t('nav.back') }}>
      <Stack.Screen name="HomeScreen" component={HomeScreen} />
      <Stack.Screen name="CategoryScreen" component={CategoryScreen} options={{ headerShown: true, title: t('nav.category') }} />
      <Stack.Screen name="AssetDetailScreen" component={AssetDetailScreen} options={{ headerShown: true, title: t('nav.assetDetail') }} />
      <Stack.Screen name="BookingFormScreen" component={BookingFormScreen} options={{ headerShown: true, title: t('nav.bookingForm') }} />
    </Stack.Navigator>
  );
}
