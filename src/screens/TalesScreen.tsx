import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Image,
  Pressable,
  StatusBar,
  useWindowDimensions,
  Animated,
  Share,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { TALES } from '../data/tales';

const BG = require('../assets/room_bg.png');
const COOKIE = require('../assets/cookie.png');
const PROJECTOR = require('../assets/projector.png');

const COOKIES_KEY = 'cookies_total_v1';
const INITIAL_GIFT = 200;

export default function TalesScreen() {
  const { width: W, height: H } = useWindowDimensions();
  const [cookies, setCookies] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const isTiny = H < 690;
  const headerH = Math.max(H * 0.06, 46);
  const cardH = isTiny ? 80 : 95;

  const selectedTale = useMemo(
    () => (selectedId ? TALES.find((t) => t.id === selectedId) : undefined),
    [selectedId]
  );

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const stored = await AsyncStorage.getItem(COOKIES_KEY);
        if (stored == null) {
          setCookies(INITIAL_GIFT);
          await AsyncStorage.setItem(COOKIES_KEY, String(INITIAL_GIFT));
        } else {
          setCookies(Number(stored));
        }
      })();
    }, [])
  );

  const onShare = useCallback(async () => {
    if (!selectedTale) return;
    try {
      await Share.share({ message: `${selectedTale.title}\n\n${selectedTale.text}` });
    } catch {}
  }, [selectedTale]);

  return (
    <View style={s.flex}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ImageBackground source={BG} style={s.bg} resizeMode="cover">
        <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
          <View style={[s.headerContainer, { height: headerH }]}>
            <View style={s.titlePill}>
              <Text style={s.titleText}>LabBunny Tales</Text>
            </View>

            <View style={s.coinsPill}>
              <Image source={COOKIE} style={s.cookieIcon} resizeMode="contain" />
              <Text style={s.coinsText}>{cookies}</Text>
            </View>
          </View>
          <Animated.View style={[s.content, { opacity: fadeAnim }]}>
            {selectedTale ? (
              <View style={s.readerWrapper}>
                <View style={s.readerPanel}>
                  <Text style={s.readerTitle}>{selectedTale.title}</Text>
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                    <Text style={s.readerText}>{selectedTale.text}</Text>
                  </ScrollView>
                </View>

                <View style={s.navRow}>
                  <Pressable onPress={onShare} style={s.goldBtn}>
                    <Text style={s.goldIcon}>⤴︎</Text>
                  </Pressable>
                  <Pressable onPress={() => setSelectedId(null)} style={s.goldBtn}>
                    <Text style={s.goldIcon}>← Назад</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <ScrollView 
                contentContainerStyle={s.listPadding} 
                showsVerticalScrollIndicator={false}
              >
                {TALES.map((tale) => (
                  <View key={tale.id} style={[s.card, { height: cardH }]}>
                    <Image source={PROJECTOR} style={s.cardIcon} />
                    <View style={s.cardInfo}>
                      <Text numberOfLines={1} style={s.cardTitle}>{tale.title}</Text>
                      <Pressable 
                        onPress={() => setSelectedId(tale.id)}
                        style={({ pressed }) => [s.openBtn, pressed && s.pressed]}
                      >
                        <Text style={s.openBtnText}>Открыть</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </Animated.View>

        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#000' },
  bg: { flex: 1 },
  safe: { flex: 1 },

  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
    marginTop: 10,
    marginBottom: 10,
  },
  titlePill: {
    flex: 1,
    height: '100%',
    backgroundColor: 'rgba(40, 75, 55, 0.8)',
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  titleText: { color: '#EAF7E7', fontWeight: '900', fontSize: 18 },
  coinsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(40, 75, 55, 0.8)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: '100%',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cookieIcon: { width: 20, height: 20 },
  coinsText: { color: '#EAF7E7', fontWeight: '900', fontSize: 18 },

  content: { flex: 1 },
  listPadding: { paddingHorizontal: 16, paddingBottom: 80, gap: 12 },

  card: {
    flexDirection: 'row',
    backgroundColor: 'rgba(155, 215, 230, 0.95)',
    borderRadius: 20,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#5A96A0',
  },
  cardIcon: { width: 40, height: 40, marginRight: 12 },
  cardInfo: { flex: 1, justifyContent: 'center' },
  cardTitle: { fontWeight: '900', fontSize: 18, color: '#050F14', marginBottom: 6 },
  openBtn: {
    backgroundColor: '#E7D37A',
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  openBtnText: { fontWeight: '900', color: '#1A1A1A' },

  readerWrapper: { flex: 1, paddingHorizontal: 16 },
  readerPanel: {
    flex: 0.8,
    backgroundColor: 'rgba(10, 30, 60, 0.7)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  readerTitle: { color: '#FFF', fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 15 },
  readerText: { color: '#EEE', fontSize: 16, lineHeight: 24, fontWeight: '500' },
  navRow: { flexDirection: 'row', justifyContent: 'center', gap: 15, marginTop: 20 },
  goldBtn: {
    backgroundColor: '#E7D37A',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  goldIcon: { fontWeight: '900', fontSize: 16, color: '#1A1A1A' },

  pressed: { opacity: 0.7, transform: [{ scale: 0.97 }] },
});