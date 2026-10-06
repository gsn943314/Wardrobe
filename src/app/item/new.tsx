import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { emptyDraft, ItemForm, type ItemDraft } from '@/components/ItemForm';
import { colors, space } from '@/components/theme';
import { Button, Field } from '@/components/ui';
import { takeDraft } from '@/lib/draft';
import { extractUrl, fetchProduct, type ParsedProduct } from '@/lib/productParser';
import { useWardrobe } from '@/store/WardrobeStore';

function draftFrom(p: ParsedProduct): ItemDraft {
  return {
    ...emptyDraft(),
    url: p.url,
    title: p.title,
    brand: p.brand,
    description: p.description,
    priceText: p.priceText,
    category: p.category,
    season: p.season,
    tags: p.tags,
    images: p.images,
    sourceImages: p.images,
  };
}

export default function NewItemScreen() {
  const params = useLocalSearchParams<{ from?: string }>();
  const { items } = useWardrobe();
  const [draft, setDraft] = useState<ItemDraft | null>(() => {
    const p = params.from === 'browser' ? takeDraft() : null;
    return p ? draftFrom(p) : null;
  });
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pinterest-style flow without share-sheet support in Expo Go: copy a link anywhere, open here.
  useEffect(() => {
    if (draft) return;
    Clipboard.getStringAsync()
      .then((text) => {
        const found = extractUrl(text);
        if (found) setUrl(found);
      })
      .catch(() => {});
  }, [draft]);

  const load = async () => {
    const target = extractUrl(url) ?? url.trim();
    if (!/^https?:\/\//i.test(target)) return setError('請貼上 http(s) 開頭的商品連結');
    setError('');
    setLoading(true);
    try {
      const p = await fetchProduct(target);
      if (!p.images.length || !p.title) {
        setError('這個網站的商品資料要等網頁跑完才看得到。請用「在內建瀏覽器開啟」，再按「加入試衣間」。');
        return;
      }
      setDraft(draftFrom(p));
    } catch (e) {
      setError(`${(e as Error).message}。可以改用內建瀏覽器開啟。`);
    } finally {
      setLoading(false);
    }
  };

  if (draft) {
    const duplicate = draft.url ? items.find((i) => i.url === draft.url) : undefined;
    return (
      <View style={{ flex: 1 }}>
        {duplicate ? (
          <Text style={styles.warn} onPress={() => router.replace(`/item/${duplicate.id}`)}>
            這件已經在試衣間了（點這裡查看）。繼續儲存會新增一筆。
          </Text>
        ) : null}
        <ItemForm initial={draft} onSaved={(item) => router.replace(`/item/${item.id}`)} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.lead}>貼上商品連結，自動抓名稱、品牌、價格和圖片。</Text>
      <Field
        label="商品連結"
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        placeholder="https://..."
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title="讀取商品" onPress={load} loading={loading} disabled={!url.trim()} />
      <Button
        title="在內建瀏覽器開啟"
        variant="secondary"
        style={styles.gap}
        disabled={!url.trim()}
        onPress={() => router.navigate({ pathname: '/browse', params: { url: extractUrl(url) ?? url.trim() } })}
      />
      <View style={styles.divider} />
      <Button title="手動新增（用相簿裡的照片或截圖）" variant="secondary" onPress={() => setDraft(emptyDraft())} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space(4) },
  lead: { fontSize: 15, color: colors.text, marginBottom: space(4), lineHeight: 21 },
  error: { color: colors.danger, marginBottom: space(3), lineHeight: 19 },
  gap: { marginTop: space(3) },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: space(6) },
  warn: { backgroundColor: colors.highlight, color: colors.text, padding: space(3), fontSize: 13 },
});
