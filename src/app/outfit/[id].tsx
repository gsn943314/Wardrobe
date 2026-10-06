import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';

import { FilterBar } from '@/components/FilterBar';
import { ItemCard } from '@/components/ItemCard';
import { OutfitBoard } from '@/components/OutfitBoard';
import { colors, radius, space } from '@/components/theme';
import { Button, Chip, ChipRow, Empty } from '@/components/ui';
import { SLOTS, slotOf, type SlotId } from '@/lib/categories';
import { EMPTY_FILTER, filterItems, type ItemFilter } from '@/lib/filter';
import type { Item, Outfit, OutfitSlots } from '@/lib/types';
import { useWardrobe } from '@/store/WardrobeStore';
import { showDialog } from '@/components/Dialog';

type Draft = Pick<Outfit, 'name' | 'slots' | 'accessories'>;

/** Toggle an item into its slot. A one-piece and top/bottom exclude each other. */
function applyPick(d: Draft, item: Item): Draft {
  const slot = slotOf(item.category);
  if (slot === 'accessory') {
    const has = d.accessories.includes(item.id);
    return { ...d, accessories: has ? d.accessories.filter((x) => x !== item.id) : [...d.accessories, item.id] };
  }
  const slots: OutfitSlots = { ...d.slots };
  if (slots[slot] === item.id) {
    delete slots[slot];
  } else {
    slots[slot] = item.id;
    if (slot === 'onepiece') {
      delete slots.top;
      delete slots.bottom;
    }
    if (slot === 'top' || slot === 'bottom') delete slots.onepiece;
  }
  return { ...d, slots };
}

export default function OutfitBuilder() {
  const params = useLocalSearchParams<{ id: string; with?: string }>();
  const { items, getItem, getOutfit, saveOutfit, deleteOutfit } = useWardrobe();
  const existing = params.id !== 'new' ? getOutfit(params.id) : undefined;

  const [draft, setDraft] = useState<Draft>(() => {
    if (existing) return { name: existing.name, slots: existing.slots, accessories: existing.accessories };
    const base: Draft = { name: '', slots: {}, accessories: [] };
    const first = getItem(params.with);
    return first ? applyPick(base, first) : base;
  });
  const [slot, setSlot] = useState<SlotId>(() => {
    const first = getItem(params.with);
    return first ? slotOf(first.category) : 'top';
  });
  const [filter, setFilter] = useState<ItemFilter>(EMPTY_FILTER);
  const { width } = useWindowDimensions();
  const cardWidth = (width - space(4) * 2 - space(2) * 2) / 3;

  const inSlot = useMemo(() => items.filter((i) => slotOf(i.category) === slot), [items, slot]);
  const shown = useMemo(() => filterItems(inSlot, filter), [inSlot, filter]);
  const selectedIds = new Set([...Object.values(draft.slots), ...draft.accessories]);
  const pieceCount = selectedIds.size;

  const persist = (): Outfit => {
    const name = draft.name.trim() || `搭配 ${new Date().toLocaleDateString()}`;
    return saveOutfit({ ...existing, ...draft, name });
  };

  const save = () => {
    const o = persist();
    if (!existing) router.replace(`/outfit/${o.id}`);
    else showDialog('已儲存');
  };

  const tryOn = () => {
    const o = persist();
    router.push(`/tryon/${o.id}`);
  };

  const remove = () =>
    existing &&
    showDialog('刪除這套搭配？', '試穿結果也會一起刪除。', [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: () => {
          router.back();
          deleteOutfit(existing.id);
        },
      },
    ]);

  return (
    <View style={styles.screen}>
      <Stack.Screen
        options={{
          title: existing ? existing.name : '新搭配',
          headerRight: existing
            ? () => (
                <Text style={styles.headerBtn} onPress={remove}>
                  刪除
                </Text>
              )
            : undefined,
        }}
      />
      <FlatList
        data={shown}
        keyExtractor={(i) => i.id}
        numColumns={3}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <View style={styles.board}>
              <TextInput
                value={draft.name}
                onChangeText={(name) => setDraft({ ...draft, name })}
                placeholder="幫這套取個名字"
                placeholderTextColor={colors.subtext}
                style={styles.name}
              />
              <OutfitBoard outfit={draft} getItem={getItem} onPressSlot={setSlot} />
              {existing?.results.length ? (
                <Text
                  style={styles.results}
                  onPress={() =>
                    router.push({ pathname: '/tryon/[outfitId]', params: { outfitId: existing.id, resultId: existing.results[0].id } })
                  }
                >
                  查看上次試穿結果（共 {existing.results.length} 次）›
                </Text>
              ) : null}
            </View>
            <ChipRow>
              {SLOTS.map((s) => {
                const filled = s.id === 'accessory' ? draft.accessories.length : draft.slots[s.id] ? 1 : 0;
                return <Chip key={s.id} label={filled ? `${s.label} ✓` : s.label} selected={slot === s.id} onPress={() => setSlot(s.id)} />;
              })}
            </ChipRow>
            <FilterBar items={inSlot} filter={filter} onChange={setFilter} />
          </View>
        }
        ListEmptyComponent={
          <Empty title={`試衣間裡還沒有「${SLOTS.find((s) => s.id === slot)?.label}」`} hint="到「逛街」或用＋加入幾件吧。" />
        }
        renderItem={({ item }) => (
          <ItemCard
            item={item}
            width={cardWidth}
            selected={selectedIds.has(item.id)}
            onPress={() => setDraft(applyPick(draft, item))}
            onLongPress={() => router.push(`/item/${item.id}`)}
          />
        )}
      />
      <View style={styles.footer}>
        <Button title="儲存" variant="secondary" onPress={save} style={styles.footerBtn} disabled={!pieceCount} />
        <Button
          title={`試穿這套（${pieceCount} 件）`}
          onPress={tryOn}
          style={[styles.footerBtn, styles.footerMain]}
          disabled={!pieceCount}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  headerBtn: { color: colors.danger, fontSize: 15, paddingHorizontal: space(2) },
  list: { paddingBottom: space(28) },
  row: { paddingHorizontal: space(4), gap: space(2), marginBottom: space(2) },
  board: { backgroundColor: colors.card, margin: space(4), marginBottom: space(2), padding: space(3), borderRadius: radius },
  name: { fontSize: 17, fontWeight: '600', color: colors.text, paddingVertical: space(1), marginBottom: space(2) },
  results: { marginTop: space(3), color: colors.text, fontSize: 14 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    padding: space(4),
    paddingBottom: space(6),
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  footerBtn: { flex: 1 },
  footerMain: { flex: 2, marginLeft: space(3) },
});
