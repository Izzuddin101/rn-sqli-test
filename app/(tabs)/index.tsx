import { Image } from 'expo-image';
import { StyleSheet } from 'react-native'; 

import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button, Alert, View, Text } from 'react-native';
import { createDatabase, getEntryById, JsonEntry, hasEntries, loadDatabaseFromAsset } from '../../components/ui/vector_db';

// --- Configuration for your bundled SQLite file ---
const BUNDLED_SQLITE_ASSET_NAME = "embedDB.sqlite"; 
// const TARGET_DATABASE_NAME = "vdb-pbot-offline"; 

export default function HomeScreen() {

  const onPressLoadExistingDatabase = async () => {
    // Loads the db in asset already
    const result = await loadDatabaseFromAsset();

    if (result.success) {
      Alert.alert(
        "Asset DB Loaded",
        result.message
      );
      if (result.db) {
        // Optionally, you can store the db instance if needed for other operations
        // setDbInstance(result.db);
        // If you don't need to hold onto the db object here, you can simply use it and let it go.
        // For example, if you wanted to immediately close it (though usually not necessary with expo-sqlite):
        // await result.db.closeAsync();
        // console.log(`Closed database from asset ${BUNDLED_SQLITE_ASSET_NAME} after check.`);
      }
    } else {
      Alert.alert("Error", result.message);
    }
  };

  // --- Deperecated Function to load dataset as its redundant to create and copy ---
  // const onPressLoadDataset = async () => {
  //   try {
  //     const asset = Asset.fromModule(require(`../../assets/${BUNDLED_SQLITE_ASSET_NAME}`));
  //     const dbDirectory = `${FileSystem.documentDirectory}SQLite/`;
  //     const dbFilePath = `${dbDirectory}${TARGET_DATABASE_NAME}.sqlite`;

  //     await FileSystem.makeDirectoryAsync(dbDirectory, { intermediates: true });

  //     // Check if the database file already exists in the target directory
  //     const dbInfo = await FileSystem.getInfoAsync(dbFilePath);

  //     // If it exists, delete it to ensure a fresh copy from assets.
  //     // For a production app, you might want a more nuanced update strategy,
  //     // but for ensuring the bundled asset is loaded correctly, this is effective.
  //     if (dbInfo.exists) {
  //       console.log(`Existing database file "${TARGET_DATABASE_NAME}.sqlite" found. Deleting to ensure fresh copy from assets.`);
  //       await FileSystem.deleteAsync(dbFilePath, { idempotent: true });
  //     }

  //     // Now, copy the database from assets.
  //     console.log(`Copying database "${BUNDLED_SQLITE_ASSET_NAME}" from assets to "${dbFilePath}"...`);
  //     if (!asset.downloaded) {
  //       await asset.downloadAsync();
  //     }
  //     if (!asset.localUri) {
  //       throw new Error("Asset could not be downloaded or its local URI is unavailable.");
  //     }
  //     await FileSystem.copyAsync({
  //       from: asset.localUri,
  //       to: dbFilePath,
  //     });
  //     Alert.alert("Setup Complete", `Database "${TARGET_DATABASE_NAME}.sqlite" freshly copied from assets.`);
  //     console.log(`Database "${TARGET_DATABASE_NAME}.sqlite" freshly copied from assets to ${dbFilePath}`);

  //     // Now, open the database.
  //     // createDatabase() will open the 'vdb-pbot-offline.sqlite' file we just copied.
  //     const db = await createDatabase(); 

  //     if (db) {
  //       // Verify if the database (now a fresh copy of output.sqlite) has entries in 'my_table'.
  //       const entriesExist = await hasEntries(db);
  //       if (entriesExist) {
  //         Alert.alert("Success", `Dataset "${TARGET_DATABASE_NAME}" loaded and contains entries in 'my_table'.`);
  //         console.log(`Dataset "${TARGET_DATABASE_NAME}" loaded and has entries in 'my_table'.`);
  //       } else {
  //         Alert.alert("Notice", `Dataset "${TARGET_DATABASE_NAME}" loaded, but 'my_table' appears to be empty. Check your bundled 'output.sqlite' file.`);
  //         console.log(`Dataset "${TARGET_DATABASE_NAME}" loaded, but hasEntries (for 'my_table') returned false.`);
  //       }
  //     } else {
  //       Alert.alert("Error", `Failed to open database "${TARGET_DATABASE_NAME}".`);
  //       console.log(`Failed to open database "${TARGET_DATABASE_NAME}".`);
  //     }
  //   } catch (e) {
  //     const errorMessage = e instanceof Error ? e.message : String(e);
  //     console.error("Failed to load dataset from .sqlite file:", errorMessage, e);
  //     Alert.alert("Error", `Failed to load dataset: ${errorMessage}`);
  //   }
  // };

  // --- Create database with the name 'vdb-pbot-offline' (vector db pbot offline lol)
  const onPressCreateDatabase = async () => {
    try {
      const db = await createDatabase();
      if(db) {
        console.log("Succesfully created!");
        Alert.alert("Success", "Database created");
      } else {
        console.log("Database creation returned null");
      } 
    } catch (e) {
      console.error("Failed to create database", e)
    }
  }  

  const onPressGetEntries = async () => {
    try {
      // It's generally better to manage the db instance in state if you use it in multiple places.
      // For this isolated function, we'll open/get it here.
      const db = await createDatabase(); 
      if (db) {
        const entriesDoExist = await hasEntries(db);
        if (entriesDoExist) {
          Alert.alert("Database Status", "The database has entries.");
        } else {
          Alert.alert("Database Status", "The database is empty.");
        }
        // Optionally, you might want to close the db if you opened it just for this check
        // await db.closeAsync(); 
        // However, if createDatabase() is idempotent and just returns the open instance, closing might be premature.
      } else {
        Alert.alert("Error", "Could not connect to the database to check for entries.");
      }
    } catch (error) {
      console.error("Failed to check for entries:", error);
      Alert.alert("Error", "An error occurred while checking for entries.");
    }
  };
  // Removed database-related state and useEffect
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('../../assets/images/react-logo.png')} // Assuming you still want this background image
          style={styles.dbLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Vector DB Test</ThemedText> 
        {/* You can change this title to something more generic if needed */}
      </ThemedView>

      <ThemedView style={styles.contentContainer}>
        {/* Simplified content */}
        <ThemedText>Welcome to the Database Screen!</ThemedText>
        <ThemedText>You can create database by clicking the first button but load dataset?</ThemedText>
      </ThemedView>

      <Button
        onPress={onPressCreateDatabase}
        title="Create database"
        color="#000000"
        accessibilityLabel="Create database"
      />

      <Button
        onPress={onPressGetEntries}
        title="Check Entries"
        color="#0047AB"
        accessibilityLabel="Check if DB has entriess"
      />

      <Button
        onPress={onPressLoadExistingDatabase}
        title="Open Existing Database"
        color="#0047AB"
        accessibilityLabel="Check if DB has entriess"
      />
      
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 10, 
  },
  contentContainer: {
    padding: 16,
    gap: 16, 
  },
  // "remove" this dblogo
  dbLogo: {
    height: 50, 
    width: 50,  
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  // Styles for FileUploadComponent
  fileUploadContainer: {
    marginVertical: 20,
    alignItems: 'center',
  },
  fileDetailsContainer: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
  },
  fileDetailsText: {
    fontSize: 14,
    color: '#333', // Darker text for better readability on light background
  }
  // Removed unused styles: statusText, errorContainer, entryDetailsContainer
});
