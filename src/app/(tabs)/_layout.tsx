import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { colors } from '@/components/theme';

type IconName = keyof typeof Ionicons.glyphMap;

const tab = (title: string, icon: IconName) => ({
  title,
  tabBarIcon: ({ color, size }: { color: ColorValue; size: number }) => <Ionicons name={icon} color={color as string} size={size} />,
});

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.subtext,
        headerStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={tab('我的試衣間', 'shirt-outline')} />
      <Tabs.Screen name="browse" options={{ ...tab('逛街', 'globe-outline'), headerShown: false }} />
      <Tabs.Screen name="outfits" options={tab('搭配', 'layers-outline')} />
      <Tabs.Screen name="me" options={tab('我', 'person-outline')} />
    </Tabs>
  );
}
