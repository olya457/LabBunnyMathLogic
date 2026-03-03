import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Image,
  Pressable,
  useWindowDimensions,
  Animated,
  Easing,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Math'>;

const BG = require('../assets/math_bg.png');
const BUNNY = require('../assets/bunny_1.png');
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

export default function MathScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const isSmall = height < 700;
  const isTiny = height < 620;

  const [cookies, setCookies] = useState<number>(0);

  const bunnySize = useMemo(() => {
    const base = width * (isTiny ? 0.72 : isSmall ? 0.78 : 0.82);
    return Math.round(Math.max(220, Math.min(360, base)));
  }, [width, isSmall, isTiny]);

  const btnW = Math.round(Math.min(330, width - (isTiny ? 56 : 64)));
  const btnH = isTiny ? 50 : isSmall ? 54 : 58;

  const pillH = isTiny ? 40 : 44;

  const topPadAndroid = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0;
  const topPad = Math.max(10, insets.top + 8 + topPadAndroid);

  const fade = useRef(new Animated.Value(0)).current;
  const bunnyY = useRef(new Animated.Value(18)).current;
  const bunnyS = useRef(new Animated.Value(0.96)).current;
  const btnS = useRef(new Animated.Value(0.98)).current;

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
      Animated.timing(fade, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(bunnyY, {
        toValue: 0,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(bunnyS, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(btnS, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    return () => {
      alive = false;
    };
  }, [fade, bunnyY, bunnyS, btnS]);

  const onStart = () => {
    Animated.sequence([
      Animated.timing(btnS, {
        toValue: 0.98,
        duration: 90,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(btnS, {
        toValue: 1,
        duration: 120,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    navigation.navigate('MathPlay', { level: 1 });
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
                opacity: fade,
              },
            ]}
          >
            <View style={[styles.titlePill, { height: pillH }]}>
              <Text style={[styles.titleTxt, { fontSize: isTiny ? 13 : 14 }]}>Cookie Math</Text>
            </View>

            <View style={[styles.coinsPill, { height: pillH }]}>
              <Image source={COOKIE} style={styles.cookieIcon} resizeMode="contain" />
              <Text style={[styles.coinsTxt, { fontSize: isTiny ? 13 : 14 }]}>{cookies}</Text>
            </View>
          </Animated.View>

          <View style={styles.content}>
            <Animated.View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
                opacity: fade,
                transform: [{ translateY: bunnyY }, { scale: bunnyS }],
              }}
            >
              <Image source={BUNNY} style={{ width: bunnySize, height: bunnySize }} resizeMode="contain" />
            </Animated.View>

            <Animated.View
              style={{
                paddingBottom: Math.max(16, insets.bottom + 36), 
                transform: [{ scale: btnS }],
                opacity: fade,
              }}
            >
              <Pressable onPress={onStart} style={[styles.btn, { width: btnW, height: btnH }]}>
                <Text style={[styles.btnText, { fontSize: isTiny ? 15 : 16 }]}>Begin Experiment</Text>
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
  titleTxt: {
    color: '#EAF7E7',
    fontWeight: '900',
    letterSpacing: 0.2,
  },

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
  coinsTxt: {
    color: '#EAF7E7',
    fontWeight: '900',
  },

  content: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },

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
  btnText: {
    color: '#1A1A1A',
    fontWeight: '900',
  },
});