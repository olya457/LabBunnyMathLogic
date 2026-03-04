import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Image,
  Pressable,
  Modal,
  Platform,
  StatusBar,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type BunnyStage = 0 | 1 | 2;
type ShopItemId = 'bed' | 'table' | 'mat' | 'plant' | 'formula';

type ShopItem = {
  id: ShopItemId;
  cost: number;
  icon: any;
};

const COST_TO_TEEN = 200;
const COST_TO_ADULT = 300;

const COST_DOWNSIZE = 70;

const BG = require('../assets/room_bg.png');
const BUNNY_BABY = require('../assets/bunny_baby.png');
const BUNNY_TEEN = require('../assets/bunny_teen.png');
const BUNNY_ADULT = require('../assets/bunny_adult.png');
const IT_BED = require('../assets/room_item_bed.png');
const IT_TABLE = require('../assets/room_item_table.png');
const IT_MAT = require('../assets/room_item_mat.png');
const IT_PLANT = require('../assets/room_item_plant.png');
const IT_FORMULA = require('../assets/room_item_formula.png');
const COOKIE_ICON = require('../assets/cookie.png');

const COOKIES_KEY = 'cookies_balance_v1';
const INITIAL_GIFT = 200;
const ROOM_STAGE_KEY = 'room_bunny_stage_v1';
const ROOM_OWNED_KEY = 'room_owned_items_v1';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

