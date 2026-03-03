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
import { StackActions } from '@react-navigation/native';
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
const INITIAL_GIFT = 200;
const REWARD_CORRECT = 20;

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

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

export default function MathPlayScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const levelStart = route.params?.level ?? 1;
  const levels = useMemo<Level[]>(() => buildLevels(), []);
  const maxLevel = levels.length;

  const [level, setLevel] = useState(() => clamp(levelStart, 1, maxLevel));
  const [taskIndex, setTaskIndex] = useState(0);
  const [cookies, setCookies] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [showWin, setShowWin] = useState(false);
  const [showLose, setShowLose] = useState(false);

  const L = levels[level - 1];
  const task = L.tasks[taskIndex];

  const isSmall = height < 700;
  const isTiny = height < 620;
  const topPad = Math.max(10, insets.top + 8);
  const cardW = Math.round(Math.min(isTiny ? 330 : 360, width - (isTiny ? 44 : 64)));
  const cardH = isTiny ? 128 : isSmall ? 140 : 160;
  const gap = isTiny ? 10 : 12;
  const btnW = Math.round((cardW - gap) / 2);
  const btnH = isTiny ? 36 : isSmall ? 38 : 42;
  const bunnySize = isTiny ? 86 : isSmall ? 96 : 112;
  const cardFont = isTiny ? 14 : 16;
  const cardLine = isTiny ? 20 : 22;

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
      navigation.setOptions({ gestureEnabled: true });

      const sub = navigation.addListener('beforeRemove', (e) => {
        if (showWin || showLose) {
          e.preventDefault();
          setShowWin(false);
          setShowLose(false);
          setLocked(false);
          setSelected(null);
        }
      });

      const bh = BackHandler.addEventListener('hardwareBackPress', () => {
        if (showWin || showLose) {
          setShowWin(false);
          setShowLose(false);
          setLocked(false);
          setSelected(null);
          return true;
        }
        return false;
      });

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

      animateIn();

      return () => {
        alive = false;
        sub();
        bh.remove();
      };
    }, [navigation, showWin, showLose])
  );

  const onBackPress = () => {
    if (showWin || showLose) {
      setShowWin(false);
      setShowLose(false);
      setLocked(false);
      setSelected(null);
      return;
    }
    navigation.goBack();
  };

  const addCookies = (delta: number) => {
    setCookies((prev) => {
      const next = prev + delta;
      writeCookies(next);
      return next;
    });
  };

  const onPick = (i: number) => {
    if (locked) return;
    setSelected(i);
    setLocked(true);
    const correct = i === task.correctIndex;

    setTimeout(() => {
      if (correct) {
        addCookies(REWARD_CORRECT);
        const nextTask = taskIndex + 1;
        if (nextTask >= L.tasks.length) {
          setShowWin(true);
        } else {
          setTaskIndex(nextTask);
          setSelected(null);
          setLocked(false);
          animateIn();
        }
      } else {
        setShowLose(true);
      }
    }, 420);
  };

  const resetLevel = () => {
    setTaskIndex(0);
    setSelected(null);
    setLocked(false);
    setShowLose(false);
    animateIn();
  };

  const nextLevel = () => {
    setShowWin(false);
    const next = level + 1;
    if (next > maxLevel) {
      setShowLose(false);
      navigation.dispatch(StackActions.popToTop());
      return;
    }
    setLevel(next);
    setTaskIndex(0);
    setSelected(null);
    setLocked(false);
    animateIn();
  };

  const goHome = () => {
    setShowWin(false);
    setShowLose(false);
    setLocked(false);
    setSelected(null);
    navigation.dispatch(StackActions.popToTop());
  };

  const shareResult = async (mode: 'win' | 'lose') => {
    const text = mode === 'win'
        ? `I completed Level ${level} in Cookie Math! 🍪`
        : `I tried Cookie Math (Level ${level}). I'll beat it next time! 🍪`;
    try {
      await Share.share({ message: text });
    } catch {}
  };

  const cardScale = cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] });
  const cardY = cardAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });
  const cardOpacity = cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const bunnyScale = bunnyAnim.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] });
  const bunnyY = bunnyAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });
  const earnedThisLevel = L.tasks.length * REWARD_CORRECT;

  return (
    <ImageBackground source={BG} style={styles.bg} resizeMode="cover">
      <SafeAreaView style={styles.safe}>
        <View style={[styles.topBar, { paddingTop: topPad, paddingHorizontal: isTiny ? 12 : 14 }]}>
          <Pressable onPress={onBackPress} style={[styles.topBtn, isTiny && styles.topBtnTiny]}>
            <Text style={[styles.topBtnTxt, isTiny && { fontSize: 20 }]}>‹</Text>
          </Pressable>

          <View style={[styles.topTitlePill, isTiny && styles.pillTiny]}>
            <Text style={[styles.topTitleTxt, isTiny && { fontSize: 13 }]}>Cookie Math</Text>
          </View>

          <View style={[styles.topCoinsPill, isTiny && styles.pillTiny]}>
            <Image source={COOKIE} style={styles.cookieIcon} resizeMode="contain" />
            <Text style={[styles.topCoinsTxt, isTiny && { fontSize: 13 }]}>{cookies}</Text>
          </View>
        </View>

        <View style={[styles.mid, { paddingTop: isTiny ? 6 : 10 }]}>
          <Animated.View
            style={[
              styles.card,
              {
                width: cardW,
                height: cardH,
                opacity: cardOpacity,
                transform: [{ translateY: cardY }, { scale: cardScale }],
              },
            ]}
          >
            {task.lines.map((t, idx) => (
              <Text key={idx} style={[styles.cardLine, { fontSize: cardFont, lineHeight: cardLine }]} numberOfLines={1}>
                {t}
              </Text>
            ))}
            <Text style={[styles.cardLine, { marginTop: isTiny ? 6 : 8, fontWeight: '900', fontSize: cardFont, lineHeight: cardLine }]} numberOfLines={2}>
              {task.questionLine}
            </Text>
          </Animated.View>

          <View style={[styles.answers, { width: cardW, marginTop: isTiny ? 12 : 16, gap }]}>
            {task.options.map((opt, i) => {
              const isSel = selected === i;
              const isCorrect = i === task.correctIndex;
              let bg = '#F3D76B';
              if (selected !== null) {
                if (isSel && isCorrect) bg = '#84C65A';
                else if (isSel && !isCorrect) bg = '#B01717';
                else bg = '#F3D76B';
              }
              return (
                <Pressable
                  key={opt.label + String(opt.value)}
                  disabled={locked}
                  onPress={() => onPick(i)}
                  style={[styles.ansBtn, { width: btnW, height: btnH, backgroundColor: bg }]}
                >
                  <Text style={[styles.ansTxt, { fontSize: isTiny ? 15 : 16 }]}>{opt.value}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Animated.View style={[styles.bunnyWrap, { paddingBottom: Math.max(10, insets.bottom + 8), transform: [{ translateY: bunnyY }, { scale: bunnyScale }] }]}>
          <Image source={BUNNY_SMALL} style={{ width: bunnySize, height: bunnySize }} resizeMode="contain" />
        </Animated.View>

        <Modal transparent visible={showWin} animationType="fade">
          <View style={styles.modalBg}>
            <View style={[styles.modalCard, { width: isTiny ? 288 : 300 }]}>
              <Text style={[styles.modalTitle, { color: '#3A7BD5' }]}>Level Complete!</Text>
              <Text style={styles.modalSub}>Great thinking!</Text>
              <Image source={BUNNY_WIN} style={[styles.modalImg, { width: isTiny ? 128 : 140, height: isTiny ? 128 : 140 }]} resizeMode="contain" />
              <View style={styles.rewardRow}>
                <Image source={COOKIE} style={styles.cookieSmall} resizeMode="contain" />
                <Text style={styles.rewardTxt}>+{earnedThisLevel}</Text>
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
            <View style={[styles.modalCard, { width: isTiny ? 288 : 300 }]}>
              <Text style={[styles.modalTitle, { color: '#E04040' }]}>Game Over</Text>
              <Text style={styles.modalSub}>Almost got it!</Text>
              <Image source={BUNNY_LOSE} style={[styles.modalImg, { width: isTiny ? 128 : 140, height: isTiny ? 128 : 140 }]} resizeMode="contain" />
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
  const L1: Task[] = [
    { id: '1-1', lines: ['🍪 + 🍪 = ?'], questionLine: 'Choose the answer:', options: toOpts([2, 3, 4, 1]), correctIndex: 0 },
    { id: '1-2', lines: ['🍪 + ⭐ = 5', '🍪 = 2'], questionLine: '⭐ = ?', options: toOpts([4, 3, 2, 5]), correctIndex: 1 },
    { id: '1-3', lines: ['🟦 + 🟦 + 🟦 = 9'], questionLine: '🟦 = ?', options: toOpts([1, 2, 3, 4]), correctIndex: 2 },
    { id: '1-4', lines: ['🍪 + 🟦 = 6', '🟦 = 4'], questionLine: '🍪 = ?', options: toOpts([3, 2, 4, 1]), correctIndex: 1 },
  ];
  const L2: Task[] = [
    { id: '2-1', lines: ['🍪 + ⭐ = 6', '🍪 = 2'], questionLine: '⭐ = ?', options: toOpts([3, 4, 2, 5]), correctIndex: 1 },
    { id: '2-2', lines: ['🟦 + 🍪 = 5', '🍪 = 1'], questionLine: '🟦 = ?', options: toOpts([4, 3, 2, 5]), correctIndex: 0 },
    { id: '2-3', lines: ['⭐ + 2 = 7'], questionLine: '⭐ = ?', options: toOpts([4, 5, 6, 3]), correctIndex: 1 },
    { id: '2-4', lines: ['🍪 + 🍪 + 🍪 = 6'], questionLine: '🍪 = ?', options: toOpts([1, 3, 2, 4]), correctIndex: 2 },
  ];
  const L3: Task[] = [
    { id: '3-1', lines: ['🟦 + 🟦 + 🟦 = 9'], questionLine: '🟦 = ?', options: toOpts([2, 4, 3, 5]), correctIndex: 2 },
    { id: '3-2', lines: ['🍪 + 🟦 = 7', '🟦 = 5'], questionLine: '🍪 = ?', options: toOpts([3, 2, 1, 4]), correctIndex: 1 },
    { id: '3-3', lines: ['⭐ + 🍪 = 8', '⭐ = 6'], questionLine: '🍪 = ?', options: toOpts([1, 3, 2, 4]), correctIndex: 2 },
    { id: '3-4', lines: ['🟦 + 4 = 10'], questionLine: '🟦 = ?', options: toOpts([5, 7, 6, 4]), correctIndex: 2 },
  ];
  const L4: Task[] = [
    { id: '4-1', lines: ['🍪 + ⭐ = 9', '⭐ = 4'], questionLine: '🍪 = ?', options: toOpts([6, 5, 4, 3]), correctIndex: 1 },
    { id: '4-2', lines: ['🟦 + 🍪 = 11', '🍪 = 6'], questionLine: '🟦 = ?', options: toOpts([4, 5, 6, 7]), correctIndex: 1 },
    { id: '4-3', lines: ['⭐ + ⭐ + 🍪 = 10', '⭐ = 3'], questionLine: '🍪 = ?', options: toOpts([4, 3, 5, 2]), correctIndex: 0 },
    { id: '4-4', lines: ['🟦 + 3 = 8'], questionLine: '🟦 = ?', options: toOpts([6, 5, 4, 3]), correctIndex: 1 },
  ];
  const L5: Task[] = [
    { id: '5-1', lines: ['🍪 + ⭐ = 12', '⭐ = 7'], questionLine: '🍪 = ?', options: toOpts([4, 5, 6, 3]), correctIndex: 1 },
    { id: '5-2', lines: ['🟦 + 🟦 = 14'], questionLine: '🟦 = ?', options: toOpts([6, 8, 7, 5]), correctIndex: 2 },
    { id: '5-3', lines: ['⭐ + 🍪 + 🍪 = 11', '⭐ = 5'], questionLine: '🍪 = ?', options: toOpts([2, 4, 3, 5]), correctIndex: 2 },
    { id: '5-4', lines: ['🟦 + 5 = 13'], questionLine: '🟦 = ?', options: toOpts([7, 8, 6, 9]), correctIndex: 1 },
  ];
  const L6: Task[] = [
    { id: '6-1', lines: ['🍪 + ⭐ = 14', '⭐ = 9'], questionLine: '🍪 = ?', options: toOpts([4, 5, 6, 3]), correctIndex: 1 },
    { id: '6-2', lines: ['🟦 × 2 = 16'], questionLine: '🟦 = ?', options: toOpts([6, 7, 8, 9]), correctIndex: 2 },
    { id: '6-3', lines: ['⭐ + ⭐ + 🍪 = 17', '⭐ = 6'], questionLine: '🍪 = ?', options: toOpts([5, 4, 6, 3]), correctIndex: 0 },
    { id: '6-4', lines: ['🟦 + 🍪 = 13', '🍪 = 5'], questionLine: '🟦 = ?', options: toOpts([7, 8, 6, 9]), correctIndex: 1 },
  ];
  const L7: Task[] = [
    { id: '7-1', lines: ['🍪 × 2 = 18'], questionLine: '🍪 = ?', options: toOpts([8, 9, 7, 6]), correctIndex: 1 },
    { id: '7-2', lines: ['⭐ × 3 = 21'], questionLine: '⭐ = ?', options: toOpts([6, 7, 8, 9]), correctIndex: 1 },
    { id: '7-3', lines: ['🟦 + ⭐ = 15', '⭐ = 9'], questionLine: '🟦 = ?', options: toOpts([6, 5, 7, 8]), correctIndex: 0 },
    { id: '7-4', lines: ['🍪 + 🟦 + ⭐ = 20', '🍪 = 6, 🟦 = 5'], questionLine: '⭐ = ?', options: toOpts([7, 8, 9, 6]), correctIndex: 2 },
  ];
  const L8: Task[] = [
    { id: '8-1', lines: ['⭐ + 🍪 = 13', '🍪 = 8'], questionLine: '⭐ = ?', options: toOpts([4, 5, 6, 7]), correctIndex: 1 },
    { id: '8-2', lines: ['🟦 × 3 = 24'], questionLine: '🟦 = ?', options: toOpts([6, 7, 8, 9]), correctIndex: 2 },
    { id: '8-3', lines: ['🍪 × 2 + ⭐ = 19', '🍪 = 7'], questionLine: '⭐ = ?', options: toOpts([4, 5, 6, 3]), correctIndex: 1 },
    { id: '8-4', lines: ['🟦 + 🍪 = 18', '🟦 = 10'], questionLine: '🍪 = ?', options: toOpts([7, 8, 6, 9]), correctIndex: 1 },
  ];
  const L9: Task[] = [
    { id: '9-1', lines: ['⭐ × 2 + 🍪 = 17', '⭐ = 6'], questionLine: '🍪 = ?', options: toOpts([4, 5, 6, 3]), correctIndex: 1 },
    { id: '9-2', lines: ['🟦 × 2 = ⭐', '🟦 = 7'], questionLine: '⭐ = ?', options: toOpts([12, 13, 14, 15]), correctIndex: 2 },
    { id: '9-3', lines: ['🍪 + 🍪 + 🟦 = 19', '🍪 = 6'], questionLine: '🟦 = ?', options: toOpts([6, 7, 8, 5]), correctIndex: 1 },
    { id: '9-4', lines: ['⭐ + 4 = 🟦', '🟦 = 13'], questionLine: '⭐ = ?', options: toOpts([8, 9, 7, 10]), correctIndex: 1 },
  ];
  const L10: Task[] = [
    { id: '10-1', lines: ['🍪 × 3 = 27'], questionLine: '🍪 = ?', options: toOpts([8, 9, 7, 6]), correctIndex: 1 },
    { id: '10-2', lines: ['⭐ × 2 + 🟦 = 22', '⭐ = 7, 🟦 = 8'], questionLine: 'Is equality correct?', options: [{ label: 'A', value: 1 }, { label: 'B', value: 0 }, { label: 'C', value: 2 }, { label: 'D', value: 3 }], correctIndex: 0 },
    { id: '10-3', lines: ['🟦 × 2 + 🍪 = 26', '🟦 = 9'], questionLine: '🍪 = ?', options: toOpts([6, 7, 8, 9]), correctIndex: 2 },
    { id: '10-4', lines: ['⭐ + 🍪 × 2 = 23', '🍪 = 7'], questionLine: '⭐ = ?', options: toOpts([8, 9, 7, 6]), correctIndex: 1 },
  ];
  return [
    { level: 1, title: 'Level 1', tasks: L1 },
    { level: 2, title: 'Level 2', tasks: L2 },
    { level: 3, title: 'Level 3', tasks: L3 },
    { level: 4, title: 'Level 4', tasks: L4 },
    { level: 5, title: 'Level 5', tasks: L5 },
    { level: 6, title: 'Level 6', tasks: L6 },
    { level: 7, title: 'Level 7', tasks: L7 },
    { level: 8, title: 'Level 8', tasks: L8 },
    { level: 9, title: 'Level 9', tasks: L9 },
    { level: 10, title: 'Level 10', tasks: L10 },
  ];
}

function toOpts(nums: number[]): Option[] {
  const labels = ['A', 'B', 'C', 'D'];
  return nums.map((n, i) => ({ label: labels[i] ?? String(i), value: n }));
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  topBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(70, 120, 70, 0.35)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', alignItems: 'center', justifyContent: 'center' },
  topBtnTiny: { width: 34, height: 34, borderRadius: 10 },
  topBtnTxt: { color: '#D6F0D2', fontSize: 22, fontWeight: '900', marginTop: -2 },
  topTitlePill: { flex: 1, height: 38, borderRadius: 10, backgroundColor: 'rgba(70, 120, 70, 0.35)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', alignItems: 'center', justifyContent: 'center' },
  topCoinsPill: { height: 38, paddingHorizontal: 10, borderRadius: 10, backgroundColor: 'rgba(70, 120, 70, 0.35)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', flexDirection: 'row', alignItems: 'center', gap: 8 },
  pillTiny: { height: 34, borderRadius: 10 },
  topTitleTxt: { color: '#EAF7E7', fontWeight: '900', fontSize: 14 },
  cookieIcon: { width: 18, height: 18 },
  topCoinsTxt: { color: '#EAF7E7', fontWeight: '900', fontSize: 14 },
  mid: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  card: { borderRadius: 10, backgroundColor: '#D8F6FF', borderWidth: 2, borderColor: 'rgba(0,0,0,0.12)', paddingHorizontal: 16, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  cardLine: { color: '#1A1A1A', textAlign: 'center', fontWeight: '800' },
  answers: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  ansBtn: { borderRadius: 999, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.10)' },
  ansTxt: { color: '#1A1A1A', fontWeight: '900' },
  bunnyWrap: { alignItems: 'flex-end', paddingHorizontal: 14 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  modalCard: { borderRadius: 18, backgroundColor: '#FFFFFF', paddingVertical: 18, paddingHorizontal: 16, alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '900' },
  modalSub: { marginTop: 4, fontSize: 12, fontWeight: '800', color: '#7B2B7B' },
  modalImg: { marginTop: 10 },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  cookieSmall: { width: 18, height: 18 },
  rewardTxt: { fontWeight: '900', color: '#F39C12' },
  modalBtnsRow: { marginTop: 14, width: '100%', alignItems: 'center' },
  shareBtn: { width: 38, height: 34, borderRadius: 10, backgroundColor: '#2B6DE3', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start', marginBottom: 8 },
  shareTxt: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  primaryBtn: { width: '80%', height: 38, borderRadius: 10, backgroundColor: '#2B6DE3', alignItems: 'center', justifyContent: 'center' },
  primaryTxt: { color: '#FFF', fontWeight: '900' },
  secondaryBtn: { width: '80%', height: 34, borderRadius: 8, borderWidth: 1, borderColor: '#2B6DE3', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  secondaryTxt: { color: '#2B6DE3', fontWeight: '900' },
});