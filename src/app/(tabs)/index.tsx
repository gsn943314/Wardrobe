import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { FilterBar } from '@/components/FilterBar';
import { ItemCard } from '@/components/ItemCard';
import { colors, space } from '@/components/theme';
import { Button, Empty } from '@/components/ui';
import { EMPTY_FILTER, filterItems, type ItemFilter } from '@/lib/filter';
import { sampleItems } from '@/lib/samples';
import { useWardrobe } from '@/store/WardrobeStore';

export default function ClosetScreen() {
  const { items, saveItem } = useWardrobe();
  const [filter, setFilter] = useState<ItemFilter>(EMPTY_FILTER);
  const { width } = useWindowDimensions();
  const cardWidth = (width - space(4) * 2 - space(3)) / 2;
  const shown = useMemo(() => filterItems(items, filter), [items, filter]);

  return (
    <View style={styles.screen}>
      <FlatList
        data={shown}
        keyExtractor={(i) => i.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={items.length ? <FilterBar items={items} filter={filter} onChange={setFilter} /> : null}
        ListEmptyComponent={
          items.length ? (
            <Empty title="沒有符合條件的單品" />
          ) : (
            <View>
              <Empty
                title="試衣間還是空的"
                hint={'到「逛街」分頁瀏覽品牌網站，看到喜歡的按「加入試衣間」。\n或在任何 App 複製商品連結，再按右下角＋。'}
              />
              <Button
                title="先放幾件範例單品試試看"
                variant="secondary"
                style={styles.sample}
                onPress={() => sampleItems().forEach((s) => saveItem(s))}
              />
            </View>
          )
        }
        renderItem={({ item }) => <ItemCard item={item} width={cardWidth} onPress={() => router.push(`/item/${item.id}`)} />}
      />
      <Pressable style={styles.fab} onPress={() => router.push('/item/new')}>
        <Text style={styles.fabText}>＋</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  list: { paddingBottom: space(24) },
  sample: { marginHorizontal: space(8) },
  row: { paddingHorizontal: space(4), justifyContent: 'space-between', marginBottom: space(3) },
  fab: {
    position: 'absolute',
    right: space(5),
    bottom: space(6),
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  fabText: { color: colors.accentText, fontSize: 28, lineHeight: 30 },
});
