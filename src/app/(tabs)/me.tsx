import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radius, space } from '@/components/theme';
import { TurntableViewer } from '@/components/TurntableViewer';
import { Button, Chip, ChipRow, Field, SectionTitle } from '@/components/ui';
import { deleteFile, importVideo } from '@/lib/files';
import { getDecartKey, setDecartKey } from '@/lib/secrets';
import { useVideoFrames } from '@/lib/useVideoFrames';
import { useWardrobe } from '@/store/WardrobeStore';

export default function MeScreen() {
  const { profile, setProfile, items, outfits } = useWardrobe();
  const frames = useVideoFrames(profile.baseVideoUri);
  const [key, setKey] = useState('');
  const [hasKey, setHasKey] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getDecartKey().then((k) => setHasKey(!!k));
    }, []),
  );

  const applyVideo = (asset: ImagePicker.ImagePickerAsset) => {
    const seconds = (asset.duration ?? 0) / 1000;
    if (seconds > 15) Alert.alert('影片有點長', `這支 ${seconds.toFixed(0)} 秒。試穿按秒計費，建議 6–10 秒、轉一圈就好。`);
    const uri = importVideo(asset.uri, 'base');
    // Older try-on results keep using the previous video for before/after, so only delete it when unused.
    const old = profile.baseVideoUri;
    if (old && !outfits.some((o) => o.results.some((r) => r.baseVideoUri === old))) deleteFile(old);
    setProfile({ baseVideoUri: uri, baseVideoDurationSec: seconds || undefined });
  };

  const record = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return Alert.alert('需要相機權限才能錄影');
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['videos'], videoMaxDuration: 12, quality: 1 });
    if (!res.canceled) applyVideo(res.assets[0]);
  };

  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 1 });
    if (!res.canceled) applyVideo(res.assets[0]);
  };

  const saveKey = async () => {
    await setDecartKey(key);
    setHasKey(!!key.trim());
    setKey('');
    Alert.alert(key.trim() ? 'API Key 已儲存在手機的安全儲存區' : '已清除 API Key');
  };

  const num = (s: string) => {
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : undefined;
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <SectionTitle>我的基準影片</SectionTitle>
      {profile.baseVideoUri ? (
        <>
          <TurntableViewer frames={frames} direction={profile.turnDirection} />
          <Text style={styles.hint}>左右滑動試試看轉身方向；方向相反就點下面的「翻轉方向」。</Text>
          <ChipRow style={styles.flush}>
            <Chip label="翻轉方向" onPress={() => setProfile({ turnDirection: profile.turnDirection === 1 ? -1 : 1 })} />
            <Chip label="重新錄影" onPress={record} />
            <Chip label="從相簿換一支" onPress={pick} />
          </ChipRow>
        </>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardText}>
            錄一段自己的影片，之後所有試穿都套用在這支影片上，也能用來「左右滑動轉身」檢視。{'\n\n'}
            拍攝建議：{'\n'}• 手機固定在腰的高度，全身入鏡{'\n'}• 穿合身、素色的衣服（不要厚外套）{'\n'}• 原地慢慢轉一圈，6–10 秒{'\n'}•
            光線充足、背景單純
          </Text>
          <Button title="現在錄影" onPress={record} style={styles.gap} />
          <Button title="從相簿選影片" variant="secondary" onPress={pick} style={styles.gapSmall} />
        </View>
      )}

      <SectionTitle>身形資料（之後做尺寸建議用）</SectionTitle>
      <View style={styles.row}>
        <View style={styles.half}>
          <Field
            label="身高 cm"
            keyboardType="numeric"
            defaultValue={profile.heightCm?.toString() ?? ''}
            onEndEditing={(e) => setProfile({ heightCm: num(e.nativeEvent.text) })}
          />
        </View>
        <View style={styles.half}>
          <Field
            label="體重 kg"
            keyboardType="numeric"
            defaultValue={profile.weightKg?.toString() ?? ''}
            onEndEditing={(e) => setProfile({ weightKg: num(e.nativeEvent.text) })}
          />
        </View>
      </View>

      <SectionTitle>AI 試穿（Decart）</SectionTitle>
      <View style={styles.card}>
        <Text style={styles.cardText}>
          {hasKey ? '✅ 已設定 API Key。' : '尚未設定：試穿會用示範模式（不會真的換衣）。'}
          {'\n'}影片試穿約 US$0.04／秒／件，例如 8 秒影片 × 3 件 ≈ US$0.96。
        </Text>
        <Field
          label=""
          value={key}
          onChangeText={setKey}
          placeholder={hasKey ? '輸入新的 Key 以取代；留空按儲存可清除' : '貼上 Decart API Key'}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
        />
        <Button title="儲存 Key" variant="secondary" onPress={saveKey} />
        <Text style={styles.link} onPress={() => Linking.openURL('https://platform.decart.ai/')}>
          取得 API Key（platform.decart.ai）›
        </Text>
      </View>

      <Text style={styles.stats}>
        試衣間 {items.length} 件・搭配 {outfits.length} 套・資料只存在這支手機
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space(4), paddingBottom: space(16) },
  card: { backgroundColor: colors.card, borderRadius: radius, padding: space(4) },
  cardText: { fontSize: 14, color: colors.text, lineHeight: 21, marginBottom: space(3) },
  hint: { textAlign: 'center', color: colors.subtext, fontSize: 12, marginVertical: space(2) },
  flush: { paddingHorizontal: 0 },
  gap: { marginTop: space(2) },
  gapSmall: { marginTop: space(3) },
  row: { flexDirection: 'row', gap: space(3) },
  half: { flex: 1 },
  link: { marginTop: space(3), color: colors.text, fontSize: 13 },
  stats: { textAlign: 'center', color: colors.subtext, fontSize: 12, marginTop: space(8) },
});
