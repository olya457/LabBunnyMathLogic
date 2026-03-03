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

const COST_GROW = 200;
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

const COOKIES_KEY = 'cookies_total_v1';
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
  const plusSize = clamp(W * 0.14, 46, 56);
  const plusFont = clamp(W * 0.08, 24, 30);
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
      return () => { alive = false; };
    }, [])
  );

  const bunnyImg = useMemo(() => {
    if (stage === 0) return BUNNY_BABY;
    if (stage === 1) return BUNNY_TEEN;
    return BUNNY_ADULT;
  }, [stage]);

  const items: ShopItem[] = useMemo(() => [
    { id: 'bed', cost: 150, icon: IT_BED },
    { id: 'table', cost: 150, icon: IT_TABLE },
    { id: 'mat', cost: 150, icon: IT_MAT },
    { id: 'plant', cost: 150, icon: IT_PLANT },
    { id: 'formula', cost: 150, icon: IT_FORMULA },
  ], []);

  const persistStage = useCallback(async (next: BunnyStage) => {
    setStage(next);
    await writeNumber(ROOM_STAGE_KEY, next);
  }, []);

  const persistOwned = useCallback(async (next: Record<ShopItemId, boolean>) => {
    setOwned(next);
    await writeJSON(ROOM_OWNED_KEY, next);
  }, []);

  const spend = useCallback(async (cost: number) => {
    if (cookies < cost) return false;
    const next = cookies - cost;
    setCookies(next);
    await writeNumber(COOKIES_KEY, next);
    return true;
  }, [cookies]);

  const onGrow = useCallback(async () => {
    if (stage === 2) return;
    const ok = await spend(COST_GROW);
    if (!ok) {
      Alert.alert('Not enough cookies', `You need ${COST_GROW} cookies.`);
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

  const buyItem = useCallback(async (item: ShopItem) => {
    if (owned[item.id]) {
      Alert.alert('Already owned', 'This item is already in your room.');
      return;
    }
    if (cookies < item.cost) {
      Alert.alert('Not enough cookies', `You need ${item.cost} cookies.`);
      return;
    }
    Alert.alert('Buy item', `${item.cost} cookies`, [
      { text: 'No', style: 'cancel' },
      { text: 'Yes', onPress: async () => {
          const ok = await spend(item.cost);
          if (!ok) return;
          const next = { ...owned, [item.id]: true };
          await persistOwned(next);
        }
      },
    ]);
  }, [cookies, owned, spend, persistOwned]);

  const topPad = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0;
  const gridCols = isSmall ? 2 : 3;
  const gap = clamp(W * 0.035, 10, 14);
  const modalInnerPad = clamp(W * 0.045, 16, 18);
  const modalW = W * 0.92;
  const gridItemW = (modalW - modalInnerPad * 2 - gap * (gridCols - 1)) / gridCols;
  const gridItemRadius = clamp(W * 0.05, 16, 20);

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
              <Image source={COOKIE_ICON} style={{ width: clamp(W * 0.05, 18, 20), height: clamp(W * 0.05, 18, 20) }} resizeMode="contain" />
              <Text style={[styles.coinsText, { fontSize: coinsFont }]}>{cookies}</Text>
            </View>
          </View>

          <View style={[styles.raisedContent, { transform: [{ translateY: -40 }] }]}>
            <View style={{ paddingHorizontal: padX, paddingTop: 12 }}>
              <Pressable
                onPress={onDownsize}
                disabled={stage === 0}
                style={({ pressed }) => [
                  styles.downsizeBtn,
                  { height: clamp(H * 0.045, 32, 36), borderRadius: 10, paddingHorizontal: clamp(W * 0.04, 12, 14) },
                  stage === 0 && styles.downsizeBtnDisabled,
                  pressed && stage !== 0 && styles.pressed,
                ]}
              >
                <Text style={[styles.downsizeText, { fontSize: clamp(W * 0.04, 12, 14) }, stage === 0 && styles.downsizeTextDisabled]}>Downsize Bunny</Text>
              </Pressable>
            </View>

            <View style={styles.roomArea}>
              {owned.bed && <Image source={IT_BED} style={[styles.item, { right: clamp(W * 0.09, 28, 46), bottom: clamp(H * 0.34, 220, 270), width: clamp(W * 0.38, 120, 155), height: clamp(H * 0.13, 90, 120) }]} resizeMode="contain" />}
              {owned.table && <Image source={IT_TABLE} style={[styles.item, { left: clamp(W * 0.10, 30, 52), bottom: clamp(H * 0.36, 240, 285), width: clamp(W * 0.30, 95, 120), height: clamp(H * 0.11, 80, 105) }]} resizeMode="contain" />}
              {owned.mat && <Image source={IT_MAT} style={[styles.item, { right: clamp(W * 0.12, 36, 60), bottom: clamp(H * 0.30, 200, 230), width: clamp(W * 0.33, 105, 135), height: clamp(H * 0.09, 60, 78), opacity: 0.95 }]} resizeMode="contain" />}
              {owned.plant && <Image source={IT_PLANT} style={[styles.item, { left: clamp(W * 0.10, 30, 52), bottom: clamp(H * 0.31, 210, 240), width: clamp(W * 0.26, 84, 98), height: clamp(W * 0.26, 84, 98) }]} resizeMode="contain" />}
              {owned.formula && <Image source={IT_FORMULA} style={[styles.item, { top: clamp(H * 0.18, 110, 140), alignSelf: 'center', width: clamp(W * 0.62, 200, 240), height: clamp(H * 0.09, 70, 92), opacity: 0.9 }]} resizeMode="contain" />}

              <View style={[styles.sideLeft, { left: padX, top: '50%', gap: clamp(H * 0.02, 12, 16) }]}>
                <Pressable onPress={() => setShopOpen(true)} style={({ pressed }) => [styles.plusBtn, { width: plusSize, height: plusSize, borderRadius: 12 }, pressed && styles.pressed]}>
                  <Text style={[styles.plusText, { fontSize: plusFont }]}>{'+'}</Text>
                </Pressable>
                <Pressable onPress={() => setShopOpen(true)} style={({ pressed }) => [styles.plusBtn, { width: plusSize, height: plusSize, borderRadius: 12 }, pressed && styles.pressed]}>
                  <Text style={[styles.plusText, { fontSize: plusFont }]}>{'+'}</Text>
                </Pressable>
              </View>

              <View style={[styles.sideRight, { right: padX, top: '50%', gap: clamp(H * 0.02, 12, 16) }]}>
                <Pressable onPress={() => setShopOpen(true)} style={({ pressed }) => [styles.plusBtn, { width: plusSize, height: plusSize, borderRadius: 12 }, pressed && styles.pressed]}>
                  <Text style={[styles.plusText, { fontSize: plusFont }]}>{'+'}</Text>
                </Pressable>
                <Pressable onPress={() => setShopOpen(true)} style={({ pressed }) => [styles.plusBtn, { width: plusSize, height: plusSize, borderRadius: 12 }, pressed && styles.pressed]}>
                  <Text style={[styles.plusText, { fontSize: plusFont }]}>{'+'}</Text>
                </Pressable>
              </View>

              {/* Bunny position raised by total of 40px (20px from previous request + 20px now) */}
              <View style={[styles.bunnyWrap, { bottom: clamp(H * 0.14, 106, 130) + 40 }]}>
                <Image source={bunnyImg} style={{ width: bunnyW, height: bunnyH }} resizeMode="contain" />
              </View>

              <View style={[styles.growWrap, { paddingBottom: Math.max(insets.bottom + growBottomLift, 18) }]}>
                <Pressable
                  onPress={onGrow}
                  disabled={stage === 2}
                  style={({ pressed }) => [styles.growBtn, { width: growW, height: growH, borderRadius: 12 }, stage === 2 && styles.growBtnDisabled, pressed && stage !== 2 && styles.pressed]}
                >
                  <Text style={[styles.growText, { fontSize: growFont }]}>Grow Bunny</Text>
                </Pressable>
              </View>
            </View>
          </View>

          <Modal transparent visible={shopOpen} animationType="fade" onRequestClose={() => setShopOpen(false)}>
            <View style={styles.modalOverlay}>
              <View style={[styles.modalCard, { width: '92%', borderRadius: 22, padding: modalInnerPad }]}>
                <Text style={[styles.modalTitle, { fontSize: clamp(W * 0.07, 22, 26) }]}>Accessories</Text>
                <Text style={[styles.modalSub, { fontSize: clamp(W * 0.04, 12, 14) }]}>Tap an item to buy</Text>
                <View style={[styles.grid, { marginTop: 16, rowGap: gap, columnGap: gap }]}>
                  {items.map((it) => {
                    const isOwned = owned[it.id];
                    return (
                      <Pressable key={it.id} onPress={() => buyItem(it)} disabled={isOwned} style={({ pressed }) => [styles.gridItem, { width: gridItemW, height: gridItemW, borderRadius: gridItemRadius, opacity: isOwned ? 0.55 : 1 }, pressed && !isOwned && styles.pressed]}>
                        <Image source={it.icon} style={styles.gridIcon} resizeMode="contain" />
                        <View style={[styles.pricePill, { height: clamp(H * 0.04, 26, 28), borderRadius: 999 }]}>
                          <Image source={COOKIE_ICON} style={{ width: clamp(W * 0.04, 14, 16), height: clamp(W * 0.04, 14, 16) }} resizeMode="contain" />
                          <Text style={[styles.priceText, { fontSize: clamp(W * 0.045, 14, 16) }]}>{it.cost}</Text>
                        </View>
                        {isOwned && <View style={styles.ownedBadge} />}
                      </Pressable>
                    );
                  })}
                </View>
                <Pressable onPress={() => setShopOpen(false)} style={({ pressed }) => [styles.closeBtn, { height: clamp(H * 0.075, 50, 56), borderRadius: 16, marginTop: clamp(H * 0.02, 14, 18) }, pressed && styles.pressed]}>
                  <Text style={[styles.closeText, { fontSize: clamp(W * 0.06, 18, 20) }]}>Close</Text>
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
  titlePill: { flex: 1, borderRadius: 12, backgroundColor: 'rgba(15, 55, 35, 0.65)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  titleText: { color: 'rgba(255,255,255,0.92)', fontWeight: '900' },
  coinsPill: { borderRadius: 12, backgroundColor: 'rgba(15, 55, 35, 0.65)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  coinsText: { color: 'rgba(255,255,255,0.92)', fontWeight: '900' },
  raisedContent: { flex: 1 },
  downsizeBtn: { alignSelf: 'flex-start', backgroundColor: 'rgba(15, 55, 35, 0.35)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', justifyContent: 'center' },
  downsizeBtnDisabled: { opacity: 0.35 },
  downsizeText: { color: 'rgba(255,255,255,0.75)', fontWeight: '800' },
  downsizeTextDisabled: { color: 'rgba(255,255,255,0.55)' },
  roomArea: { flex: 1 },
  item: { position: 'absolute' },
  sideLeft: { position: 'absolute', transform: [{ translateY: -50 }] },
  sideRight: { position: 'absolute', transform: [{ translateY: -50 }] },
  plusBtn: { backgroundColor: 'rgba(15, 55, 35, 0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  plusText: { color: 'rgba(255,255,255,0.90)', fontWeight: '900', marginTop: -2 },
  bunnyWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  growWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  growBtn: { backgroundColor: '#E7C35A', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 12, shadowOffset: { width: 0, height: 10 }, elevation: 6 },
  growBtnDisabled: { opacity: 0.55 },
  growText: { color: '#2B2106', fontWeight: '900' },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.92 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  modalCard: { backgroundColor: '#F1F3F6', alignItems: 'center' },
  modalTitle: { fontWeight: '900', color: '#161616' },
  modalSub: { marginTop: 6, fontWeight: '700', color: 'rgba(0,0,0,0.45)' },
  grid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap' },
  gridItem: { backgroundColor: '#DADDE2', borderWidth: 1, borderColor: 'rgba(0,0,0,0.10)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  gridIcon: { width: '68%', height: '68%' },
  pricePill: { position: 'absolute', bottom: 10, left: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.55)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  priceText: { color: '#FFF', fontWeight: '900' },
  ownedBadge: { position: 'absolute', top: 10, right: 10, width: 10, height: 10, borderRadius: 5, backgroundColor: '#7BCB72' },
  closeBtn: { width: '100%', backgroundColor: 'rgba(15, 55, 35, 0.75)', alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#FFF', fontWeight: '900' },
});