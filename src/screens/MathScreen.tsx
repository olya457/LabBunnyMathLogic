import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Image,
  Pressable,
  useWindowDimensions,
  Animated,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Math'>;

const BG = require('../assets/math_bg.png');
const BUNNY = require('../assets/bunny_1.png');
const COOKIE = require('../assets/cookie.png');
const COOKIES_KEY = 'cookies_balance_v1'; 
const CURRENT_LEVEL_KEY = 'math_current_level_v1';
const INITIAL_GIFT = 200;

export default function MathScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  
  const [cookies, setCookies] = useState<number>(0);
  const [lastLevel, setLastLevel] = useState<number>(1);
  
  const fade = useRef(new Animated.Value(0)).current;

  const isTiny = height < 620;
  const pillH = isTiny ? 40 : 44;

  const loadGameData = async () => {
    try {
      const storedCookies = await AsyncStorage.getItem(COOKIES_KEY);
      
      if (storedCookies === null) {
        setCookies(INITIAL_GIFT);
        await AsyncStorage.setItem(COOKIES_KEY, String(INITIAL_GIFT));
      } else {
        setCookies(Number(storedCookies));
      }

      const savedLevel = await AsyncStorage.getItem(CURRENT_LEVEL_KEY);
      if (savedLevel !== null) {
        setLastLevel(Number(savedLevel));
      }
    } catch (e) {
      console.error('Failed to load data', e);
    }
  };
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      
      loadGameData();
      
      Animated.timing(fade, { 
        toValue: 1, 
        duration: 400, 
        useNativeDriver: true 
      }).start();

      return () => { alive = false; };
    }, [])
  );

  const handleStartPress = () => {
    navigation.navigate('MathPlay', { 
      level: lastLevel
    });
  };

  return (
    <View style={styles.flex}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ImageBackground source={BG} style={styles.bg} resizeMode="cover">
        <SafeAreaView style={styles.safe} edges={['top']}>
          
          <Animated.View style={[styles.topBar, { opacity: fade, paddingTop: insets.top }]}>
            <View style={[styles.titlePill, { height: pillH }]}>
              <Text style={styles.titleTxt}>Cookie Math</Text>
            </View>

            <View style={[styles.coinsPill, { height: pillH }]}>
              <Image source={COOKIE} style={styles.cookieIcon} resizeMode="contain" />
              <Text style={styles.coinsTxt}>{cookies}</Text>
            </View>
          </Animated.View>

          <View style={styles.content}>
            <Image 
              source={BUNNY} 
              style={{ width: width * 0.7, height: width * 0.7 }} 
              resizeMode="contain" 
            />
            
            <View style={styles.infoBox}>
              <Text style={styles.progressTxt}>
                {lastLevel > 1 ? `Last session: Level ${lastLevel}` : 'Ready to start?'}
              </Text>
            </View>

            <Pressable 
              onPress={handleStartPress} 
              style={({ pressed }) => [
                styles.btn,
                { 
                  transform: [{ scale: pressed ? 0.96 : 1 }],
                  backgroundColor: pressed ? '#D4C06A' : '#E7D37A' 
                }
              ]}
            >
              <Text style={styles.btnText}>
                {lastLevel > 1 ? 'Continue' : 'Begin Experiment'}
              </Text>
            </Pressable>
          </View>
          
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#000' },
  bg: { flex: 1 },
  safe: { flex: 1 },
  topBar: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, alignItems: 'center' },
  titlePill: { flex: 1, borderRadius: 12, backgroundColor: 'rgba(40, 75, 55, 0.6)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  titleTxt: { color: '#EAF7E7', fontWeight: '900', fontSize: 15 },
  coinsPill: { minWidth: 100, borderRadius: 12, backgroundColor: 'rgba(40, 75, 55, 0.6)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  cookieIcon: { width: 20, height: 20 },
  coinsTxt: { color: '#EAF7E7', fontWeight: '900', fontSize: 16 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20 },
  infoBox: { marginBottom: 10 },
  progressTxt: { color: '#FFF', fontWeight: '800', fontSize: 14, opacity: 0.8 },
  btn: { width: '80%', height: 60, borderRadius: 18, backgroundColor: '#E7D37A', alignItems: 'center', justifyContent: 'center', elevation: 6 },
  btnText: { color: '#1A1A1A', fontWeight: '900', fontSize: 20, textTransform: 'uppercase' },
});