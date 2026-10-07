import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { pendingLessons } from '@/lib/schedule';
import { useApp } from '@/store/AppStore';
import { fonts } from '@/theme/tokens';
import { useColors } from '@/theme/useTheme';

/**
 * Dolny pasek zakładek. Działa tak samo na iOS, Androidzie i w przeglądarce.
 * Ikony pochodzą z zestawu Ionicons (dołączonego do Expo).
 */
export default function TabsLayout() {
  const c = useColors();
  const { lessons } = useApp();
  const pending = pendingLessons(lessons).length;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.inkFaint,
        tabBarStyle: {
          backgroundColor: c.card,
          borderTopColor: c.line,
        },
        tabBarLabelStyle: { fontFamily: fonts.sans, fontSize: 11, fontWeight: '600' },
        sceneStyle: { backgroundColor: c.paper },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dzień',
          tabBarIcon: ({ color, size }) => <Ionicons name="today-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="grafik"
        options={{
          title: 'Grafik',
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="platnosci"
        options={{
          title: 'Rozliczenia',
          tabBarBadge: pending > 0 ? pending : undefined,
          tabBarBadgeStyle: { backgroundColor: c.accent, fontSize: 10 },
          tabBarIcon: ({ color, size }) => <Ionicons name="wallet-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="uczniowie"
        options={{
          title: 'Uczniowie',
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="wiecej"
        options={{
          title: 'Więcej',
          tabBarIcon: ({ color, size }) => <Ionicons name="ellipsis-horizontal" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
