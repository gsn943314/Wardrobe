import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { DialogHost } from '@/components/Dialog';
import { colors } from '@/components/theme';
import { WardrobeProvider, useWardrobe } from '@/store/WardrobeStore';

function Screens() {
  const { loaded } = useWardrobe();
  if (!loaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator />
      </View>
    );
  }
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.bg },
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="item/new" options={{ title: '加入試衣間', presentation: 'modal' }} />
      <Stack.Screen name="item/[id]/index" options={{ title: '' }} />
      <Stack.Screen name="item/[id]/edit" options={{ title: '編輯單品' }} />
      <Stack.Screen name="outfit/[id]" options={{ title: '搭配' }} />
      <Stack.Screen name="tryon/[outfitId]" options={{ title: '試穿' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <WardrobeProvider>
        <StatusBar style="dark" />
        <Screens />
        <DialogHost />
      </WardrobeProvider>
    </GestureHandlerRootView>
  );
}
