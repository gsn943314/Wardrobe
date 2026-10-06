import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { colors, radius, space } from '@/components/theme';
import { Button } from '@/components/ui';

/** Browsers can't embed other stores' pages, so the web preview explains the phone flow instead. */
export default function BrowseWebScreen() {
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>逛街（手機版功能）</Text>
      <Text style={styles.body}>
        在 Android 版，這裡是內建瀏覽器：打開 UNIQLO、GU、ZARA 等商品頁，按「＋ 加入試衣間」就會自動抓名稱、品牌、價格和圖片。{'\n\n'}
        網頁預覽版沒辦法嵌入其他網站，所以請改用下面的方式測試：
      </Text>
      <Button title="用相簿照片或截圖新增單品" onPress={() => router.push('/item/new')} />
      <Button title="回試衣間載入範例單品" variant="secondary" style={styles.gap} onPress={() => router.navigate('/')} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space(5), paddingTop: space(12) },
  title: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: space(3) },
  body: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 23,
    marginBottom: space(6),
    backgroundColor: colors.card,
    padding: space(4),
    borderRadius: radius,
  },
  gap: { marginTop: space(3) },
});
