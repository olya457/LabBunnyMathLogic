import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackActions } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'HuntPlay'>;
const COOKIES_KEY = 'cookies_balance_v1';

const BG = require('../assets/hunt_play_bg.png');
const COIN_ICON = require('../assets/cookie.png');
const PIG = require('../assets/pig_bomb.png');

const DOOR_CLOSED = require('../assets/door_closed.png');
const DOOR_OPEN = require('../assets/door_open.png');

const BUNNY_WIN = require('../assets/bunny_win.png');
const BUNNY_LOSE = require('../assets/bunny_lose.png');

const MAX_TRIES = 3;
const COIN_PER_COOKIE = 10;

const BOMB_SHOW_MS = 3000;
const RESULT_DELAY_MS = 1400;

type Coord = { r: number; c: number };
type LevelDef = { level: number; coords: Coord[]; bombIndex: number; cookieCount: number };

type DoorKind = 'cookie' | 'bomb' | 'empty';
type RevealMap = Record<number, DoorKind>;

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

async function readCookies() {
  try {
    const v = await AsyncStorage.getItem(COOKIES_KEY);
    const num = v ? Number(v) : 0;
    return Number.isFinite(num) ? num : 0;
  } catch {
    return 0;
  }
}

async function writeCookies(v: number) {
  try {
    await AsyncStorage.setItem(COOKIES_KEY, String(v));
  } catch {}
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function buildDoorMap(L: LevelDef): Record<number, DoorKind> {
  const n = L.coords.length;
  const map: Record<number, DoorKind> = {};
  for (let i = 0; i < n; i++) map[i] = 'empty';

  map[L.bombIndex] = 'bomb';

  const rng = mulberry32(999 + L.level * 101 + n * 17);
  const needCookies = clamp(L.cookieCount, 0, Math.max(0, n - 1));

  let placed = 0;
  let guard = 0;
  while (placed < needCookies && guard < 9999) {
    guard += 1;
    const i = Math.floor(rng() * n);
    if (i === L.bombIndex) continue;
    if (map[i] !== 'empty') continue;
    map[i] = 'cookie';
    placed += 1;
  }

  return map;
}

export default function HuntPlayScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const isSmall = height < 700;
  const isTiny = height < 620;

  useEffect(() => {
    navigation.setOptions?.({ gestureEnabled: false });
  }, [navigation]);

  const levels = useMemo<LevelDef[]>(() => buildHuntLevels(), []);
  const maxLevel = levels.length;
  const start = route.params?.level ?? 1;

  const [totalCookies, setTotalCookies] = useState(0);
  const [level, setLevel] = useState(() => clamp(start, 1, maxLevel));

  const [triesUsed, setTriesUsed] = useState(0);
  const triesLeft = MAX_TRIES - triesUsed;

  const [revealed, setRevealed] = useState<RevealMap>({});
  const [pending, setPending] = useState(0);

  const [resultCoins, setResultCoins] = useState(0);

  const [locked, setLocked] = useState(false);
  const [showWin, setShowWin] = useState(false);
  const [showLose, setShowLose] = useState(false);

  const topPad = Math.max(10, insets.top + 8);
  const bottomPad = Math.max(12, insets.bottom + 10);

  const L = levels[level - 1];
  const doorMap = useMemo(() => buildDoorMap(L), [L]);
  const gridCols = 5;
  const gridRows = 5;

  const maxBoardW = Math.min(390, width - (isTiny ? 40 : 54));
  const maxBoardH = Math.min(
    520,
    height - (topPad + 54) - (bottomPad + 40) - (isTiny ? 150 : 170)
  );

  const gap = isTiny ? 10 : isSmall ? 12 : 14;

  const cellByW = Math.floor((maxBoardW - gap * (gridCols - 1)) / gridCols);
  const cellByH = Math.floor((maxBoardH - gap * (gridRows - 1)) / gridRows);
  const cellSize = clamp(Math.min(cellByW, cellByH), isTiny ? 50 : 58, isTiny ? 74 : 90);

  const boardW = cellSize * gridCols + gap * (gridCols - 1);
  const boardH = cellSize * gridRows + gap * (gridRows - 1);
  const boardPulse = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const tapScale = useRef(new Animated.Value(1)).current;

  const popRef = useRef<Record<number, Animated.Value>>({});
  const timeoutsRef = useRef<number[]>([]);

  const safeTimeout = (fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms) as unknown as number;
    timeoutsRef.current.push(id);
    return id;
  };

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((id) => clearTimeout(id));
      timeoutsRef.current = [];
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const c = await readCookies();
      if (!mounted) return;
      setTotalCookies(c);
    })();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(boardPulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(boardPulse, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();

    return () => {
      mounted = false;
      loop.stop();
    };
  }, [boardPulse]);

  const boardScale = boardPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.01],
  });

  const shakeX = shake.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-7, 0, 7],
  });

  const runShake = useCallback(() => {
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [shake]);

  const onPressInBtn = () => {
    Animated.timing(tapScale, {
      toValue: 0.985,
      duration: 90,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };
  const onPressOutBtn = () => {
    Animated.timing(tapScale, {
      toValue: 1,
      duration: 120,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const resetRound = useCallback(() => {
    setRevealed({});
    setPending(0);
    setResultCoins(0);
    setTriesUsed(0);
    setLocked(false);
    popRef.current = {};
  }, []);

  useEffect(() => {
    resetRound();
  }, [level, resetRound]);

  const openDoorPop = (i: number) => {
    if (!popRef.current[i]) popRef.current[i] = new Animated.Value(0);
    const v = popRef.current[i];
    v.setValue(0);
    Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(v, { toValue: 0, duration: 160, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]).start();
  };

  const commitToTotal = useCallback(async (coinsToAdd: number) => {
    if (coinsToAdd <= 0) return;

    setTotalCookies((prev) => {
      const next = prev + coinsToAdd;
      writeCookies(next);
      return next;
    });
  }, []);

  const finishWin = useCallback(
    async (coinsEarned: number) => {
      setResultCoins(coinsEarned);
      await commitToTotal(coinsEarned);

      safeTimeout(() => setShowWin(true), RESULT_DELAY_MS);

      setLocked(false);
      setPending(0);
    },
    [commitToTotal]
  );

  const finishLose = useCallback(() => {
    setResultCoins(0);

    safeTimeout(() => setShowLose(true), RESULT_DELAY_MS);

    setLocked(false);
    setPending(0);
  }, []);

  const onPressDoor = (i: number) => {
    if (locked || showWin || showLose) return;
    if (triesLeft <= 0) return;
    if (revealed[i]) return;

    setLocked(true);

    const kind = doorMap[i] ?? 'empty';

    setRevealed((prev) => ({ ...prev, [i]: kind }));
    openDoorPop(i);

    const nextUsed = triesUsed + 1;
    setTriesUsed(nextUsed);

    safeTimeout(() => {
      if (kind === 'bomb') {
        runShake();

        safeTimeout(() => {
          finishLose();
        }, BOMB_SHOW_MS);

        return;
      }

      if (kind === 'cookie') {
        setPending((prev) => prev + COIN_PER_COOKIE);
      }

      if (nextUsed >= MAX_TRIES) {
        const extra = kind === 'cookie' ? COIN_PER_COOKIE : 0;
        const coinsEarned = pending + extra;

        safeTimeout(() => {
          finishWin(coinsEarned);
        }, 120);

        return;
      }

      setLocked(false);
    }, 220);
  };

  const nextLevel = () => {
    setShowWin(false);
    const next = level + 1;
    if (next > maxLevel) {
      navigation.dispatch(StackActions.popToTop());
      return;
    }
    setLevel(next);
  };

  const tryAgain = () => {
    setShowLose(false);
    resetRound();
  };
  const exit = () => {
    setShowWin(false);
    setShowLose(false);
    navigation.dispatch(StackActions.popToTop());
  };

  const shareResult = async (mode: 'win' | 'lose') => {
    const text =
      mode === 'win'
        ? `I finished Cookie Hunt Level ${level} and earned +${resultCoins} coins! 🍪`
        : `I hit the bomb in Cookie Hunt Level ${level}. I will try again! 🐷💥`;
    try {
      await Share.share({ message: text });
    } catch {}
  };

  const renderDoor = (coord: Coord, i: number) => {
    const x = coord.c * (cellSize + gap);
    const y = coord.r * (cellSize + gap);

    const kind = revealed[i];

    const pop = popRef.current[i] ?? new Animated.Value(0);
    const popScale = pop.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.06],
    });

    return (
      <Pressable
        key={`${L.level}_${i}`}
        onPress={() => onPressDoor(i)}
        style={[styles.cell, { width: cellSize, height: cellSize, left: x, top: y }]}
        disabled={locked || !!kind || triesLeft <= 0 || showWin || showLose}
      >
        <Animated.View style={{ width: cellSize, height: cellSize, transform: [{ scale: popScale }] }}>
          {!kind ? (
            <Image source={DOOR_CLOSED} style={{ width: cellSize, height: cellSize }} resizeMode="contain" />
          ) : (
            <View style={{ width: cellSize, height: cellSize }}>
              <Image source={DOOR_OPEN} style={{ width: cellSize, height: cellSize }} resizeMode="contain" />

              {kind === 'cookie' && (
                <Image
                  source={COIN_ICON}
                  style={{
                    width: cellSize * 0.44,
                    height: cellSize * 0.44,
                    position: 'absolute',
                    alignSelf: 'center',
                    top: cellSize * 0.28,
                  }}
                  resizeMode="contain"
                />
              )}

              {kind === 'bomb' && (
                <Image
                  source={PIG}
                  style={{
                    width: cellSize * 0.48,
                    height: cellSize * 0.48,
                    position: 'absolute',
                    alignSelf: 'center',
                    top: cellSize * 0.26,
                  }}
                  resizeMode="contain"
                />
              )}
            </View>
          )}
        </Animated.View>
      </Pressable>
    );
  };

  const modalW = (isTiny ? 330 : isSmall ? 350 : 365) + 20;
  const modalImg = isTiny ? 155 : 175;

  return (
    <ImageBackground source={BG} style={styles.bg} resizeMode="cover">
      <SafeAreaView style={styles.safe}>
        <View style={[styles.topBar, { paddingTop: topPad }]}>

          <Pressable onPress={() => navigation.dispatch(StackActions.popToTop())} style={styles.topBtn}>
            <Text style={styles.topBtnTxt}>‹</Text>
          </Pressable>

          <View style={styles.topTitlePill}>
            <Text style={styles.topTitleTxt}>Cookie Hunt</Text>
            <Text style={styles.topSubTxt}>
              Tries: {triesUsed}/{MAX_TRIES}  •  Round: +{pending}
            </Text>
          </View>

          <View style={styles.topCoinsPill}>
            <Image source={COIN_ICON} style={styles.coinIcon} resizeMode="contain" />
            <Text style={styles.topCoinsTxt}>{totalCookies}</Text>
          </View>
        </View>

        <View style={styles.mid}>
          <Animated.View
            style={[
              styles.board,
              {
                width: boardW,
                height: boardH,
                transform: [{ scale: boardScale }, { translateX: shakeX }],
              },
            ]}
          >
            {L.coords.map((c, i) => renderDoor(c, i))}
          </Animated.View>
        </View>

        <View style={[styles.bottomSpace, { paddingBottom: bottomPad }]} />

        <Modal transparent visible={showWin} animationType="fade">
          <View style={styles.modalBg}>
            <View style={[styles.modalCard, { width: modalW }]}>
              <Text style={[styles.modalTitle, { color: '#3A7BD5' }]}>Level Done!</Text>
              <Text style={styles.modalSub}>You avoided the bomb.</Text>

              <Image source={BUNNY_WIN} style={{ width: modalImg, height: modalImg, marginTop: 12 }} resizeMode="contain" />

              <View style={styles.rewardRow}>
                <Image source={COIN_ICON} style={styles.coinSmall} resizeMode="contain" />
                <Text style={styles.rewardTxt}>+{resultCoins}</Text>
              </View>

              <View style={styles.modalBtnsRow}>
                <Pressable onPress={() => shareResult('win')} style={styles.shareBtn}>
                  <Text style={styles.shareTxt}>⇪</Text>
                </Pressable>

                <Animated.View style={{ transform: [{ scale: tapScale }] }}>
                  <Pressable
                    onPressIn={onPressInBtn}
                    onPressOut={onPressOutBtn}
                    onPress={nextLevel}
                    style={styles.primaryBtn}
                  >
                    <Text style={styles.primaryTxt}>Next round</Text>
                  </Pressable>
                </Animated.View>
                <Pressable onPress={exit} style={styles.secondaryBtn}>
                  <Text style={styles.secondaryTxt}>Exit</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        <Modal transparent visible={showLose} animationType="fade">
          <View style={styles.modalBg}>
            <View style={[styles.modalCard, { width: modalW }]}>
              <Text style={[styles.modalTitle, { color: '#E04040' }]}>Game Over</Text>
              <Text style={styles.modalSub}>Bomb pig cancels the round.</Text>

              <Image source={BUNNY_LOSE} style={{ width: modalImg, height: modalImg, marginTop: 12 }} resizeMode="contain" />

              <View style={styles.rewardRow}>
                <Image source={COIN_ICON} style={styles.coinSmall} resizeMode="contain" />
                <Text style={[styles.rewardTxt, { color: '#E04040' }]}>+0</Text>
              </View>

              <View style={styles.modalBtnsRow}>
                <Pressable onPress={() => shareResult('lose')} style={styles.shareBtn}>
                  <Text style={styles.shareTxt}>⇪</Text>
                </Pressable>

                <Animated.View style={{ transform: [{ scale: tapScale }] }}>
                  <Pressable
                    onPressIn={onPressInBtn}
                    onPressOut={onPressOutBtn}
                    onPress={tryAgain}
                    style={styles.primaryBtn}
                  >
                    <Text style={styles.primaryTxt}>Try Again</Text>
                  </Pressable>
                </Animated.View>

                <Pressable onPress={exit} style={styles.secondaryBtn}>
                  <Text style={styles.secondaryTxt}>Exit</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </ImageBackground>
  );
}


function buildHuntLevels(): LevelDef[] {
  const coords = (arr: Array<[number, number]>): Coord[] => arr.map(([r, c]) => ({ r, c }));

  return [
    { level: 1, coords: coords([[1,1],[1,2],[1,3],[2,1],[2,2],[2,3],[3,1],[3,2],[3,3]]), bombIndex: 4, cookieCount: 4 },
    { level: 2, coords: coords([[1,2],[2,1],[2,2],[2,3],[3,2]]), bombIndex: 4, cookieCount: 2 },
    { level: 3, coords: coords([[1,1],[1,2],[1,3],[2,2],[3,1],[3,2],[3,3]]), bombIndex: 3, cookieCount: 3 },
    { level: 4, coords: coords([[1,1],[1,3],[2,1],[2,2],[2,3],[3,1],[3,3]]), bombIndex: 5, cookieCount: 3 },
    { level: 5, coords: coords([[0,1],[0,2],[0,3],[1,1],[1,2],[1,3],[2,1],[2,2],[2,3],[3,1],[3,2],[3,3]]), bombIndex: 7, cookieCount: 5 },
    { level: 6, coords: coords([[0,2],[1,1],[1,2],[1,3],[2,0],[2,1],[2,2],[2,3],[2,4],[3,1],[3,2],[3,3],[4,2]]), bombIndex: 6, cookieCount: 6 },
    { level: 7, coords: coords([[0,1],[0,2],[0,3],[0,4],[1,1],[1,2],[1,3],[1,4],[2,1],[2,2],[2,3],[2,4],[3,1],[3,2],[3,3],[3,4]]), bombIndex: 9, cookieCount: 7 },
    { level: 8, coords: coords([[0,2],[0,3],[1,1],[1,2],[1,3],[1,4],[2,1],[2,2],[2,3],[2,4],[3,1],[3,2],[3,3],[3,4],[4,2],[4,3]]), bombIndex: 0, cookieCount: 7 },
    { level: 9, coords: coords([[0,0],[0,4],[1,1],[1,2],[1,3],[2,2],[3,1],[3,2],[3,3],[4,0],[4,4]]), bombIndex: 5, cookieCount: 4 },
    { level: 10, coords: coords([[0,1],[0,3],[1,0],[1,1],[1,2],[1,3],[1,4],[2,0],[2,4],[3,0],[3,1],[3,2],[3,3],[3,4],[4,1],[4,3]]), bombIndex: 11, cookieCount: 7 },
  ];
}


const styles = StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1 },

  topBar: {
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  topBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(70, 120, 70, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBtnTxt: { color: '#D6F0D2', fontSize: 22, fontWeight: '900', marginTop: -2 },

  topTitlePill: {
    flex: 1,
    minHeight: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(70, 120, 70, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  topTitleTxt: { color: '#EAF7E7', fontWeight: '900', fontSize: 14 },
  topSubTxt: { marginTop: 2, color: 'rgba(234,247,231,0.95)', fontWeight: '800', fontSize: 11 },

  topCoinsPill: {
    height: 38,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(70, 120, 70, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  coinIcon: { width: 18, height: 18 },
  topCoinsTxt: { color: '#EAF7E7', fontWeight: '900', fontSize: 14 },

  mid: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingTop: 10,
  },

  board: { position: 'relative' },
  cell: { position: 'absolute' },

  bottomSpace: { height: 10 },

  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  modalCard: {
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    paddingVertical: 22,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  modalTitle: { fontSize: 24, fontWeight: '900' },
  modalSub: { marginTop: 8, fontSize: 14, fontWeight: '800', color: '#7B2B7B', textAlign: 'center' },

  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  coinSmall: { width: 20, height: 20 },
  rewardTxt: { fontWeight: '900', color: '#F39C12', fontSize: 18 },

  modalBtnsRow: { marginTop: 18, width: '100%', alignItems: 'center' },

  shareBtn: {
    width: 52,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#2B6DE3',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  shareTxt: { color: '#FFF', fontWeight: '900', fontSize: 18 },

  primaryBtn: {
    width: '92%',
    height: 58,
    borderRadius: 18,
    backgroundColor: '#2B6DE3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryTxt: { color: '#FFF', fontWeight: '900', fontSize: 18 },

  secondaryBtn: {
    width: '92%',
    height: 56,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#2B6DE3',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  secondaryTxt: { color: '#2B6DE3', fontWeight: '900', fontSize: 17 },
});