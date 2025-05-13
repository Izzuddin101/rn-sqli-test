import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { HapticTab } from '@/components/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const assetId = require('../../assets/dataset.db');
  console.log('Asset ID:', assetId); // Log the asset ID

  return (
    <SQLiteProvider
      databaseName="db_embed.db"
      assetSource={{
        assetId: require('../../assets/dataset.db'), // Use the resolved asset
        forceOverwrite: true, // Uncomment during development if you update the asset and want to ensure it's re-copied
      }}
      // You can add an options prop if needed, e.g., 
    >
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarBackground: TabBarBackground,
          tabBarStyle: Platform.select({
            ios: {
              // Use a transparent background on iOS to show the blur effect
              position: 'absolute',
            },
            default: {},
          }),
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Database',
            tabBarIcon: ({ color }) => <Feather name="database" size={24} color="black" />,
          }}
        />
        <Tabs.Screen
          name="text_embed"
          options={{
            title: 'Text Embedder',
            tabBarIcon: ({ color }) => <MaterialCommunityIcons name="format-text-variant-outline" size={24} color="black" />,
          }}
        />
      </Tabs>
    </SQLiteProvider>
  );
}
