import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { OutfitBoard } from '@/components/OutfitBoard';
import { colors, radius, space } from '@/components/theme';
import { Button, Empty } from '@/components/ui';
import { useWardrobe } from '@/store/WardrobeStore';

export default function OutfitsScreen() {
  const { outfits, getItem, items } = useWardrobe();
  return (
    <FlatList
      data={outfits}
      keyExtractor={(o) => o.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <Button title="＋ 新搭配" onPress={() => router.push('/outfit/new')} disabled={!items.length} style={styles.new} />
      }
      ListEmptyComponent={
        <Empty
          title="還沒有搭配"
          hint={items.length ? '按上面的按鈕，選上衣、外套、褲子、鞋子和配件組成一套。' : '先到「逛街」把喜歡的衣服加進試衣間。'}
        />
      }
      renderItem={({ item: o }) => (
        <Pressable style={styles.card} onPress={() => router.push(`/outfit/${o.id}`)}>
          <View style={styles.head}>
            <Text style={styles.name}>{o.name}</Text>
            {o.results.length ? (
              <Text
                style={styles.tryLink}
                onPress={() => router.push({ pathname: '/tryon/[outfitId]', params: { outfitId: o.id, resultId: o.results[0].id } })}
              >
                ▶ 試穿結果 {o.results.length}
              </Text>
            ) : null}
          </View>
          <OutfitBoard outfit={o} getItem={getItem} size={56} />
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: space(4), paddingBottom: space(16) },
  new: { marginBottom: space(4) },
  card: { backgroundColor: colors.card, borderRadius: radius, padding: space(3), marginBottom: space(3) },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space(2) },
  name: { fontSize: 16, fontWeight: '600', color: colors.text, flex: 1 },
  tryLink: { fontSize: 13, color: colors.text, paddingLeft: space(2) },
});
