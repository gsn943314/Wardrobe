import { useMemo } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { CATEGORY_BY_ID } from '@/lib/categories';
import { facets, isFilterActive, toggle, type ItemFilter } from '@/lib/filter';
import type { Item } from '@/lib/types';
import { colors, radius, space } from './theme';
import { Chip, ChipRow } from './ui';

/** Search box plus one chip row per facet (category, brand, season, tag) built from the saved items. */
export function FilterBar({
  items,
  filter,
  onChange,
  hideCategories,
}: {
  items: Item[];
  filter: ItemFilter;
  onChange: (f: ItemFilter) => void;
  hideCategories?: boolean;
}) {
  const f = useMemo(() => facets(items), [items]);
  return (
    <View style={styles.wrap}>
      <View style={styles.searchRow}>
        <TextInput
          value={filter.query}
          onChangeText={(query) => onChange({ ...filter, query })}
          placeholder="搜尋名稱、品牌、標籤…"
          placeholderTextColor={colors.subtext}
          style={styles.search}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {isFilterActive(filter) ? (
          <Text
            style={styles.clear}
            onPress={() => onChange({ query: '', categories: [], brands: [], seasons: [], tags: [], slot: filter.slot })}
          >
            清除
          </Text>
        ) : null}
      </View>
      {!hideCategories && f.categories.length > 1 ? (
        <ChipRow>
          {f.categories.map((c) => (
            <Chip
              key={c.value}
              label={`${CATEGORY_BY_ID[c.value]?.label ?? c.value} ${c.count}`}
              selected={filter.categories.includes(c.value)}
              onPress={() => onChange({ ...filter, categories: toggle(filter.categories, c.value) })}
            />
          ))}
        </ChipRow>
      ) : null}
      {f.brands.length > 1 ? (
        <ChipRow>
          {f.brands.map((b) => (
            <Chip
              key={b.value}
              label={`${b.value} ${b.count}`}
              selected={filter.brands.some((x) => x.toLowerCase() === b.value.toLowerCase())}
              onPress={() => onChange({ ...filter, brands: toggle(filter.brands, b.value) })}
            />
          ))}
        </ChipRow>
      ) : null}
      {f.seasons.length || f.tags.length ? (
        <ChipRow>
          {f.seasons.map((s) => (
            <Chip
              key={`s-${s.value}`}
              label={`📅 ${s.value}`}
              selected={filter.seasons.includes(s.value)}
              onPress={() => onChange({ ...filter, seasons: toggle(filter.seasons, s.value) })}
            />
          ))}
          {f.tags.map((t) => (
            <Chip
              key={`t-${t.value}`}
              label={`#${t.value}`}
              selected={filter.tags.includes(t.value)}
              onPress={() => onChange({ ...filter, tags: toggle(filter.tags, t.value) })}
            />
          ))}
        </ChipRow>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: space(1) },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space(4), paddingTop: space(2), paddingBottom: space(1) },
  search: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius,
    paddingHorizontal: space(3),
    paddingVertical: space(2),
    fontSize: 15,
    color: colors.text,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  clear: { marginLeft: space(3), color: colors.subtext, fontSize: 14 },
});
