import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, Linking, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { colors, radius, space } from '@/components/theme';
import { Button, Chip, Empty, SectionTitle } from '@/components/ui';
import { ZoomableImage } from '@/components/ZoomableImage';
import { CATEGORY_BY_ID } from '@/lib/categories';
import { hostOf } from '@/lib/productParser';
import { useWardrobe } from '@/store/WardrobeStore';
import { showDialog } from '@/components/Dialog';

/** The item "blog" page: photos, description, tags and the link back to the store. */
export default function ItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getItem, deleteItem, outfits } = useWardrobe();
  const item = getItem(id);
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const [zoomUri, setZoomUri] = useState<string | null>(null);

  if (!item) return <Empty title="找不到這件單品" />;

  const usedIn = outfits.filter((o) => Object.values(o.slots).includes(item.id) || o.accessories.includes(item.id));

  const remove = () =>
    showDialog('刪除這件單品？', '相關搭配中的這件也會被移除。', [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: () => {
          router.back();
          deleteItem(item.id);
        },
      },
    ]);

  return (
    <>
      <Stack.Screen
        options={{
          title: item.brand || '單品',
          headerRight: () => (
            <Text style={styles.headerBtn} onPress={() => router.push(`/item/${item.id}/edit`)}>
              編輯
            </Text>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <FlatList
          data={item.images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(u, i) => `${u}-${i}`}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item: uri }) => (
            <Pressable onPress={() => setZoomUri(uri)}>
              <Image source={{ uri }} style={{ width, height: width * 1.25 }} contentFit="cover" />
            </Pressable>
          )}
        />
        {item.images.length > 1 ? (
          <View style={styles.dots}>
            {item.images.map((_, i) => (
              <View key={i} style={[styles.dot, i === page && styles.dotOn]} />
            ))}
          </View>
        ) : null}

        <View style={styles.body}>
          <Text style={styles.brand}>
            {item.brand} · {CATEGORY_BY_ID[item.category]?.label}
            {item.season ? ` · ${item.season}` : ''}
          </Text>
          <Text style={styles.title}>{item.title}</Text>
          {item.priceText ? <Text style={styles.price}>{item.priceText}</Text> : null}

          {item.tags.length ? (
            <View style={styles.tags}>
              {item.tags.map((t) => (
                <Chip key={t} label={`#${t}`} />
              ))}
            </View>
          ) : null}

          {item.url ? (
            <Button
              title={`前往 ${hostOf(item.url)} 查看`}
              variant="secondary"
              style={styles.gap}
              onPress={() => Linking.openURL(item.url!)}
            />
          ) : null}
          <Button
            title="用這件開始搭配"
            style={styles.gap}
            onPress={() => router.push({ pathname: '/outfit/[id]', params: { id: 'new', with: item.id } })}
          />

          {item.description ? (
            <>
              <SectionTitle>商品介紹</SectionTitle>
              <Text style={styles.text}>{item.description}</Text>
            </>
          ) : null}
          {item.notes ? (
            <>
              <SectionTitle>我的筆記</SectionTitle>
              <Text style={styles.text}>{item.notes}</Text>
            </>
          ) : null}
          {usedIn.length ? (
            <>
              <SectionTitle>出現在 {usedIn.length} 套搭配</SectionTitle>
              {usedIn.map((o) => (
                <Text key={o.id} style={styles.link} onPress={() => router.push(`/outfit/${o.id}`)}>
                  {o.name} ›
                </Text>
              ))}
            </>
          ) : null}

          <Text style={styles.delete} onPress={remove}>
            刪除這件單品
          </Text>
        </View>
      </ScrollView>

      <Modal visible={!!zoomUri} animationType="fade" onRequestClose={() => setZoomUri(null)}>
        <View style={styles.zoomScreen}>
          {zoomUri ? <ZoomableImage uri={zoomUri} style={StyleSheet.absoluteFill} /> : null}
          <Text style={styles.close} onPress={() => setZoomUri(null)}>
            ✕
          </Text>
          <Text style={styles.zoomHint}>雙指縮放・雙擊放大</Text>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: space(16) },
  headerBtn: { fontSize: 16, color: colors.text, paddingHorizontal: space(2) },
  dots: { flexDirection: 'row', justifyContent: 'center', marginTop: space(2) },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border, marginHorizontal: 3 },
  dotOn: { backgroundColor: colors.accent },
  body: { padding: space(4) },
  brand: { fontSize: 13, color: colors.subtext },
  title: { fontSize: 20, fontWeight: '700', color: colors.text, marginTop: space(1), lineHeight: 26 },
  price: { fontSize: 16, color: colors.text, marginTop: space(2) },
  tags: { flexDirection: 'row', flexWrap: 'wrap', marginTop: space(3), rowGap: space(2) },
  gap: { marginTop: space(3) },
  text: { fontSize: 14, color: colors.text, lineHeight: 21 },
  link: { fontSize: 15, color: colors.text, paddingVertical: space(2) },
  delete: { color: colors.danger, textAlign: 'center', marginTop: space(10), padding: space(2) },
  zoomScreen: { flex: 1, backgroundColor: '#000' },
  close: { position: 'absolute', top: space(12), right: space(5), color: '#fff', fontSize: 24, padding: space(2) },
  zoomHint: {
    position: 'absolute',
    bottom: space(10),
    alignSelf: 'center',
    color: '#aaa',
    fontSize: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: radius,
    padding: space(2),
  },
});
