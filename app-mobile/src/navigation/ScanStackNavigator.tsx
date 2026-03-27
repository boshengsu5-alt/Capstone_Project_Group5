import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ScanScreen from '../screens/scan/ScanScreen';
import PickupPhotoScreen from '../screens/scan/PickupPhotoScreen';
import { useTranslation } from 'react-i18next';

export type ScanStackParamList = {
  ScanMain: undefined;
  PickupPhoto: { bookingId: string; assetName: string };
};

const Stack = createNativeStackNavigator<ScanStackParamList>();

export default function ScanStackNavigator() {
  const { t } = useTranslation();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ScanMain" component={ScanScreen} />
      <Stack.Screen
        name="PickupPhoto"
        component={PickupPhotoScreen}
        options={{ headerShown: true, title: t('pickupPhoto.navTitle'), headerBackTitle: t('nav.back') }}
      />
    </Stack.Navigator>
  );
}
