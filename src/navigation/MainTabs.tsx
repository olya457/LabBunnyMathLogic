import React from 'react';
import { Image, Dimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from './types';

import MathScreen from '../screens/MathScreen';
import HuntScreen from '../screens/HuntScreen';
import RoomScreen from '../screens/RoomScreen';
import FactsScreen from '../screens/FactsScreen';
import TalesScreen from '../screens/TalesScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

const IC_MATH = require('../assets/tab_math.png');
const IC_HUNT = require('../assets/tab_hunt.png');
const IC_ROOM = require('../assets/tab_room.png');
const IC_FACTS = require('../assets/tab_facts.png');
const IC_TALES = require('../assets/tab_tales.png');

function tabIcon(source: any) {
  return ({ focused }: { focused: boolean }) => (
    <Image
      source={source}
      style={{
        width: 26,
        height: 26,
        opacity: focused ? 1 : 0.5,
      }}
      resizeMode="contain"
    />
  );
}

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,

        tabBarStyle: {
          position: 'absolute',
          width: '80%', 
          alignSelf: 'center',
          marginLeft: 40, 

          bottom: 25,
          height: 64,
          borderRadius: 32,
          backgroundColor: '#1E5F52',
          borderTopWidth: 0,
          elevation: 15,
          shadowColor: '#000',
          shadowOpacity: 0.3,
          shadowOffset: { width: 0, height: 8 },
          shadowRadius: 12,
          
          paddingBottom: 0,
        },
        
        tabBarItemStyle: {
          height: 64,
          paddingTop: 10, 
        }
      }}
    >
      <Tab.Screen name="Math" component={MathScreen} options={{ tabBarIcon: tabIcon(IC_MATH) }} />
      <Tab.Screen name="Hunt" component={HuntScreen} options={{ tabBarIcon: tabIcon(IC_HUNT) }} />
      <Tab.Screen name="Room" component={RoomScreen} options={{ tabBarIcon: tabIcon(IC_ROOM) }} />
      <Tab.Screen name="Facts" component={FactsScreen} options={{ tabBarIcon: tabIcon(IC_FACTS) }} />
      <Tab.Screen name="Tales" component={TalesScreen} options={{ tabBarIcon: tabIcon(IC_TALES) }} />
    </Tab.Navigator>
  );
}