import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ImageBackground,
  FlatList,
  useWindowDimensions,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboard'>;

const BG = require('../assets/bg1.png');

const ONB_1 = require('../assets/onboard1.png');
const ONB_2 = require('../assets/onboard2.png');
const ONB_3 = require('../assets/onboard3.png');
const ONB_4 = require('../assets/onboard4.png');

type Page = {
  key: string;
  title: string;
  body: string;
  image: any;
  cta: string;
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export default function OnboardScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const isSmall = height < 700;
  const isTiny = height < 620;

  const pages: Page[] = useMemo(
    () => [
      {
        key: 'p1',
        title: 'Train Your Brain Daily',
        body:
          'LabBunny helps you train logic, focus, and flexible thinking through short daily challenges in a fun format.',
        image: ONB_1,
        cta: 'Start Training',
      },
      {
        key: 'p2',
        title: 'Solve Smart Puzzles',
        body:
          'Complete clever cookie equations, build streaks, and sharpen your problem-solving skills step by step.',
        image: ONB_2,
        cta: 'Continue',
      },
      {
        key: 'p3',
        title: 'Enter LabBunny Tales',
        body:
          "Discover thoughtful stories from the lab and follow Bunny’s clever journey step by step.",
        image: ONB_3,
        cta: 'Continue',
      },
      {
        key: 'p4',
        title: 'Grow Your Bunny',
        body:
          'Gather cookies, feed your bunny, and unlock fun accessories as you progress.',
        image: ONB_4,
        cta: "Let’s Go",
      },
    ],
    []
  );

  const listRef = useRef<FlatList<Page>>(null);
  const [index, setIndex] = useState(0);

  const appear = useRef(new Animated.Value(0)).current;

  const panelW = Math.round(Math.min(430, width - (isTiny ? 24 : 34)));
  const heroH = Math.round(
    clamp(height * (isTiny ? 0.44 : isSmall ? 0.48 : 0.52), 260, 560)
  );

  const titleSize = isTiny ? 18 : isSmall ? 20 : 22;
  const bodySize = isTiny ? 13 : 14;
  const bodyLine = isTiny ? 18 : 20;

  const panelRadius = isTiny ? 14 : 16;
  const panelBorder = isTiny ? 1.5 : 2;

  const dotsTop = isTiny ? 8 : 12;
  const btnTop = isTiny ? 10 : 14;

  const buttonH = isTiny ? 46 : isSmall ? 50 : 52;
  const panelTopGap = isTiny ? 8 : isSmall ? 10 : 14;

  useEffect(() => {
    appear.setValue(0);
    Animated.timing(appear, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [index, appear]);

  const goNext = () => {
    if (index < pages.length - 1) {
      const next = index + 1;
      setIndex(next);
      listRef.current?.scrollToIndex({ index: next, animated: true });
      return;
    }
    navigation.replace('MainTabs');
  };

  const renderItem = ({ item }: { item: Page }) => {
    const imgTranslateY = appear.interpolate({
      inputRange: [0, 1],
      outputRange: [16, 0],
    });

    const imgScale = appear.interpolate({
      inputRange: [0, 1],
      outputRange: [0.965, 1],
    });

    const blockTranslateY = appear.interpolate({
      inputRange: [0, 1],
      outputRange: [14, 0],
    });

    const blockOpacity = appear.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

    return (
      <View style={{ width, flex: 1 }}>
        <View style={[styles.heroWrap, { height: heroH }]}>
          <Animated.Image
            source={item.image}
            resizeMode="contain"
            style={[
              styles.heroImg,
              { transform: [{ translateY: imgTranslateY }, { scale: imgScale }] },
            ]}
          />
        </View>

        <View
          style={[
            styles.bottomArea,
            { paddingBottom: Math.max(14, insets.bottom + 10) },
          ]}
        >
          <Animated.View
            style={{
              width: panelW,
              alignItems: 'center',
              opacity: blockOpacity,
              transform: [
                { translateY: blockTranslateY },
                { translateY: 20 }, 
              ],
            }}
          >
            <Text style={[styles.title, { fontSize: titleSize }]} numberOfLines={2}>
              {item.title}
            </Text>

            <View
              style={[
                styles.panel,
                {
                  width: panelW,
                  marginTop: panelTopGap,
                  borderRadius: panelRadius,
                  borderWidth: panelBorder,
                },
              ]}
            >
              <View style={styles.panelInner}>
                <Text style={[styles.body, { fontSize: bodySize, lineHeight: bodyLine }]}>
                  {item.body}
                </Text>
              </View>
            </View>

            <View style={[styles.dotsRow, { marginTop: dotsTop }]}>
              {pages.map((_, di) => (
                <View key={di} style={[styles.dot, di === index && styles.dotActive]} />
              ))}
            </View>

            <Pressable
              onPress={goNext}
              style={[
                styles.btn,
                { width: panelW, height: buttonH, marginTop: btnTop },
              ]}
            >
              <Text style={styles.btnText}>{item.cta}</Text>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    );
  };

  return (
    <ImageBackground source={BG} style={styles.bg} resizeMode="cover">
      <SafeAreaView style={styles.safe}>
        <FlatList
          ref={listRef}
          data={pages}
          keyExtractor={(it) => it.key}
          horizontal
          pagingEnabled
          scrollEnabled={false} 
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => renderItem({ item })}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          initialScrollIndex={0}
          windowSize={3}
          maxToRenderPerBatch={2}
          removeClippedSubviews
          extraData={index}
        />
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1 },

  heroWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  heroImg: {
    width: '100%',
    height: '100%',
  },

  bottomArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 6,
  },

  title: {
    fontWeight: '900',
    color: '#FFD54A',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowRadius: 10,
    textShadowOffset: { width: 0, height: 3 },
  },

  panel: {
    borderColor: 'rgba(255, 204, 80, 0.65)',
    backgroundColor: 'rgba(92, 42, 18, 0.55)',
    overflow: 'hidden',
  },

  panelInner: { padding: 15 },

  body: {
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
  },

  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotActive: {
    width: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },

  btn: {
    borderRadius: 18,
    backgroundColor: '#FFD400',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1A1A1A',
  },
});