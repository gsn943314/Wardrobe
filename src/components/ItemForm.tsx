import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CATEGORIES, seasonSuggestions, type CategoryId } from '@/lib/categories';
import { saveItemImages } from '@/lib/files';
import { promptFor } from '@/lib/tryon/plan';
import type { Item } from '@/lib/types';
import { useWardrobe } from '@/store/WardrobeStore';
import { colors, radius, space } from './theme';
import { Button, Chip, ChipRow, Field, SectionTitle } from './ui';
import { showDialog } from '@/components/Dialog';

export type ItemDraft = Omit<Item, 'id' | 'createdAt' | 'updatedAt'> & { id?: string; createdAt?: number };

export function emptyDraft(): ItemDraft {
  return {
    title: '',
    brand: '',
    category: 'other',
    tags: [],
    images: [],
    sourceImages: [],
    coverIndex: 0,
    tryOnImageIndex: 0,
  };
}

/** Add / edit form shared by "new item" and "edit item". */
export function ItemForm({ initial, onSaved }: { initial: ItemDraft; onSaved: (item: Item) => void }) {
  const { saveItem, items } = useWardrobe();
  const [d, setD] = useState<ItemDraft>(initial);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<ItemDraft>) => setD((prev) => ({ ...prev, ...patch }));

  const knownSeasons = useMemo(() => {
    const fromItems = items.map((i) => i.season).filter((s): s is string => !!s);
    return [...new Set([...fromItems, ...seasonSuggestions()])];
  }, [items]);
  const knownTags = useMemo(
    () => [...new Set(items.flatMap((i) => i.tags))].filter((t) => !d.tags.includes(t)).slice(0, 12),
    [items, d.tags],
  );

  const removeImage = (idx: number) => {
    const images = d.images.filter((_, i) => i !== idx);
    const fix = (n: number) => (n === idx ? 0 : n > idx ? n - 1 : n);
    set({ images, coverIndex: fix(d.coverIndex), tryOnImageIndex: fix(d.tryOnImageIndex) });
  };

  const addFromGallery = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.9 });
    if (!res.canceled) set({ images: [...d.images, ...res.assets.map((a) => a.uri)] });
  };

  const addTag = (raw: string) => {
    const tags = raw
      .split(/[,，#\s]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    if (tags.length) set({ tags: [...new Set([...d.tags, ...tags])] });
    setTagInput('');
  };

  const save = async () => {
    if (!d.title.trim()) return showDialog('請輸入名稱');
    if (!d.images.length) return showDialog('至少需要一張圖片', '可以從相簿加入截圖。');
    setSaving(true);
    try {
      const id = d.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const images = await saveItemImages(id, d.images);
      const item = saveItem({
        ...d,
        id,
        title: d.title.trim(),
        brand: d.brand.trim(),
        images,
        tags: tagInput ? [...d.tags, tagInput.trim()] : d.tags,
      });
      onSaved(item);
    } finally {
      setSaving(false);
    }
  };

  const autoPrompt = promptFor({ ...d, id: '', createdAt: 0, updatedAt: 0, tryOnPrompt: undefined });

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <SectionTitle>圖片（點一下設為封面，長按設為試穿用圖）</SectionTitle>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {d.images.map((uri, i) => (
            <Pressable
              key={`${uri}-${i}`}
              onPress={() => set({ coverIndex: i })}
              onLongPress={() => set({ tryOnImageIndex: i })}
              style={styles.thumbWrap}
            >
              <Image source={{ uri }} style={styles.thumb} contentFit="cover" />
              <View style={styles.badges}>
                {i === d.coverIndex ? <Text style={styles.badge}>封面</Text> : null}
                {i === d.tryOnImageIndex ? <Text style={[styles.badge, styles.badgeTry]}>試穿</Text> : null}
              </View>
              <Text style={styles.remove} onPress={() => removeImage(i)}>
                ✕
              </Text>
            </Pressable>
          ))}
          <Pressable onPress={addFromGallery} style={[styles.thumb, styles.addThumb]}>
            <Text style={styles.addText}>＋{'\n'}相簿</Text>
          </Pressable>
        </ScrollView>
        <Text style={styles.hint}>試穿用圖選「只有衣服、背景乾淨」的那張效果最好。</Text>

        <SectionTitle>基本資料</SectionTitle>
        <Field label="名稱" value={d.title} onChangeText={(title) => set({ title })} placeholder="例如：寬版圓領T恤" />
        <Field label="品牌" value={d.brand} onChangeText={(brand) => set({ brand })} placeholder="例如：UNIQLO" />
        <Field label="價格" value={d.priceText ?? ''} onChangeText={(priceText) => set({ priceText })} placeholder="TWD 590" />

        <SectionTitle>分類</SectionTitle>
        <View style={styles.wrapRow}>
          {CATEGORIES.map((c) => (
            <View key={c.id} style={styles.wrapItem}>
              <Chip label={c.label} selected={d.category === c.id} onPress={() => set({ category: c.id as CategoryId })} />
            </View>
          ))}
        </View>

        <SectionTitle>季節／系列</SectionTitle>
        <Field label="" value={d.season ?? ''} onChangeText={(season) => set({ season })} placeholder="例如：2026 秋冬" />
        <ChipRow style={styles.flushRow}>
          {knownSeasons.map((s) => (
            <Chip key={s} label={s} selected={d.season === s} onPress={() => set({ season: d.season === s ? undefined : s })} />
          ))}
        </ChipRow>

        <SectionTitle>標籤</SectionTitle>
        <View style={styles.wrapRow}>
          {d.tags.map((t) => (
            <View key={t} style={styles.wrapItem}>
              <Chip label={`#${t} ✕`} selected onPress={() => set({ tags: d.tags.filter((x) => x !== t) })} />
            </View>
          ))}
        </View>
        <Field
          label=""
          value={tagInput}
          onChangeText={setTagInput}
          onSubmitEditing={() => addTag(tagInput)}
          placeholder="輸入標籤後按 Enter，例如：上班、約會"
          returnKeyType="done"
        />
        {knownTags.length ? (
          <ChipRow style={styles.flushRow}>
            {knownTags.map((t) => (
              <Chip key={t} label={`＋${t}`} onPress={() => set({ tags: [...d.tags, t] })} />
            ))}
          </ChipRow>
        ) : null}

        <SectionTitle>介紹與連結</SectionTitle>
        <Field
          label="商品連結"
          value={d.url ?? ''}
          onChangeText={(url) => set({ url })}
          autoCapitalize="none"
          keyboardType="url"
          placeholder="https://"
        />
        <Field label="描述" value={d.description ?? ''} onChangeText={(description) => set({ description })} multiline />
        <Field label="我的筆記" value={d.notes ?? ''} onChangeText={(notes) => set({ notes })} multiline placeholder="尺寸、想搭配什麼…" />

        <SectionTitle>試穿指令（進階，可留白）</SectionTitle>
        <Field
          label=""
          value={d.tryOnPrompt ?? ''}
          onChangeText={(tryOnPrompt) => set({ tryOnPrompt })}
          multiline
          placeholder={autoPrompt}
        />
        <Text style={styles.hint}>留白會自動使用上面灰字的英文指令。描述越具體（顏色、材質、版型）效果越好。</Text>

        <Button title="儲存到試衣間" onPress={save} loading={saving} style={{ marginTop: space(6) }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space(4), paddingBottom: space(16) },
  thumbWrap: { marginRight: space(2) },
  thumb: { width: 96, height: 120, borderRadius: radius, backgroundColor: colors.chip },
  addThumb: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: colors.subtext },
  addText: { color: colors.subtext, textAlign: 'center' },
  badges: { position: 'absolute', left: 4, bottom: 4, flexDirection: 'row' },
  badge: {
    backgroundColor: colors.accent,
    color: colors.accentText,
    fontSize: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
    marginRight: 3,
  },
  badgeTry: { backgroundColor: '#8A5A00' },
  remove: {
    position: 'absolute',
    top: 2,
    right: 4,
    color: '#fff',
    fontWeight: '700',
    textShadowColor: '#000',
    textShadowRadius: 3,
    padding: 4,
  },
  hint: { fontSize: 12, color: colors.subtext, marginTop: space(1), lineHeight: 17 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap' },
  wrapItem: { marginBottom: space(2) },
  flushRow: { paddingHorizontal: 0 },
});
