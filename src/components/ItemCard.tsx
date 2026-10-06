import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CATEGORY_BY_ID } from '@/lib/categories';
import type { Item } from '@/lib/types';
import { colors, radius, space } from './theme';

export function ItemCard({
  item,
  width,
  selected,
  onPress,
  onLongPress,
}: {
  item: Item;
  width: number;
  selected?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  const cover = item.images[item.coverIndex] ?? item.images[0];
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={[styles.card, { width }, selected && styles.selected]}>
      <View style={[styles.imageWrap, { height: width * 1.25 }]}>
        {cover ? (
          <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} recyclingKey={item.id} />
        ) : (
          <Text style={styles.noImage}>沒有圖片</Text>
        )}
        {selected ? (
          <View style={styles.check}>
            <Text style={styles.checkText}>✓</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.meta}>
        <Text style={styles.brand} numberOfLines={1}>
          {item.brand || '—'} · {CATEGORY_BY_ID[item.category]?.label}
        </Text>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  selected: { borderColor: colors.accent },
  imageWrap: { backgroundColor: colors.chip, alignItems: 'center', justifyContent: 'center' },
  noImage: { color: colors.subtext, fontSize: 12 },
  meta: { padding: space(2) },
  brand: { fontSize: 11, color: colors.subtext },
  title: { fontSize: 13, color: colors.text, marginTop: 2, lineHeight: 17 },
  check: {
    position: 'absolute',
    top: space(2),
    right: space(2),
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: { color: colors.accentText, fontWeight: '700' },
});
