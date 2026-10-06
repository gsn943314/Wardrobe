import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SLOTS, type SlotId } from '@/lib/categories';
import type { Item, Outfit } from '@/lib/types';
import { colors, radius, space } from './theme';

const ORDER: Exclude<SlotId, 'accessory'>[] = ['hat', 'outer', 'top', 'onepiece', 'bottom', 'shoes'];

/** Flat-lay summary of an outfit: one tile per filled slot, in head-to-toe order. */
export function OutfitBoard({
  outfit,
  getItem,
  size = 72,
  onPressSlot,
}: {
  outfit: Pick<Outfit, 'slots' | 'accessories'>;
  getItem: (id?: string) => Item | undefined;
  size?: number;
  onPressSlot?: (slot: SlotId) => void;
}) {
  const tiles: { key: string; slot: SlotId; item: Item }[] = [];
  for (const slot of ORDER) {
    const item = getItem(outfit.slots[slot]);
    if (item) tiles.push({ key: slot, slot, item });
  }
  outfit.accessories.forEach((id) => {
    const item = getItem(id);
    if (item) tiles.push({ key: `acc-${id}`, slot: 'accessory', item });
  });

  if (!tiles.length) return <Text style={styles.empty}>還沒選任何單品</Text>;

  return (
    <View style={styles.row}>
      {tiles.map(({ key, slot, item }) => (
        <Pressable key={key} onPress={() => onPressSlot?.(slot)} style={[styles.tile, { width: size }]}>
          <Image
            source={{ uri: item.images[item.coverIndex] ?? item.images[0] }}
            style={{ width: size, height: size * 1.2, borderRadius: radius - 4 }}
            contentFit="cover"
          />
          <Text style={styles.label} numberOfLines={1}>
            {SLOTS.find((s) => s.id === slot)?.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2) },
  tile: { alignItems: 'center' },
  label: { fontSize: 11, color: colors.subtext, marginTop: 2 },
  empty: { color: colors.subtext, fontSize: 13, paddingVertical: space(4) },
});