async function readNumber(key: string): Promise<number | null> {
  try {
    const v = await AsyncStorage.getItem(key);
    if (v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

async function writeNumber(key: string, n: number) {
  try {
    await AsyncStorage.setItem(key, String(n));
  } catch {}
}

async function readJSON<T>(key: string): Promise<T | null> {
  try {
    const v = await AsyncStorage.getItem(key);
    if (v == null) return null;
    return JSON.parse(v) as T;
  } catch {
    return null;
  }
}

async function writeJSON(key: string, value: any) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function defaultOwned(): Record<ShopItemId, boolean> {
  return { bed: false, table: false, mat: false, plant: false, formula: false };
}

function sanitizeOwned(x: any): Record<ShopItemId, boolean> {
  const base = defaultOwned();
  if (!x || typeof x !== 'object') return base;
  (Object.keys(base) as ShopItemId[]).forEach((k) => {
    base[k] = !!x[k];
  });
  return base;
}

export default function RoomScreen() {
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();

  const isSmall = H < 740 || W < 360;
  const isTiny = H < 690;

  const padX = clamp(W * 0.04, 12, 18);
  const headerH = clamp(H * 0.06, 40, 46);
  const titleFont = clamp(W * 0.05, 16, 19);
  const coinsFont = clamp(W * 0.06, 18, 22);
  const bunnyW = clamp(W * 0.78, 220, 290);
  const bunnyH = clamp(H * 0.34, 240, 320);
  const growW = clamp(W * 0.84, 250, 300);
  const growH = clamp(H * 0.07, 48, 56);
  const growFont = clamp(W * 0.052, 16, 18);
  const growBottomLift = (isTiny ? 26 : isSmall ? 18 : 14) + 40;

  const [cookies, setCookies] = useState<number>(0);
  const [stage, setStage] = useState<BunnyStage>(0);
  const [owned, setOwned] = useState<Record<ShopItemId, boolean>>(defaultOwned());
  const [shopOpen, setShopOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const storedCookies = await readNumber(COOKIES_KEY);
        if (!alive) return;
        if (storedCookies == null) {
          setCookies(INITIAL_GIFT);
          await writeNumber(COOKIES_KEY, INITIAL_GIFT);
        } else {
          setCookies(storedCookies);
        }

        const storedStage = await readNumber(ROOM_STAGE_KEY);
        if (!alive) return;
        if (storedStage == null) {
          setStage(0);
          await writeNumber(ROOM_STAGE_KEY, 0);
        } else {
          const safeStage: BunnyStage = storedStage <= 0 ? 0 : storedStage === 1 ? 1 : 2;
          setStage(safeStage);
        }

        const storedOwned = await readJSON<Record<string, boolean>>(ROOM_OWNED_KEY);
        if (!alive) return;
        if (storedOwned == null) {
          const base = defaultOwned();
          setOwned(base);
          await writeJSON(ROOM_OWNED_KEY, base);
        } else {
          setOwned(sanitizeOwned(storedOwned));
        }
      })();
      return () => {
        alive = false;
      };
    }, [])
  );

  const bunnyImg = useMemo(() => {
    if (stage === 0) return BUNNY_BABY;
    if (stage === 1) return BUNNY_TEEN;
    return BUNNY_ADULT;
  }, [stage]);

  const items: ShopItem[] = useMemo(
    () => [
      { id: 'bed', cost: 150, icon: IT_BED },
      { id: 'table', cost: 150, icon: IT_TABLE },
      { id: 'mat', cost: 150, icon: IT_MAT },
      { id: 'plant', cost: 150, icon: IT_PLANT },
      { id: 'formula', cost: 150, icon: IT_FORMULA },
    ],
    []
  );

  const persistStage = useCallback(async (next: BunnyStage) => {
    setStage(next);
    await writeNumber(ROOM_STAGE_KEY, next);
  }, []);

  const persistOwned = useCallback(async (next: Record<ShopItemId, boolean>) => {
    setOwned(next);
    await writeJSON(ROOM_OWNED_KEY, next);
  }, []);

  const spend = useCallback(
    async (cost: number) => {
      if (cookies < cost) return false;
      const next = cookies - cost;
      setCookies(next);
      await writeNumber(COOKIES_KEY, next);
      return true;
    },
    [cookies]
  );

  const onGrow = useCallback(async () => {
    if (stage === 2) return;

    const cost = stage === 0 ? COST_TO_TEEN : COST_TO_ADULT;
    const ok = await spend(cost);

    if (!ok) {
      Alert.alert('Not enough cookies', `You need ${cost} cookies.`);
      return;
    }

    const nextStage: BunnyStage = stage === 0 ? 1 : 2;
    await persistStage(nextStage);
  }, [spend, stage, persistStage]);

  const onDownsize = useCallback(async () => {
    if (stage === 0) return;
    const ok = await spend(COST_DOWNSIZE);
    if (!ok) {
      Alert.alert('Not enough cookies', `You need ${COST_DOWNSIZE} cookies.`);
      return;
    }
    const nextStage: BunnyStage = stage === 2 ? 1 : 0;
    await persistStage(nextStage);
  }, [spend, stage, persistStage]);

  const buyItem = useCallback(
    async (item: ShopItem) => {
      if (owned[item.id]) return;
      if (cookies < item.cost) {
        Alert.alert('Not enough cookies', `You need ${item.cost} cookies.`);
        return;
      }
      const ok = await spend(item.cost);
      if (!ok) return;
      const next = { ...owned, [item.id]: true };
      await persistOwned(next);
    },
    [cookies, owned, spend, persistOwned]
  );

  const topPad = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0;
  const gap = 12;
  const modalW = clamp(W * 0.85, 280, 320);
  const gridItemW = (modalW - 32 - gap) / 2;

  return (
    <View style={styles.flex}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ImageBackground source={BG} style={styles.bg} resizeMode="cover">
        <SafeAreaView style={[styles.safe, { paddingTop: topPad }]} edges={['left', 'right']}>
          <View style={[styles.topRow, { paddingTop: insets.top + 10, paddingHorizontal: padX, gap: 12 }]}>
            <View style={[styles.titlePill, { height: headerH }]}>
              <Text style={[styles.titleText, { fontSize: titleFont }]}>Bunny Room</Text>
            </View>
            <View style={[styles.coinsPill, { height: headerH, width: clamp(W * 0.32, 110, 130) }]}>
              <Image source={COOKIE_ICON} style={{ width: 18, height: 18 }} resizeMode="contain" />
              <Text style={[styles.coinsText, { fontSize: coinsFont }]}>{cookies}</Text>
            </View>
          </View>

          <View style={[styles.raisedContent, { transform: [{ translateY: -40 }] }]}>
            <View style={{ paddingHorizontal: padX, paddingTop: 12 }}>
              <Pressable
                onPress={onDownsize}
                disabled={stage === 0}
                style={[styles.downsizeBtn, stage === 0 && styles.downsizeBtnDisabled]}
              >

              </Pressable>
            </View>

            <View style={styles.roomArea}>
              {owned.bed && (
                <Image
                  source={IT_BED}
                  style={[styles.item, { right: 40, bottom: 240, width: 140, height: 110 }]}
                  resizeMode="contain"
                />
              )}
              {owned.table && (
                <Image
                  source={IT_TABLE}
                  style={[styles.item, { left: 40, bottom: 260, width: 110, height: 95 }]}
                  resizeMode="contain"
                />
              )}
              {owned.mat && (
                <Image
                  source={IT_MAT}
                  style={[styles.item, { right: 50, bottom: 210, width: 120, height: 70 }]}
                  resizeMode="contain"
                />
              )}
              {owned.plant && (
                <Image
                  source={IT_PLANT}
                  style={[styles.item, { left: 40, bottom: 220, width: 90, height: 90 }]}
                  resizeMode="contain"
                />
              )}
              {owned.formula && (
                <Image
                  source={IT_FORMULA}
                  style={[styles.item, { top: 120, alignSelf: 'center', width: 220, height: 80 }]}
                  resizeMode="contain"
                />
              )}

              <View style={[styles.sideLeft, { left: padX, top: '45%', gap: 14 }]}>
                <Pressable onPress={() => setShopOpen(true)} style={styles.plusBtn}>
                  <Text style={styles.plusText}>+</Text>
                </Pressable>
                <Pressable onPress={() => setShopOpen(true)} style={styles.plusBtn}>
                  <Text style={styles.plusText}>+</Text>
                </Pressable>
              </View>

              <View style={[styles.sideRight, { right: padX, top: '45%', gap: 14 }]}>
                <Pressable onPress={() => setShopOpen(true)} style={styles.plusBtn}>
                  <Text style={styles.plusText}>+</Text>
                </Pressable>
                <Pressable onPress={() => setShopOpen(true)} style={styles.plusBtn}>
                  <Text style={styles.plusText}>+</Text>
                </Pressable>
              </View>

              <View style={[styles.bunnyWrap, { bottom: clamp(H * 0.14, 106, 130) + 70 }]}>
                <Image source={bunnyImg} style={{ width: bunnyW, height: bunnyH }} resizeMode="contain" />
              </View>

              <View style={[styles.growWrap, { paddingBottom: Math.max(insets.bottom + growBottomLift + 30, 18) }]}>
                <Pressable
                  onPress={onGrow}
                  disabled={stage === 2}
                  style={[styles.growBtn, { width: growW, height: growH }, stage === 2 && styles.growBtnDisabled]}
                >
                  <Text style={[styles.growText, { fontSize: growFont }]}>Grow Bunny</Text>
                </Pressable>
              </View>
            </View>
          </View>

          <Modal transparent visible={shopOpen} animationType="fade" onRequestClose={() => setShopOpen(false)}>
            <View style={styles.modalOverlay}>
              <View style={[styles.modalCard, { width: modalW }]}>
                <Text style={styles.modalTitle}>Shop</Text>
                <View style={[styles.grid, { gap }]}>
                  {items.map((it) => (
                    <Pressable
                      key={it.id}
                      onPress={() => buyItem(it)}
                      style={[
                        styles.gridItem,
                        { width: gridItemW, height: gridItemW + 20 },
                        owned[it.id] && styles.ownedItem,
                      ]}
                    >
                      <Image source={it.icon} style={styles.gridIcon} resizeMode="contain" />
                      <View style={styles.pricePill}>
                        <Image source={COOKIE_ICON} style={{ width: 12, height: 12 }} />
                        <Text style={styles.priceText}>{owned[it.id] ? 'Owned' : it.cost}</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
                <Pressable onPress={() => setShopOpen(false)} style={styles.closeBtn}>
                  <Text style={styles.closeText}>Close</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#000' },
  bg: { flex: 1 },
  safe: { flex: 1 },

  topRow: { flexDirection: 'row', alignItems: 'center', zIndex: 10 },
  titlePill: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 55, 35, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: { color: '#FFF', fontWeight: '900' },
  coinsPill: {
    borderRadius: 12,
    backgroundColor: 'rgba(15, 55, 35, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  coinsText: { color: '#FFF', fontWeight: '900' },

  raisedContent: { flex: 1 },

  downsizeBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(15, 55, 35, 0.5)',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 32,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  downsizeBtnDisabled: { opacity: 0.3 },
  downsizeText: { color: '#FFF', fontWeight: '800', fontSize: 12 },
  downsizeTextDisabled: { color: '#AAA' },

  roomArea: { flex: 1 },
  item: { position: 'absolute' },

  sideLeft: { position: 'absolute', transform: [{ translateY: -50 }] },
  sideRight: { position: 'absolute', transform: [{ translateY: -50 }] },

  plusBtn: {
    backgroundColor: 'rgba(15, 55, 35, 0.6)',
    width: 50,
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusText: { color: '#FFF', fontSize: 28, fontWeight: '900' },

  bunnyWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },

  growWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  growBtn: { backgroundColor: '#E7C35A', borderRadius: 14, alignItems: 'center', justifyContent: 'center', elevation: 5 },
  growBtnDisabled: { opacity: 0.5 },
  growText: { color: '#2B2106', fontWeight: '900' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  modalCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 16, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#161616', marginBottom: 12 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  gridItem: { backgroundColor: '#F0F0F0', borderRadius: 12, alignItems: 'center', justifyContent: 'center', padding: 8, borderWidth: 1, borderColor: '#DDD' },
  ownedItem: { opacity: 0.6, backgroundColor: '#E0E0E0' },

  gridIcon: { width: '70%', height: '60%' },

  pricePill: {
    marginTop: 4,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priceText: { fontSize: 12, fontWeight: '800', color: '#333' },

  closeBtn: { marginTop: 16, width: '100%', height: 44, backgroundColor: '#0F3723', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#FFF', fontWeight: '900' },
});