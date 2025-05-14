import { Image } from 'expo-image';
import { StyleSheet, TextInput } from 'react-native'; // Import TextInput
import { useSQLiteContext } from 'expo-sqlite'; 

import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button, Alert, View, Text } from 'react-native';
import { getEntryById, JsonEntry, hasEntries } from '../../db/vector_db';
import useExistingDB from '@/hooks/useDB';
import React, { useState } from 'react'; // Import useState

export default function HomeScreen() {
  
  const db = useExistingDB(); 
  const [specificId, setSpecificId] = useState(''); // State for the TextInput

  const onPressGetEntries = async () => {
    console.log("Button 'Check Entries' pressed.");
    console.log("onPressGetEntries called"); // <--- Add this
    console.log("Current db object:", db); // <--- Add this
    console.log("Current db.$client:", db ? db.$client : 'db is null'); // <--- Add this

    if (!db || !db.$client) { 
      console.log("Database context not available for onPressGetEntries"); // <--- Add this
      setTimeout(() => {
        Alert.alert("Error", "Database context not available.");
      }, 0);
      return;
    }
    try {
      const entriesDoExist = await hasEntries(db.$client); 
      if (entriesDoExist) {
        setTimeout(() => {
          Alert.alert("Database Status", "The database has entries.");
        }, 0);
      } else {
        setTimeout(() => {
          Alert.alert("Database Status", "The database is empty or 'my_table' does not exist/is empty.");
        }, 0);
      }
    } catch (error) {
      console.error("Failed to check for entries:", error);
      setTimeout(() => {
        Alert.alert("Error", "An error occurred while checking for entries.");
      }, 0);
    }
  };

  const onPressGetSpecificEntry = async () => { // Removed id parameter, will use state
    console.log("onPressGetSpecificEntry called"); // <--- Add this
    console.log("Current db object:", db); // <--- Add this
    console.log("Current db.$client:", db ? db.$client : 'db is null'); // <--- Add this
    console.log("Specific ID from state:", specificId); // <--- Add this

    if (!db || !db.$client) { 
      console.log("Database context not available for onPressGetSpecificEntry"); // <--- Add this
      setTimeout(() => {
        Alert.alert("Error", "Database context not available.");
      }, 0);
      return;
    }
    const idToFetch = parseInt(specificId, 10);
    console.log("Parsed idToFetch:", idToFetch); // <--- Add this
    if (isNaN(idToFetch)) {
      console.log("Invalid ID entered"); // <--- Add this
      setTimeout(() => {
        Alert.alert("Invalid ID", "Please enter a valid number for the ID.");
      }, 0);
      return;
    }
    try {
      const entry = await getEntryById(db.$client, idToFetch); 
      if (entry) {
        setTimeout(() => {
          Alert.alert("Entry Found", `Text: ${entry.text}`);
        }, 0);
      } else {
        setTimeout(() => {
          Alert.alert("Entry Not Found", `No entry with id ${idToFetch}.`);
        }, 0);
      }
    } catch (error) {
      console.error(`Failed to get entry ${idToFetch}:`, error);
      setTimeout(() => {
        Alert.alert("Error", `An error occurred while fetching entry ${idToFetch}.`);
      }, 0);
    }
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('../../assets/images/database_pic.png')}
          style={styles.dbLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">SQLite DB Test</ThemedText>
      </ThemedView>

      <ThemedView style={styles.contentContainer}>
        <ThemedText>Database section</ThemedText>
        {!db && <ThemedText style={{color: 'orange'}}>Database context initializing or not available...</ThemedText>}
        {db && <ThemedText style={{color: 'green'}}>Database loaded: Dataset.db</ThemedText>}
      </ThemedView>

      <Button
        onPress={onPressGetEntries}
        title="Check Entries in Current DB"
        color="#0047AB"
        accessibilityLabel="Check if the current DB has entries"
        disabled={!db} 
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Enter ID to fetch"
          keyboardType="numeric"
          value={specificId}
          onChangeText={setSpecificId}
          placeholderTextColor="#888"
        />
        <Button
          onPress={onPressGetSpecificEntry} 
          title="Get Entry by ID"
          color="#0047AB"
          accessibilityLabel="Get a specific entry by the ID entered"
          disabled={!db || !specificId} // Disable if no ID entered or DB not ready
        />
      </View>
      
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  dbLogo: {
    height: 0,
    width: 0,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16, // Added padding for consistency
  },
  contentContainer: {
    gap: 8,
    padding: 16,
  },
  inputContainer: { // Styles for the TextInput and its Button
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  textInput: { // Basic styling for TextInput
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 4,
    fontSize: 16,
    color: '#333', // Adjust text color for light/dark mode if needed
  },
});
