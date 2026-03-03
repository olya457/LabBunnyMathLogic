import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Image,
  Pressable,
  Animated,
  Easing,
  useWindowDimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RootStackParamList } from '../navigation/types';

const BG = require('../assets/hunt_bg.png');
const HERO = require('../assets/hunt_hero.png');
const COOKIE = require('../assets/cookie.png');

export const COOKIES_KEY = 'cookies_total_v1';
export const INITIAL_GIFT = 200;

async function readCookies(): Promise<number | null> {
  try {
    const v = await AsyncStorage.getItem(COOKIES_KEY);
    if (v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

async function writeCookies(n: number) {
  try {
    await AsyncStorage.setItem(COOKIES_KEY, String(n));
  } catch {}
}

export default function HuntScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const isSmall = height < 700;
  const isTiny = height < 620;

  const [cookies, setCookies] = useState(0);

  const heroSize = Math.round(Math.min(420, width * (isTiny ? 0.82 : isSmall ? 0.86 : 0.9)));

  const btnW = Math.round(Math.min(330, width - (isTiny ? 52 : 64)));
  const btnH = isTiny ? 48 : isSmall ? 52 : 58;

  const pillH = isTiny ? 40 : 44;
  const topPadAndroid = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0;
  const topPad = Math.max(10, insets.top + (isTiny ? 4 : 6) + topPadAndroid);

  const heroIn = useRef(new Animated.Value(0)).current;
  const heroFloat = useRef(new Animated.Value(0)).current;
  const btnPulse = useRef(new Animated.Value(0)).current;
  const barFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let alive = true;

    (async () => {
      const stored = await readCookies();
      if (!alive) return;

      if (stored == null) {
        setCookies(INITIAL_GIFT);
        await writeCookies(INITIAL_GIFT);
      } else {
        setCookies(stored);
      }
    })();

    Animated.parallel([
      Animated.timing(barFade, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(heroIn, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(heroFloat, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(heroFloat, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(btnPulse, {
          toValue: 1,
          duration: 650,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(btnPulse, {
          toValue: 0,
          duration: 650,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    floatLoop.start();
    pulseLoop.start();

    return () => {
      alive = false;
      floatLoop.stop();
      pulseLoop.stop();
    };
  }, [heroIn, heroFloat, btnPulse, barFade]);

  const heroStyle = useMemo(() => {
    const opacity = heroIn.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
    const enterY = heroIn.interpolate({ inputRange: [0, 1], outputRange: [22, 0] });
    const enterScale = heroIn.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] });
    const floatY = heroFloat.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });

    return {
      opacity,
      transform: [{ translateY: Animated.add(enterY, floatY) }, { scale: enterScale }],
    };
  }, [heroIn, heroFloat]);

  const btnScale = btnPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] });

  const onStart = () => {
    navigation.navigate('HuntPlay', { level: 1 });
  };

  return (
    <View style={styles.flex}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ImageBackground source={BG} style={styles.bg} resizeMode="cover">
        <SafeAreaView style={styles.safe}>
          <Animated.View
            style={[
              styles.topBar,
              {
                paddingTop: topPad,
                paddingHorizontal: isTiny ? 12 : 14,
                opacity: barFade,
              },
            ]}
          >
            <View style={[styles.titlePill, { height: pillH }]}>
              <Text style={[styles.titleTxt, { fontSize: isTiny ? 13 : 14 }]}>Cookie Hunt</Text>
            </View>

            <View style={[styles.coinsPill, { height: pillH }]}>
              <Image source={COOKIE} style={styles.cookieIcon} resizeMode="contain" />
              <Text style={[styles.coinsTxt, { fontSize: isTiny ? 13 : 14 }]}>{cookies}</Text>
            </View>
          </Animated.View>

          <View
            style={[
              styles.center,
              { paddingBottom: Math.max(16, insets.bottom + 36) }, 
            ]}
          >
            <Animated.View style={[styles.heroWrap, heroStyle]}>
              <Image source={HERO} style={{ width: heroSize, height: heroSize }} resizeMode="contain" />
            </Animated.View>

            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <Pressable onPress={onStart} style={[styles.btn, { width: btnW, height: btnH }]}>
                <Text style={[styles.btnText, { fontSize: isTiny ? 15 : 16 }]}>Open Challenge</Text>
              </Pressable>
            </Animated.View>
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

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  titlePill: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: 'rgba(40, 75, 55, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  titleTxt: { color: '#EAF7E7', fontWeight: '900', letterSpacing: 0.2 },

  coinsPill: {
    minWidth: 104,
    borderRadius: 12,
    backgroundColor: 'rgba(40, 75, 55, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    flexDirection: 'row',
    gap: 8,
  },
  cookieIcon: { width: 18, height: 18 },
  coinsTxt: { color: '#EAF7E7', fontWeight: '900' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  heroWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 14 },

  btn: {
    borderRadius: 14,
    backgroundColor: '#E7D37A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    marginBottom: 14,
  },
  btnText: { color: '#1A1A1A', fontWeight: '900' },
});