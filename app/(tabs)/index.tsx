import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite'; // Import useSQLiteContext

import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button, Alert, View, Text } from 'react-native';
// Keep your db utility functions, but you won't call createDatabase/loadDatabaseFromAsset from here for initialization
import { getEntryById, JsonEntry, hasEntries } from '../../db/vector_db';
import useExistingDB from '@/hooks/useDB';
// import { useDrizzleStudio } from "expo-drizzle-studio-plugin";
// useState and useEffect for dbInstance are no longer needed for basic context usage
// import { useState, useEffect } from 'react';
// import * as SQLite from 'expo-sqlite'; // SQLite types might still be useful in vector_db.tsx

export default function HomeScreen() {
  
  const db = useExistingDB(); // db is a Drizzle instance

  // If you plan to use Drizzle Studio or similar tools:
  // useDrizzleStudio(db); // Pass the context's db instance

  // The onPressLoadExistingDatabase and onPressCreateDatabase buttons
  // might be redundant if the DB is always loaded by SQLiteProvider.
  // You can remove them or repurpose them if needed (e.g., for re-copying the asset via a more complex setup).

  const onPressGetEntries = async () => {
    console.log("Button 'Check Entries' pressed.");
    if (!db || !db.$client) { // Check for db and db.$client
      Alert.alert("Error", "Database context not available.");
      return;
    }
    try {
      // Pass the raw SQLite client to functions expecting SQLiteDatabase
      const entriesDoExist = await hasEntries(db.$client); 
      if (entriesDoExist) {
        Alert.alert("Database Status", "The database has entries.");
      } else {
        Alert.alert("Database Status", "The database is empty or 'my_table' does not exist/is empty.");
      }
    } catch (error) {
      console.error("Failed to check for entries:", error);
      Alert.alert("Error", "An error occurred while checking for entries.");
    }
  };

  // Example: How you might use getEntryById
  const onPressGetSpecificEntry = async (id: number) => {
    if (!db || !db.$client) { // Check for db and db.$client
      Alert.alert("Error", "Database context not available.");
      return;
    }
    try {
      // Pass the raw SQLite client
      const entry = await getEntryById(db.$client, id); 
      if (entry) {
        Alert.alert("Entry Found", `Text: ${entry.text}`);
      } else {
        Alert.alert("Entry Not Found", `No entry with id ${id}.`);
      }
    } catch (error) {
      console.error(`Failed to get entry ${id}:`, error);
      Alert.alert("Error", `An error occurred while fetching entry ${id}.`);
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('../../assets/images/react-logo.png')}
          style={styles.dbLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Vector DB Test</ThemedText>
      </ThemedView>

      <ThemedView style={styles.contentContainer}>
        <ThemedText>Welcome to the Database Screen!</ThemedText>
        {!db && <ThemedText style={{color: 'orange'}}>Database context initializing or not available...</ThemedText>}
        {db && <ThemedText style={{color: 'green'}}>Database context is available!</ThemedText>}
      </ThemedView>

      {/* 
        The "Create/Open DB" and "Load DB From Asset" buttons are likely no longer needed 
        here if SQLiteProvider handles the initial load.
        You can remove them or adapt their functionality if they serve other purposes.
      */}
      {/* <Button
        onPress={onPressCreateDatabase} // This would need to be re-thought
        title="Create/Open DB (embedDB)"
        color="#0047AB"
        accessibilityLabel="Create or open the default database"
      /> */}

      <Button
        onPress={onPressGetEntries}
        title="Check Entries in Current DB"
        color="#0047AB"
        accessibilityLabel="Check if the current DB has entries"
        disabled={!db} // Disable if db context is not yet available
      />

      {/* Example button for getEntryById */}
      <Button
        onPress={() => onPressGetSpecificEntry(1)} // Example: get entry with id 1
        title="Get Entry with ID 1"
        color="#0047AB"
        accessibilityLabel="Get a specific entry by ID"
        disabled={!db}
      />
      
      {/* <Button
        onPress={onPressLoadExistingDatabase} // This would need to be re-thought
        title="Load DB From Asset (embedDB)"
        color="#0047AB"
        accessibilityLabel="Load database from pre-bundled asset"
      /> */}
      
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  dbLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contentContainer: {
    gap: 8,
    padding: 16,
  },
});
