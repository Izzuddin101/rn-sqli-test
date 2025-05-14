import { Tabs } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Platform, View, Text, ActivityIndicator } from 'react-native';
import { SQLiteProvider } from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import { HapticTab } from '@/components/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import Feather from '@expo/vector-icons/Feather';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

const REMOTE_DB_URL = 'https://drive.google.com/uc?export=download&id=1c0JyZJSXpAHUBpTW4xJQ1OL6K9ptVIjB'; // Your direct download link
const LOCAL_DB_NAME = 'dataset.db';
const LOCAL_DB_DIRECTORY = `${FileSystem.documentDirectory}SQLite/`;
const LOCAL_DB_URI = `${LOCAL_DB_DIRECTORY}${LOCAL_DB_NAME}`;

async function ensureDirExists(dir: string) {
  const dirInfo = await FileSystem.getInfoAsync(dir);
  if (!dirInfo.exists) {
    console.log("SQLite directory doesn't exist, creating...");
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [dbLoaded, setDbLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const downloadDatabase = async () => {
      try {
        setIsLoading(true);
        setError(null);
        await ensureDirExists(LOCAL_DB_DIRECTORY);

        // Check if DB already exists (optional: add logic to force re-download if needed)
        const fileInfo = await FileSystem.getInfoAsync(LOCAL_DB_URI);
        if (fileInfo.exists) {
          console.log('Database already exists locally.');
          setDbLoaded(true);
          setIsLoading(false);
          return;
        }

        console.log(`Downloading database from ${REMOTE_DB_URL} to ${LOCAL_DB_URI}...`);
        const downloadResult = await FileSystem.downloadAsync(
          REMOTE_DB_URL,
          LOCAL_DB_URI
        );

        if (downloadResult.status === 200) {
          console.log('Database downloaded successfully.');
          setDbLoaded(true);
        } else {
          throw new Error(`Failed to download database. Status: ${downloadResult.status}`);
        }
      } catch (e: any) {
        console.error('Failed to download or setup database:', e);
        setError(e.message || 'An unknown error occurred during database setup.');
      } finally {
        setIsLoading(false);
      }
    };

    downloadDatabase();
  }, []);

  const handleDbError = (e: Error) => {
    console.error("SQLiteProvider Error:", e.message);
    setError(`SQLiteProvider Error: ${e.message}`);
    setDbLoaded(false); // Ensure UI reflects DB is not usable
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
        <Text>Loading database...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: 'red', textAlign: 'center' }}>Error loading database:</Text>
        <Text style={{ color: 'red', textAlign: 'center', marginTop: 10 }}>{error}</Text>
        <Text style={{ marginTop: 20, textAlign: 'center' }}>Please check your internet connection and ensure the Google Drive link is correct and publicly accessible.</Text>
      </View>
    );
  }

  if (!dbLoaded) {
    // This state might be hit if download failed silently or another issue
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Database not available. Please restart the app.</Text>
      </View>
    );
  }

  return (
    <SQLiteProvider
      databaseName={LOCAL_DB_NAME} // Use the name of the downloaded file
      options={{ useNewConnection: true }}
      onError={handleDbError}
      // assetSource is no longer used here
    >
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarBackground: TabBarBackground,
          tabBarStyle: Platform.select({
            ios: {
              position: 'absolute',
            },
            default: {},
          }),
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Database',
            tabBarIcon: ({ color }) => <Feather name="database" size={24} color={Colors[colorScheme ?? 'light'].text} />,
          }}
        />
        <Tabs.Screen
          name="Chat"
          options={{
            title: 'LLM Test',
            tabBarIcon: ({ color }) => <MaterialCommunityIcons name="format-text-variant-outline" size={24} color={Colors[colorScheme ?? 'light'].text} />,
          }}
        />
        <Tabs.Screen
          name="Embed"
          options={{
            title: 'Embed Test',
            tabBarIcon: ({ color }) => <MaterialCommunityIcons name="format-text-variant-outline" size={24} color={Colors[colorScheme ?? 'light'].text} />,
          }}
        />
        </Tabs>
    </SQLiteProvider>
  );
}
