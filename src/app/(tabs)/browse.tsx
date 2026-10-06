import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent, type WebViewNavigation } from 'react-native-webview';

import { colors, radius, space } from '@/components/theme';
import { Chip, ChipRow } from '@/components/ui';
import { setDraft } from '@/lib/draft';
import { enrichProduct } from '@/lib/productParser';
import { EXTRACT_SCRIPT, productFromExtract, type ExtractMessage } from '@/lib/webExtractor';

const SHOPS = [
  { name: 'UNIQLO', url: 'https://www.uniqlo.com/tw/zh_TW/' },
  { name: 'GU', url: 'https://www.gu-global.com/tw/zh_TW/' },
  { name: 'ZARA', url: 'https://www.zara.com/tw/' },
  { name: 'H&M', url: 'https://www2.hm.com/zh_asia3/index.html' },
  { name: 'COS', url: 'https://www.cos.com/' },
  { name: 'Pinterest', url: 'https://www.pinterest.com/search/pins/?q=outfit' },
];

function toUrl(text: string): string {
  const t = text.trim();
  if (/^https?:\/\//i.test(t)) return t;
  if (/^[\w-]+(\.[\w-]+)+(\/|$)/.test(t)) return `https://${t}`;
  return `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(t)}`;
}

/** In-app browser: browse any store and capture the product on screen into the fitting room. */
export default function BrowseScreen() {
  const web = useRef<WebView>(null);
  const [url, setUrl] = useState(SHOPS[0].url);
  const [address, setAddress] = useState(SHOPS[0].url);
  const [nav, setNav] = useState<WebViewNavigation | null>(null);
  const [capturing, setCapturing] = useState(false);

  const go = (target: string) => {
    const u = toUrl(target);
    setUrl(u);
    setAddress(u);
  };

  // Opened from "new item" with a link that needs a real browser to render.
  const params = useLocalSearchParams<{ url?: string }>();
  const [lastParam, setLastParam] = useState(params.url);
  if (params.url && params.url !== lastParam) {
    setLastParam(params.url);
    go(params.url);
  }

  const capture = () => {
    setCapturing(true);
    web.current?.injectJavaScript(EXTRACT_SCRIPT);
    // If the page never answers (blocked script), don't leave the button spinning.
    setTimeout(() => setCapturing(false), 8000);
  };

  const onMessage = async (e: WebViewMessageEvent) => {
    let msg: ExtractMessage | { type: string; message?: string };
    try {
      msg = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    if (msg.type === 'wardrobe-extract-error') {
      setCapturing(false);
      Alert.alert('讀取這頁失敗', (msg as { message?: string }).message ?? '');
      return;
    }
    if (msg.type !== 'wardrobe-extract') return;
    const product = await enrichProduct(productFromExtract(msg as ExtractMessage));
    setCapturing(false);
    if (!product.images.length) {
      Alert.alert('這頁找不到商品圖片', '請先打開單一商品頁，等圖片載入後再按一次。');
      return;
    }
    setDraft(product);
    router.push('/item/new?from=browser');
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.bar}>
        <Pressable onPress={() => web.current?.goBack()} disabled={!nav?.canGoBack} hitSlop={8}>
          <Text style={[styles.navBtn, !nav?.canGoBack && styles.disabled]}>‹</Text>
        </Pressable>
        <TextInput
          value={address}
          onChangeText={setAddress}
          onSubmitEditing={() => go(address)}
          selectTextOnFocus
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="go"
          style={styles.address}
          placeholder="網址或關鍵字"
          placeholderTextColor={colors.subtext}
        />
        <Pressable onPress={() => web.current?.reload()} hitSlop={8}>
          <Text style={styles.navBtn}>↻</Text>
        </Pressable>
      </View>
      <ChipRow>
        {SHOPS.map((s) => (
          <Chip key={s.name} label={s.name} onPress={() => go(s.url)} />
        ))}
      </ChipRow>
      <WebView
        ref={web}
        source={{ uri: url }}
        style={styles.web}
        onNavigationStateChange={(n) => {
          setNav(n);
          if (!n.loading) setAddress(n.url);
        }}
        onMessage={onMessage}
        allowsBackForwardNavigationGestures
        setSupportMultipleWindows={false}
        startInLoadingState
        renderLoading={() => <ActivityIndicator style={StyleSheet.absoluteFill} />}
      />
      <Pressable style={styles.capture} onPress={capture} disabled={capturing}>
        {capturing ? <ActivityIndicator color={colors.accentText} /> : <Text style={styles.captureText}>＋ 加入試衣間</Text>}
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space(3), paddingVertical: space(2) },
  navBtn: { fontSize: 26, color: colors.text, paddingHorizontal: space(2) },
  disabled: { opacity: 0.25 },
  address: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius,
    paddingHorizontal: space(3),
    paddingVertical: space(2),
    fontSize: 14,
    color: colors.text,
  },
  web: { flex: 1 },
  capture: {
    position: 'absolute',
    bottom: space(5),
    alignSelf: 'center',
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: space(6),
    paddingVertical: space(3.5),
    elevation: 6,
    minWidth: 160,
    alignItems: 'center',
  },
  captureText: { color: colors.accentText, fontSize: 16, fontWeight: '700' },
});
