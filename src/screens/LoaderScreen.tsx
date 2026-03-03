import React, { useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ImageBackground,
  Image,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Loader'>;

const BG = require('../assets/bg.png');
const CENTER_IMG = require('../assets/logo.png');

export default function LoaderScreen({ navigation }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isSmall = height < 700;

  const centerSize = Math.round(
    Math.max(170, Math.min(280, width * (isSmall ? 0.52 : 0.6)))
  );

  const webW = Math.round(Math.min(260, width - 40));
  const webH = 70;

  const html = useMemo(
    () => `
<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
    <style>
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        background: transparent;
        overflow: hidden;
      }

      .stage {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
      }

      .loader {
        display: flex;
        position: relative;
        justify-items: center;
        align-items: center;
        gap: 1rem;
        height: 55px;
        width: 200px;
        overflow: hidden;
      }

      .container {
        width: 100%;
        display: flex;
        flex-direction: column;
        height: 200px;
        position: relative;
        align-items: center;
      }

      .carousel {
        display: flex;
        gap: 1rem;
        flex-direction: column;
        position: absolute;
        width: 100%;
        transform-origin: center;
        animation-delay: 2s;
      }

      .loader .container:nth-child(3) {
        justify-content: flex-start;
        justify-items: flex-start;
        animation: scroll-up 4s infinite ease-in-out;
        animation-delay: 3s;
      }

      .loader .container:nth-child(2) {
        justify-content: flex-end;
        justify-items: flex-end;
        animation: scroll-down 4s infinite ease-in-out;
        animation-delay: 3s;
      }

      .loader .container:nth-child(1) {
        justify-content: flex-end;
        justify-items: flex-end;
        animation: scroll-down 3s infinite ease-in-out;
        animation-delay: 3s;
      }

      .love {
        background: rgb(0, 195, 255);
        display: flex;
        width: 30px;
        height: 30px;
        position: relative;
        align-items: center;
        justify-content: center;
        left: 8px;
        margin: 0.8rem 4px;
        transform: rotate(45deg);
        animation-delay: 2s;
      }

      .love::before, .love::after {
        content: '';
        position: absolute;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: rgb(0, 217, 255);
      }

      .love::before { left: -16px; }
      .love::after { top: -16px; }

      .death {
        display: flex;
        width: 100%;
        height: 55px;
        position: relative;
        align-items: center;
        justify-content: center;
        animation: rotation 3s infinite ease-in-out;
        animation-delay: 1s;
      }

      .death:after {
        content: '';
        height: 63px;
        position: absolute;
        border-left: 12px solid rgb(30, 184, 255);
        transform: rotate(45deg);
        border-radius: 8px;
        top: -4px;
      }

      .death:before {
        content: '';
        height: 60px;
        position: absolute;
        border-left: 12px solid red;
        transform: rotate(-45deg);
      }

      .robots {
        display: flex;
        width: 100%;
        height: 55px;
        justify-content: space-between;
        background-color: #05e6ff;
        border-radius: 0 8px 8px;
        padding: 8px;
        box-sizing: border-box;
        animation-delay: 5s;
      }

      .robots::after {
        content: '';
        width: 12px;
        height: 12px;
        top: 0;
        left: 0;
        background-color: #f70b0b;
        border-radius: 50%;
        animation-delay: 2s;
        animation: blink 0.5s 2 forwards;
      }

      .robots::before {
        content: '';
        width: 12px;
        height: 12px;
        top: 0;
        left: 0;
        background-color: #ff0000;
        border-radius: 50%;
        animation-delay: 2s;
        animation: blink 0.5s 2 forwards;
      }

      @keyframes scroll-up {
        0% { transform: translateY(0); filter: blur(0); }
        30% { transform: translateY(-150%); filter: blur(10px); }
        60% { transform: translateY(0); filter: blur(0px); }
      }

      @keyframes scroll-down {
        0% { transform: translateY(0); filter: blur(0); }
        30% { transform: translateY(150%); filter: blur(10px); }
        60% { transform: translateY(0); filter: blur(0px); }
      }

      @keyframes rotation {
        20%, 100% { transform: rotate(180deg); }
      }

      @keyframes blink {
        0% { height: 0; }
        20% { height: 12px; }
        100% { height: 12px; }
      }
    </style>
  </head>
  <body>
    <div class="stage">
      <div class="loader">
        <div class="container">
          <div class="carousel">
            <div class="love"></div>
            <div class="love"></div>
            <div class="love"></div>
          </div>
        </div>

        <div class="container">
          <div class="carousel">
            <div class="death"></div>
            <div class="death"></div>
            <div class="death"></div>
          </div>
        </div>

        <div class="container">
          <div class="carousel">
            <div class="robots"></div>
            <div class="robots"></div>
            <div class="robots"></div>
          </div>
        </div>
      </div>
    </div>
  </body>
</html>
`,
    []
  );

  useEffect(() => {
    const t = setTimeout(() => {
      navigation.replace('Onboard');
    }, 5000);
    return () => clearTimeout(t);
  }, [navigation]);

  return (
    <ImageBackground source={BG} style={styles.bg} resizeMode="cover">
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerWrap}>
          <Image
            source={CENTER_IMG}
            style={[
              styles.centerImage,
              { width: centerSize, height: centerSize },
            ]}
            resizeMode="contain"
          />
        </View>

        <View
          style={[
            styles.webWrap,
            { paddingBottom: Math.max(20, insets.bottom + 20) },
          ]}
        >
          <View style={[styles.webBox, { width: webW, height: webH }]}>
            <WebView
              originWhitelist={['*']}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              showsHorizontalScrollIndicator={false}
              overScrollMode="never"
              javaScriptEnabled
              domStorageEnabled
              setBuiltInZoomControls={false}
              setDisplayZoomControls={false}
              source={{ html }}
              style={styles.web}
              androidLayerType={Platform.OS === 'android' ? 'hardware' : undefined}
            />
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  safe: { flex: 1 },

  centerWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  centerImage: {
    maxWidth: '100%',
  },

  webWrap: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },

  webBox: {
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },

  web: {
    backgroundColor: 'transparent',
  },
});