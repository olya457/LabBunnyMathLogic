import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Image,
  Pressable,
  useWindowDimensions,
  Modal,
  Share,
  Animated,
  Easing,
  BackHandler,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'MathPlay'>;

const BG = require('../assets/math_play_bg.png');
const COOKIE = require('../assets/cookie.png');
const BUNNY_SMALL = require('../assets/bunny_1.png');
const BUNNY_WIN = require('../assets/bunny_win.png');
const BUNNY_LOSE = require('../assets/bunny_lose.png');

type Option = { label: string; value: number };
type Task = {
  id: string;
  lines: string[];
  questionLine: string;
  options: Option[];
  correctIndex: number;
};

type Level = { level: number; title: string; tasks: Task[] };

const COOKIES_KEY = 'cookies_balance_v1';
const CURRENT_LEVEL_KEY = 'math_current_level_v1';
const CURRENT_TASK_KEY = 'math_current_task_v1';

const INITIAL_GIFT = 200;
const REWARD_CORRECT = 20;

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export default function MathPlayScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const levels = useMemo<Level[]>(() => buildLevels(), []);
  const maxLevel = levels.length;

  const [level, setLevel] = useState(1);
  const [taskIndex, setTaskIndex] = useState(0);
  const [cookies, setCookies] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [showWin, setShowWin] = useState(false);
  const [showLose, setShowLose] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const currentLevelData = levels[clamp(level - 1, 0, maxLevel - 1)];
  const task = currentLevelData.tasks[clamp(taskIndex, 0, currentLevelData.tasks.length - 1)];

  const cardAnim = useRef(new Animated.Value(0)).current;
  const bunnyAnim = useRef(new Animated.Value(0)).current;

  const animateIn = () => {
    cardAnim.setValue(0);
    bunnyAnim.setValue(0);
    Animated.parallel([
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(bunnyAnim, {
        toValue: 1,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  useFocusEffect(
    React.useCallback(() => {
      let alive = true;

      const loadProgress = async () => {
        try {
          const savedCookies = await AsyncStorage.getItem(COOKIES_KEY);
          const cookieVal = savedCookies ? Number(savedCookies) : INITIAL_GIFT;

          const savedLevel = await AsyncStorage.getItem(CURRENT_LEVEL_KEY);
          const savedTask = await AsyncStorage.getItem(CURRENT_TASK_KEY);

          if (!alive) return;

          setCookies(cookieVal);

          const startLevel = route.params?.level ?? (savedLevel ? Number(savedLevel) : 1);
          const startTask = savedTask && !route.params?.level ? Number(savedTask) : 0;

          setLevel(clamp(startLevel, 1, maxLevel));
          setTaskIndex(startTask);
          setIsReady(true);
          animateIn();
        } catch (e) {
          setIsReady(true);
        }
      };

      loadProgress();

      const bh = BackHandler.addEventListener('hardwareBackPress', () => {
        if (showWin || showLose) {
          closeModals();
          return true;
        }
        navigation.goBack();
        return true;
      });

      return () => {
        alive = false;
        bh.remove();
      };
    }, [navigation, showWin, showLose, route.params?.level, maxLevel])
  );

  const saveGameState = async (newLevel: number, newTask: number) => {
    try {
      await AsyncStorage.setItem(CURRENT_LEVEL_KEY, String(newLevel));
      await AsyncStorage.setItem(CURRENT_TASK_KEY, String(newTask));
    } catch (e) {}
  };

  const closeModals = () => {
    setShowWin(false);
    setShowLose(false);
    setLocked(false);
    setSelected(null);
  };

  const onPick = (i: number) => {
    if (locked) return;
    setSelected(i);
    setLocked(true);

    const correct = i === task.correctIndex;

    setTimeout(async () => {
      if (!correct) {
        setShowLose(true);
        return;
      }

      const newCookieCount = cookies + REWARD_CORRECT;
      setCookies(newCookieCount);
      await AsyncStorage.setItem(COOKIES_KEY, String(newCookieCount));

      const isLastTask = taskIndex + 1 >= currentLevelData.tasks.length;

      if (isLastTask) {
        setShowWin(true);
        const next = clamp(level + 1, 1, maxLevel);
        await saveGameState(next, 0);
      } else {
        const nextIdx = taskIndex + 1;
        setTaskIndex(nextIdx);
        setSelected(null);
        setLocked(false);
        animateIn();
        await saveGameState(level, nextIdx);
      }
    }, 420);
  };

  const nextLevel = async () => {
    setShowWin(false);

    const next = level + 1;

    if (next > maxLevel) {
      navigation.goBack();
      return;
    }

    setSelected(null);
    setLocked(false);
    setTaskIndex(0);

    await saveGameState(next, 0);

    navigation.replace('MathPlay', { level: next });
  };

  const resetLevel = () => {
    setTaskIndex(0);
    setSelected(null);
    setLocked(false);
    setShowLose(false);
    animateIn();
    saveGameState(level, 0);
  };

  const goHome = () => {
    closeModals();
    navigation.goBack();
  };

  const shareResult = async (mode: 'win' | 'lose') => {
    const text =
      mode === 'win'
        ? `I completed Level ${level} in Cookie Math! 🍪`
        : `I'm practicing math on Level ${level}! 🍪`;
    try {
      await Share.share({ message: text });
    } catch {}
  };

  const isTiny = height < 620;
  const cardW = Math.round(Math.min(isTiny ? 330 : 360, width - (isTiny ? 44 : 64)));
  const cardH = isTiny ? 128 : height < 700 ? 140 : 160;
  const gap = isTiny ? 10 : 12;
  const btnW = Math.round((cardW - gap) / 2);
  const btnH = isTiny ? 36 : height < 700 ? 38 : 42;
  const bunnySize = isTiny ? 86 : height < 700 ? 96 : 112;

  if (!isReady) return <View style={{ flex: 1, backgroundColor: '#000' }} />;

  return (
    <ImageBackground source={BG} style={styles.bg} resizeMode="cover">
      <SafeAreaView style={styles.safe}>
        <View
          style={[
            styles.topBar,
            { paddingTop: Math.max(10, insets.top + 8), paddingHorizontal: 14 },
          ]}
        >
          <Pressable onPress={() => navigation.goBack()} style={styles.topBtn}>
            <Text style={styles.topBtnTxt}>‹</Text>
          </Pressable>

          <View style={styles.topTitlePill}>
            <Text style={styles.topTitleTxt}>Level {level}</Text>
          </View>

          <View style={styles.topCoinsPill}>
            <Image source={COOKIE} style={styles.cookieIcon} resizeMode="contain" />
            <Text style={styles.topCoinsTxt}>{cookies}</Text>
          </View>
        </View>

        <View style={styles.mid}>
          <Animated.View
            style={[
              styles.card,
              {
                width: cardW,
                height: cardH,
                opacity: cardAnim,
                transform: [
                  {
                    translateY: cardAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [12, 0],
                    }),
                  },
                  {
                    scale: cardAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.98, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            {task.lines.map((t, idx) => (
              <Text key={idx} style={styles.cardLine}>
                {t}
              </Text>
            ))}
            <Text style={[styles.cardLine, { marginTop: 10, fontWeight: '900' }]}>
              {task.questionLine}
            </Text>
          </Animated.View>

          <View style={[styles.answers, { width: cardW, marginTop: 20, gap }]}>
            {task.options.map((opt, i) => {
              const isSel = selected === i;
              const isCorrect = i === task.correctIndex;
              let bgColor = '#F3D76B';
              if (selected !== null) {
                if (isSel) bgColor = isCorrect ? '#84C65A' : '#B01717';
              }
              return (
                <Pressable
                  key={i}
                  disabled={locked}
                  onPress={() => onPick(i)}
                  style={[
                    styles.ansBtn,
                    { width: btnW, height: btnH, backgroundColor: bgColor },
                  ]}
                >
                  <Text style={styles.ansTxt}>{opt.value}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Animated.View
          style={[
            styles.bunnyWrap,
            {
              paddingBottom: Math.max(10, insets.bottom + 8),
              transform: [
                {
                  translateY: bunnyAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                  }),
                },
                {
                  scale: bunnyAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.98, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Image
            source={BUNNY_SMALL}
            style={{ width: bunnySize, height: bunnySize }}
            resizeMode="contain"
          />
        </Animated.View>

        <Modal transparent visible={showWin} animationType="fade">
          <View style={styles.modalBg}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Level Complete!</Text>
              <Text style={styles.modalSub}>Great thinking!</Text>
              <Image source={BUNNY_WIN} style={styles.modalImg} resizeMode="contain" />
              <View style={styles.rewardRow}>
                <Image source={COOKIE} style={styles.cookieSmall} resizeMode="contain" />
                <Text style={styles.rewardTxt}>
                  +{currentLevelData.tasks.length * REWARD_CORRECT}
                </Text>
              </View>
              <View style={styles.modalBtnsRow}>
                <Pressable onPress={() => shareResult('win')} style={styles.shareBtn}>
                  <Text style={styles.shareTxt}>⇪</Text>
                </Pressable>
                <Pressable onPress={nextLevel} style={styles.primaryBtn}>
                  <Text style={styles.primaryTxt}>Continue</Text>
                </Pressable>
                <Pressable onPress={goHome} style={styles.secondaryBtn}>
                  <Text style={styles.secondaryTxt}>Home</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <Modal transparent visible={showLose} animationType="fade">
          <View style={styles.modalBg}>
            <View style={styles.modalCard}>
              <Text style={[styles.modalTitle, { color: '#E04040' }]}>Game Over</Text>
              <Text style={styles.modalSub}>Almost got it!</Text>
              <Image source={BUNNY_LOSE} style={styles.modalImg} resizeMode="contain" />
              <View style={styles.modalBtnsRow}>
                <Pressable onPress={() => shareResult('lose')} style={styles.shareBtn}>
                  <Text style={styles.shareTxt}>⇪</Text>
                </Pressable>
                <Pressable onPress={resetLevel} style={styles.primaryBtn}>
                  <Text style={styles.primaryTxt}>Try Again</Text>
                </Pressable>
                <Pressable onPress={goHome} style={styles.secondaryBtn}>
                  <Text style={styles.secondaryTxt}>Home</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ImageBackground>
  );
}

function buildLevels(): Level[] {
  const toOpts = (nums: number[]) => {
    const labels = ['A', 'B', 'C', 'D'];
    return nums.map((n, i) => ({ label: labels[i], value: n }));
  };

  return [
    {
      level: 1,
      title: 'L1',
      tasks: [
        {
          id: '1-1',
          lines: ['🍪 + 🍪 = ?'],
          questionLine: 'Choose:',
          options: toOpts([2, 3, 4, 1]),
          correctIndex: 0,
        },
        {
          id: '1-2',
          lines: ['🍪 + ⭐ = 5', '🍪 = 2'],
          questionLine: '⭐ = ?',
          options: toOpts([4, 3, 2, 5]),
          correctIndex: 1,
        },
        {
          id: '1-3',
          lines: ['🟦 + 🟦 + 🟦 = 9'],
          questionLine: '🟦 = ?',
          options: toOpts([1, 2, 3, 4]),
          correctIndex: 2,
        },
        {
          id: '1-4',
          lines: ['🍪 + 🟦 = 6', '🟦 = 4'],
          questionLine: '🍪 = ?',
          options: toOpts([3, 2, 4, 1]),
          correctIndex: 1,
        },
      ],
    },
    {
      level: 2,
      title: 'L2',
      tasks: [
        {
          id: '2-1',
          lines: ['🍪 + ⭐ = 6', '🍪 = 2'],
          questionLine: '⭐ = ?',
          options: toOpts([3, 4, 2, 5]),
          correctIndex: 1,
        },
        {
          id: '2-2',
          lines: ['🟦 + 🍪 = 5', '🍪 = 1'],
          questionLine: '🟦 = ?',
          options: toOpts([4, 3, 2, 5]),
          correctIndex: 0,
        },
        {
          id: '2-3',
          lines: ['⭐ + 2 = 7'],
          questionLine: '⭐ = ?',
          options: toOpts([4, 5, 6, 3]),
          correctIndex: 1,
        },
        {
          id: '2-4',
          lines: ['🍪 + 🍪 + 🍪 = 6'],
          questionLine: '🍪 = ?',
          options: toOpts([1, 3, 2, 4]),
          correctIndex: 2,
        },
      ],
    },
    {
      level: 3,
      title: 'L3',
      tasks: [
        {
          id: '3-1',
          lines: ['🟦 + 🟦 + 🟦 = 9'],
          questionLine: '🟦 = ?',
          options: toOpts([2, 4, 3, 5]),
          correctIndex: 2,
        },
        {
          id: '3-2',
          lines: ['🍪 + 🟦 = 7', '🟦 = 5'],
          questionLine: '🍪 = ?',
          options: toOpts([3, 2, 1, 4]),
          correctIndex: 1,
        },
        {
          id: '3-3',
          lines: ['⭐ + 🍪 = 8', '⭐ = 6'],
          questionLine: '🍪 = ?',
          options: toOpts([1, 3, 2, 4]),
          correctIndex: 2,
        },
        {
          id: '3-4',
          lines: ['🟦 + 4 = 10'],
          questionLine: '🟦 = ?',
          options: toOpts([5, 7, 6, 4]),
          correctIndex: 2,
        },
      ],
    },
    {
      level: 4,
      title: 'L4',
      tasks: [
        {
          id: '4-1',
          lines: ['🍪 + ⭐ = 9', '⭐ = 4'],
          questionLine: '🍪 = ?',
          options: toOpts([6, 5, 4, 3]),
          correctIndex: 1,
        },
        {
          id: '4-2',
          lines: ['🟦 + 🍪 = 11', '🍪 = 6'],
          questionLine: '🟦 = ?',
          options: toOpts([4, 5, 6, 7]),
          correctIndex: 1,
        },
        {
          id: '4-3',
          lines: ['⭐ + ⭐ + 🍪 = 10', '⭐ = 3'],
          questionLine: '🍪 = ?',
          options: toOpts([4, 3, 5, 2]),
          correctIndex: 0,
        },
        {
          id: '4-4',
          lines: ['🟦 + 3 = 8'],
          questionLine: '🟦 = ?',
          options: toOpts([6, 5, 4, 3]),
          correctIndex: 1,
        },
      ],
    },
    {
      level: 5,
      title: 'L5',
      tasks: [
        {
          id: '5-1',
          lines: ['🍪 + ⭐ = 12', '⭐ = 7'],
          questionLine: '🍪 = ?',
          options: toOpts([4, 5, 6, 3]),
          correctIndex: 1,
        },
        {
          id: '5-2',
          lines: ['🟦 + 🟦 = 14'],
          questionLine: '🟦 = ?',
          options: toOpts([6, 8, 7, 5]),
          correctIndex: 2,
        },
        {
          id: '5-3',
          lines: ['⭐ + 🍪 + 🍪 = 11', '⭐ = 5'],
          questionLine: '🍪 = ?',
          options: toOpts([2, 4, 3, 5]),
          correctIndex: 2,
        },
        {
          id: '5-4',
          lines: ['🟦 + 5 = 13'],
          questionLine: '🟦 = ?',
          options: toOpts([7, 8, 6, 9]),
          correctIndex: 1,
        },
      ],
    },
    {
      level: 6,
      title: 'L6',
      tasks: [
        {
          id: '6-1',
          lines: ['🍪 + ⭐ = 14', '⭐ = 9'],
          questionLine: '🍪 = ?',
          options: toOpts([4, 5, 6, 3]),
          correctIndex: 1,
        },
        {
          id: '6-2',
          lines: ['🟦 × 2 = 16'],
          questionLine: '🟦 = ?',
          options: toOpts([6, 7, 8, 9]),
          correctIndex: 2,
        },
        {
          id: '6-3',
          lines: ['⭐ + ⭐ + 🍪 = 17', '⭐ = 6'],
          questionLine: '🍪 = ?',
          options: toOpts([5, 4, 6, 3]),
          correctIndex: 0,
        },
        {
          id: '6-4',
          lines: ['🟦 + 🍪 = 13', '🍪 = 5'],
          questionLine: '🟦 = ?',
          options: toOpts([7, 8, 6, 9]),
          correctIndex: 1,
        },
      ],
    },
    {
      level: 7,
      title: 'L7',
      tasks: [
        {
          id: '7-1',
          lines: ['🍪 × 2 = 18'],
          questionLine: '🍪 = ?',
          options: toOpts([8, 9, 7, 6]),
          correctIndex: 1,
        },
        {
          id: '7-2',
          lines: ['⭐ × 3 = 21'],
          questionLine: '⭐ = ?',
          options: toOpts([6, 7, 8, 9]),
          correctIndex: 1,
        },
        {
          id: '7-3',
          lines: ['🟦 + ⭐ = 15', '⭐ = 9'],
          questionLine: '🟦 = ?',
          options: toOpts([6, 5, 7, 8]),
          correctIndex: 0,
        },
        {
          id: '7-4',
          lines: ['🍪 + 🟦 + ⭐ = 20', '🍪 = 6, 🟦 = 5'],
          questionLine: '⭐ = ?',
          options: toOpts([7, 8, 9, 6]),
          correctIndex: 2,
        },
      ],
    },
    {
      level: 8,
      title: 'L8',
      tasks: [
        {
          id: '8-1',
          lines: ['⭐ + 🍪 = 13', '🍪 = 8'],
          questionLine: '⭐ = ?',
          options: toOpts([4, 5, 6, 7]),
          correctIndex: 1,
        },
        {
          id: '8-2',
          lines: ['🟦 × 3 = 24'],
          questionLine: '🟦 = ?',
          options: toOpts([6, 7, 8, 9]),
          correctIndex: 2,
        },
        {
          id: '8-3',
          lines: ['🍪 × 2 + ⭐ = 19', '🍪 = 7'],
          questionLine: '⭐ = ?',
          options: toOpts([4, 5, 6, 3]),
          correctIndex: 1,
        },
        {
          id: '8-4',
          lines: ['🟦 + 🍪 = 18', '🟦 = 10'],
          questionLine: '🍪 = ?',
          options: toOpts([7, 8, 6, 9]),
          correctIndex: 1,
        },
      ],
    },
    {
      level: 9,
      title: 'L9',
      tasks: [
        {
          id: '9-1',
          lines: ['⭐ × 2 + 🍪 = 17', '⭐ = 6'],
          questionLine: '🍪 = ?',
          options: toOpts([4, 5, 6, 3]),
          correctIndex: 1,
        },
        {
          id: '9-2',
          lines: ['🟦 × 2 = ⭐', '🟦 = 7'],
          questionLine: '⭐ = ?',
          options: toOpts([12, 13, 14, 15]),
          correctIndex: 2,
        },
        {
          id: '9-3',
          lines: ['🍪 + 🍪 + 🟦 = 19', '🍪 = 6'],
          questionLine: '🟦 = ?',
          options: toOpts([6, 7, 8, 5]),
          correctIndex: 1,
        },
        {
          id: '9-4',
          lines: ['⭐ + 4 = 🟦', '🟦 = 13'],
          questionLine: '⭐ = ?',
          options: toOpts([8, 9, 7, 10]),
          correctIndex: 1,
        },
      ],
    },
    {
      level: 10,
      title: 'L10',
      tasks: [
        {
          id: '10-1',
          lines: ['🍪 × 3 = 27'],
          questionLine: '🍪 = ?',
          options: toOpts([8, 9, 7, 6]),
          correctIndex: 1,
        },
        {
          id: '10-2',
          lines: ['⭐ × 2 + 🟦 = 22', '⭐ = 7, 🟦 = 8'],
          questionLine: 'Correct?',
          options: toOpts([1, 0, 2, 3]),
          correctIndex: 0,
        },
        {
          id: '10-3',
          lines: ['🟦 × 2 + 🍪 = 26', '🟦 = 9'],
          questionLine: '🍪 = ?',
          options: toOpts([6, 7, 8, 9]),
          correctIndex: 2,
        },
        {
          id: '10-4',
          lines: ['⭐ + 🍪 × 2 = 23', '🍪 = 7'],
          questionLine: '⭐ = ?',
          options: toOpts([8, 9, 7, 6]),
          correctIndex: 1,
        },
      ],
    },
  ];
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  topBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(70, 120, 70, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  topBtnTxt: { color: '#FFF', fontSize: 24, fontWeight: '900', marginTop: -2 },
  topTitlePill: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(70, 120, 70, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitleTxt: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  topCoinsPill: {
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(70, 120, 70, 0.4)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  topCoinsTxt: { color: '#FFF', fontWeight: '900', fontSize: 15 },
  cookieIcon: { width: 18, height: 18 },
  mid: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  card: {
    borderRadius: 15,
    backgroundColor: '#D8F6FF',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  cardLine: { color: '#1A1A1A', textAlign: 'center', fontWeight: '800', fontSize: 18 },
  answers: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  ansBtn: {
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  ansTxt: { color: '#1A1A1A', fontWeight: '900', fontSize: 18 },
  bunnyWrap: { alignItems: 'flex-end', paddingHorizontal: 20 },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: { width: 300, borderRadius: 20, backgroundColor: '#FFF', padding: 20, alignItems: 'center' },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#3A7BD5' },
  modalSub: { marginTop: 4, fontSize: 14, color: '#666' },
  modalImg: { width: 140, height: 140, marginTop: 10 },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  cookieSmall: { width: 22, height: 22 },
  rewardTxt: { fontWeight: '900', color: '#F39C12', fontSize: 18 },
  modalBtnsRow: { marginTop: 20, width: '100%', alignItems: 'center', gap: 10 },
  shareBtn: {
    position: 'absolute',
    left: 0,
    bottom: 50,
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#2B6DE3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareTxt: { color: '#FFF', fontWeight: '900', fontSize: 18 },
  primaryBtn: {
    width: '100%',
    height: 44,
    borderRadius: 12,
    backgroundColor: '#2B6DE3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryTxt: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  secondaryBtn: {
    width: '100%',
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2B6DE3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryTxt: { color: '#2B6DE3', fontWeight: '900', fontSize: 14 },
});