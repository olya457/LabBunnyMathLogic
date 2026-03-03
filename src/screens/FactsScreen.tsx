import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Image,
  Animated,
  Easing,
  useWindowDimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BG = require('../assets/hunt_bg.png');
const COOKIE = require('../assets/cookie.png');
const AVATAR = require('../assets/lalubu_light.png');
const COOKIES_KEY = 'cookies_total_v1';
const INITIAL_GIFT = 200;

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

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

const FACTS: string[] = [
  "The brain uses about 20% of the body’s energy while making up only ~2% of its weight.",
  'Solving puzzles improves short-term memory.',
  'People detect mistakes in numbers faster than in words.',
  'Math activates some of the same brain areas as music.',
  'The number π (pi) never ends and never repeats.',
  'The brain processes simple calculations faster when they are presented as a game.',
  'On average, a person makes over 30,000 decisions per day.',
  'Regular logic exercises can help slow age-related memory decline.',
  'A fast finger method for multiplying by 9 was known in the Middle Ages.',
  'The brain loves patterns — that’s why puzzles are so engaging.',
  'Reading numbers activates different brain regions than reading words.',
  'Short daily practice is more effective than long, rare sessions.',
  'Chess and mathematics develop similar strategic thinking skills.',
  'People remember information better when they receive small rewards.',
  'Visual puzzles are solved faster than text-only ones.',
  'Even 5 minutes of daily logic training can produce measurable benefits.',
  'The brain uses more energy when learning something new.',
  'Making mistakes during learning helps build stronger neural connections.',
  'Gamification can increase learning motivation by up to 60%.',
  'The more you train logic, the faster your brain recognizes patterns.',
  'Your brain can process visual information in as little as 13 milliseconds.',
  'Mental math strengthens working memory and attention.',
  'The human brain contains roughly 86 billion neurons.',
  'Learning in short bursts helps improve long-term retention.',
  'Pattern recognition is one of the brain’s fastest cognitive skills.',
  'Doing puzzles regularly can improve focus and concentration.',
  'The brain continues forming new neural connections throughout life.',
  'Solving problems step by step reduces cognitive overload.',
  'Sleep plays a major role in memory consolidation.',
  'Multitasking actually reduces overall accuracy and speed.',
  'The brain prefers visual cues over plain text when learning.',
  'Small wins release dopamine, which boosts motivation.',
  'Repetition strengthens neural pathways in the brain.',
  'Strategic games help improve decision-making speed.',
  'The brain processes familiar patterns much faster than new ones.',
  'Focused attention can significantly improve problem-solving performance.',
  'Even brief mental challenges can activate multiple brain regions.',
  'Curiosity increases the brain’s ability to retain information.',
  'Practicing logic improves cognitive flexibility over time.',
  'Consistent daily training leads to stronger and faster thinking skills.',
];

export default function FactsScreen() {
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();

  const isSmall = H < 740 || W < 360;
  const isTiny = H < 690;

  const padX = clamp(W * 0.04, 12, 18);

  const headerH = clamp(H * 0.06, 40, 46);
  const titleFont = clamp(W * 0.05, 16, 19);
  const coinsFont = clamp(W * 0.06, 18, 22);

  const cardRadius = clamp(W * 0.045, 16, 20);
  const cardPadV = clamp(H * 0.016, 12, 14);
  const cardPadH = clamp(W * 0.04, 14, 18);

  const avatarSize = clamp(W * 0.14, 44, 56);
  const factFont = clamp(W * 0.042, 13, 15);

  const topPad = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0;

  const [cookies, setCookies] = useState(0);

  useFocusEffect(
    useCallback(() => {
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

      return () => {
        alive = false;
      };
    }, [])
  );
  const headIn = useRef(new Animated.Value(0)).current;
  const listIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headIn, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(listIn, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [headIn, listIn]);

  const data = useMemo(() => FACTS.map((t, i) => ({ id: String(i), text: t })), []);

  const renderItem = useCallback(
    ({ item, index }: { item: { id: string; text: string }; index: number }) => {
      const k = Math.min(index, 10);
      const start = k * 0.08;
      const end = start + 0.25;

      const opacity = listIn.interpolate({
        inputRange: [start, end],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      });

      const translateY = listIn.interpolate({
        inputRange: [start, end],
        outputRange: [10, 0],
        extrapolate: 'clamp',
      });

      return (
        <Animated.View
          style={[
            styles.card,
            {
              borderRadius: cardRadius,
              paddingVertical: cardPadV,
              paddingHorizontal: cardPadH,
              marginHorizontal: padX,
              opacity,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={{ width: avatarSize, height: avatarSize, alignItems: 'center', justifyContent: 'center' }}>
            <Image source={AVATAR} style={{ width: avatarSize, height: avatarSize }} resizeMode="contain" />
          </View>

          <View style={{ flex: 1, paddingLeft: clamp(W * 0.03, 10, 14) }}>
            <Text style={[styles.factText, { fontSize: factFont, lineHeight: Math.round(factFont * 1.25) }]}>
              {item.text}
            </Text>
          </View>
        </Animated.View>
      );
    },
    [AVATAR, W, avatarSize, cardPadH, cardPadV, cardRadius, factFont, listIn, padX]
  );

  const listTopGap = clamp(H * 0.03, 18, 22);
  const rowGap = clamp(H * 0.018, 14, 16);
  const bottomSafe = Math.max(insets.bottom, 10);
  const bottomExtra = isTiny ? 110 : isSmall ? 95 : 86; 

  return (
    <View style={styles.flex}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ImageBackground source={BG} style={styles.bg} resizeMode="cover">
        <SafeAreaView style={[styles.safe, { paddingTop: topPad }]} edges={['left', 'right']}>
          <Animated.View
            style={[
              styles.topRow,
              {
                paddingTop: insets.top + 10,
                paddingHorizontal: padX,
                gap: 12,
                opacity: headIn,
                transform: [
                  {
                    translateY: headIn.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-6, 0],
                      extrapolate: 'clamp',
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={[styles.titlePill, { height: headerH }]}>
              <Text style={[styles.titleText, { fontSize: titleFont }]}>Smart Facts</Text>
            </View>

            <View style={[styles.coinsPill, { height: headerH, width: clamp(W * 0.32, 110, 130) }]}>
              <Image
                source={COOKIE}
                style={{ width: clamp(W * 0.05, 18, 20), height: clamp(W * 0.05, 18, 20) }}
                resizeMode="contain"
              />
              <Text style={[styles.coinsText, { fontSize: coinsFont }]}>{cookies}</Text>
            </View>
          </Animated.View>

          <Animated.FlatList
            data={data}
            keyExtractor={(x) => x.id}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingTop: listTopGap,
              paddingBottom: bottomExtra + bottomSafe,
              rowGap,
            }}
            style={{ opacity: listIn }}
          />
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#000' },
  bg: { flex: 1 },
  safe: { flex: 1 },

  topRow: { flexDirection: 'row', alignItems: 'center' },

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
  titleText: {
    color: '#EAF7E7',
    fontWeight: '900',
    letterSpacing: 0.2,
  },

  coinsPill: {
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
  coinsText: {
    color: '#EAF7E7',
    fontWeight: '900',
  },

  card: {
    backgroundColor: 'rgba(155, 215, 230, 0.90)',
    borderWidth: 2,
    borderColor: 'rgba(90, 150, 160, 0.75)',
    flexDirection: 'row',
    alignItems: 'center',
  },

  factText: {
    color: 'rgba(5, 15, 20, 0.90)',
    fontWeight: '700',
  },
});