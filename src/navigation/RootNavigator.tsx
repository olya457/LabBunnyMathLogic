import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';

import LoaderScreen from '../screens/LoaderScreen';
import OnboardScreen from '../screens/OnboardScreen';
import MainTabs from './MainTabs';

import MathScreen from '../screens/MathScreen';
import MathPlayScreen from '../screens/MathPlayScreen';

import HuntScreen from '../screens/HuntScreen';
import HuntPlayScreen from '../screens/HuntPlayScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      <Stack.Screen name="Loader" component={LoaderScreen} />
      <Stack.Screen name="Onboard" component={OnboardScreen} />
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="Math" component={MathScreen} />
      <Stack.Screen
        name="MathPlay"
        component={MathPlayScreen}
        options={{ gestureEnabled: false }}
      />

      <Stack.Screen name="Hunt" component={HuntScreen} />
      <Stack.Screen
        name="HuntPlay"
        component={HuntPlayScreen}
        options={{ gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
}