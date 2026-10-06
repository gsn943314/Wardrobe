import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { OutfitBoard } from '@/components/OutfitBoard';
import { colors, radius, space } from '@/components/theme';
import { TurntableViewer } from '@/components/TurntableViewer';
import { Button, Chip, ChipRow, Empty, SectionTitle } from '@/components/ui';
import { getDecartKey } from '@/lib/secrets';
import { estimateCostUsd, planOutfit } from '@/lib/tryon/plan';
import { runOutfitTryOn, type PassProgress } from '@/lib/tryon/run';
import type { TryOnResult } from '@/lib/types';
import { useVideoFrames } from '@/lib/useVideoFrames';
import { useWardrobe } from '@/store/WardrobeStore';

export default function TryOnScreen() {
  const { outfitId, resultId } = useLocalSearchParams<{ outfitId: string; resultId?: string }>();
  const { getOutfit } = useWardrobe();
  const outfit = getOutfit(outfitId);
  const result = outfit?.results.find((r) => r.id === resultId);

  if (!outfit) return <Empty title="找不到這套搭配" />;
  if (result) return <ResultView outfitId={outfit.id} result={result} allResults={outfit.results} />;
  return <RunView outfitId={outfit.id} />;
}

function RunView({ outfitId: id }: { outfitId: string }) {
  const { addResult, getOutfit, getItem, profile } = useWardrobe();
  const o = getOutfit(id)!;
  const passes = useMemo(() => planOutfit(o, getItem), [o, getItem]);
  const [apiKey, setApiKey] = useState<string | undefined>();
  const [progress, setProgress] = useState<Record<number, PassProgress>>({});
  const [running, setRunning] = useState(false);
  const abort = useRef<AbortController | null>(null);

  useFocusEffect(
    useCallback(() => {
      getDecartKey().then(setApiKey);
      return () => abort.current?.abort();
    }, []),
  );

  const seconds = profile.baseVideoDurationSec ?? 8;
  const cost = estimateCostUsd(passes.length, seconds);

  const start = async () => {
    if (!profile.baseVideoUri) return;
    abort.current = new AbortController();
    setRunning(true);
    setProgress({});
    try {
      const r = await runOutfitTryOn({
        apiKey,
        baseVideoUri: profile.baseVideoUri,
        passes,
        signal: abort.current.signal,
        onProgress: (p) => setProgress((prev) => ({ ...prev, [p.index]: p })),
      });
      addResult(o.id, r);
      router.replace({ pathname: '/tryon/[outfitId]', params: { outfitId: o.id, resultId: r.id } });
    } catch (e) {
      Alert.alert('試穿失敗', (e as Error).message);
    } finally {
      setRunning(false);
    }
  };

  if (!profile.baseVideoUri) {
    return (
      <View style={styles.pad}>
        <Empty title="還沒有你的基準影片" hint="到「我」分頁錄一段 6–10 秒、原地慢慢轉一圈的全身影片，試穿會套用在這支影片上。" />
        <Button title="前往設定" onPress={() => router.navigate('/me')} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Stack.Screen options={{ title: o.name }} />
      <View style={styles.card}>
        <OutfitBoard outfit={o} getItem={getItem} size={56} />
      </View>

      <SectionTitle>試穿步驟（一件一件疊上去）</SectionTitle>
      {passes.map((p, i) => {
        const st = progress[i];
        const icon = st?.status === 'done' ? '✅' : st?.status === 'running' ? '⏳' : st?.status === 'error' ? '⚠️' : `${i + 1}.`;
        return (
          <View key={p.item.id} style={styles.step}>
            <Text style={styles.stepTitle}>
              {icon} {p.label}
              {st?.detail ? `（${st.detail}）` : ''}
            </Text>
            <Text style={styles.prompt} numberOfLines={2}>
              {p.prompt}
            </Text>
          </View>
        );
      })}

      <View style={[styles.card, styles.info]}>
        {apiKey ? (
          <Text style={styles.infoText}>
            使用 Decart Lucy VTON 3.5（影片批次）。{passes.length} 個步驟 × {seconds.toFixed(0)} 秒影片，預估約 US${cost.toFixed(2)}
            ，需要幾分鐘。
          </Text>
        ) : (
          <Text style={styles.infoText}>
            尚未設定 Decart API Key → 會用「示範模式」：流程、儲存、3D 檢視都能試，但影片不會真的換衣。到「我」分頁填入 Key 才會實際生成。
          </Text>
        )}
      </View>

      <Button
        title={running ? '試穿中…' : apiKey ? '開始試穿' : '用示範模式試試看'}
        onPress={start}
        loading={running}
        disabled={!passes.length}
      />
      {running ? <Button title="取消" variant="secondary" style={{ marginTop: space(3) }} onPress={() => abort.current?.abort()} /> : null}
    </ScrollView>
  );
}

function ResultView({ outfitId: id, result: r, allResults }: { outfitId: string; result: TryOnResult; allResults: TryOnResult[] }) {
  const { deleteResult, setProfile, getOutfit, profile } = useWardrobe();
  const frames = useVideoFrames(r.videoUri);
  const base = useVideoFrames(r.videoUri === r.baseVideoUri ? undefined : r.baseVideoUri);
  const [showOriginal, setShowOriginal] = useState(false);
  const o = getOutfit(id)!;

  const remove = () =>
    Alert.alert('刪除這次試穿結果？', '', [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: () => {
          router.back();
          deleteResult(id, r.id);
        },
      },
    ]);

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Stack.Screen
        options={{
          title: o.name,
          headerRight: () => (
            <Text style={styles.headerBtn} onPress={remove}>
              刪除
            </Text>
          ),
        }}
      />
      {r.provider === 'demo' ? <Text style={styles.demo}>示範模式：這是你的原始影片，尚未實際換衣。</Text> : null}
      <TurntableViewer
        frames={frames}
        compare={base.status === 'idle' ? undefined : base}
        showCompare={showOriginal}
        direction={profile.turnDirection}
      />
      <Text style={styles.hint}>左右滑動轉身・雙指放大看細節・雙擊放大／還原</Text>

      <ChipRow style={styles.flush}>
        {base.status !== 'idle' ? (
          <>
            <Chip label="試穿後" selected={!showOriginal} onPress={() => setShowOriginal(false)} />
            <Chip label="原始" selected={showOriginal} onPress={() => setShowOriginal(true)} />
          </>
        ) : null}
        <Chip label="轉向相反？點我翻轉" onPress={() => setProfile({ turnDirection: profile.turnDirection === 1 ? -1 : 1 })} />
      </ChipRow>

      <SectionTitle>這次套用的單品</SectionTitle>
      {r.steps.map((s, i) => (
        <Text key={i} style={styles.stepTitle}>
          {i + 1}. {s}
        </Text>
      ))}
      <Text style={styles.meta}>{new Date(r.createdAt).toLocaleString()}</Text>

      {allResults.length > 1 ? (
        <>
          <SectionTitle>其他試穿紀錄</SectionTitle>
          <ChipRow style={styles.flush}>
            {allResults.map((x, i) => (
              <Chip
                key={x.id}
                label={`#${allResults.length - i}`}
                selected={x.id === r.id}
                onPress={() => router.setParams({ resultId: x.id })}
              />
            ))}
          </ChipRow>
        </>
      ) : null}

      <Button title="再試穿一次" variant="secondary" style={{ marginTop: space(6) }} onPress={() => router.replace(`/tryon/${id}`)} />
      <Button title="修改這套搭配" variant="secondary" style={{ marginTop: space(3) }} onPress={() => router.push(`/outfit/${id}`)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pad: { padding: space(4), paddingBottom: space(16) },
  card: { backgroundColor: colors.card, borderRadius: radius, padding: space(3) },
  info: { marginVertical: space(5), backgroundColor: colors.highlight },
  infoText: { fontSize: 13, color: colors.text, lineHeight: 19 },
  step: { marginBottom: space(3) },
  stepTitle: { fontSize: 14, color: colors.text, lineHeight: 21 },
  prompt: { fontSize: 11, color: colors.subtext, marginTop: 2 },
  hint: { textAlign: 'center', color: colors.subtext, fontSize: 12, marginVertical: space(2) },
  demo: {
    backgroundColor: colors.highlight,
    color: colors.text,
    padding: space(3),
    borderRadius: radius,
    marginBottom: space(3),
    fontSize: 13,
  },
  headerBtn: { color: colors.danger, fontSize: 15, paddingHorizontal: space(2) },
  flush: { paddingHorizontal: 0 },
  meta: { fontSize: 12, color: colors.subtext, marginTop: space(2) },
});
