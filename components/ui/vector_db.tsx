import * as SQLite from 'expo-sqlite';
import { Asset } from 'expo-asset'; // Import Asset

// Create type for Data inputs matching the format of the dataset in assets/dataset
export type JsonEntry = {
  text: string;
  index: number; // This corresponds to the 'index' column in your SQLite table
  embed: number[]; // This corresponds to the 'embed' column after processing
};

// Create or (Open) database and table
export const createDatabase = async () => {
  console.log("Attempting to open database: vdb-pbot-offline");
  const db = await SQLite.openDatabaseAsync('vdb-pbot-offline');
  console.log("Database vdb-pbot-offline opened via SQLite.openDatabaseAsync.");

  try {
    await db.execAsync('PRAGMA journal_mode = WAL;');
    // Align with the schema from your output.sqlite:
    // "index" is INTEGER (not PRIMARY KEY)
    // "embed" is TEXT (not BLOB)
    await db.execAsync(
      'CREATE TABLE IF NOT EXISTS my_table (text TEXT, "index" INTEGER, embed TEXT);'
    );
    console.log("PRAGMA and CREATE TABLE IF NOT EXISTS my_table (text TEXT, \"index\" INTEGER, embed TEXT) executed.");
  } catch (error) {
    console.error("Error during createDatabase execAsync:", error);
    throw error; 
  }
  
  return db;
};

// export const addJDataToDatabase = async (db : SQLite.SQLiteDatabase) =>  {
//   try {
//     const rawData = dataset; // Assuming 'dataset' is imported if this function is used
//     const data: JsonEntry[] = Array.isArray(rawData) ? rawData : [rawData];

//     await db.execAsync('BEGIN TRANSACTION;');

//     for (const entry of data) {
//       const float32Array = new Float32Array(entry.embedding);
//       const embeddingBlob = new Uint8Array(float32Array.buffer);
      
//       // Insert into 'my_table' using columns 'index', 'text', 'embed'
//       await db.runAsync(
//         'INSERT INTO my_table ("index", text, embed) VALUES (?, ?, ?);',
//         entry.index,
//         entry.text,
//         embeddingBlob
//       );
//     }

//     await db.execAsync('COMMIT;');
//     console.log(`Successfully imported ${data.length} entries into my_table.`);

//   } catch(e) {
//     try {
//       await db.execAsync('ROLLBACK;');
//     } catch (rollbackError) {
//       console.error("Failed to rollback transaction:", rollbackError);
//     }
//     console.error("Failed to import data to my_table:", e);
//     throw e; 
//   }
// }

// Define a type for the raw data structure returned by the database query
type RawDbEntry = {
  text: string;
  index: number; // Matches 'index' column from my_table
  embed: string; // Matches 'embed' column (BLOB) from my_table
};

export const getEntryById = async (db: SQLite.SQLiteDatabase, id: number): Promise<JsonEntry | null> => {
  try {
    // Select from 'my_table' and use 'index' column for querying by id
    // Note: If 'index' is not unique, this might return an arbitrary row if multiple match.
    // Consider if you need a unique identifier for fetching single entries.
    const result = await db.getFirstAsync<RawDbEntry>(
      'SELECT "index", text, embed FROM my_table WHERE "index" = ?;',
      id
    );

    if (result && result.embed) {
      let embeddingArray: number[] = [];
      try {
        // Assuming the 'embed' TEXT column stores a JSON string array
        embeddingArray = JSON.parse(result.embed);
        if (!Array.isArray(embeddingArray) || !embeddingArray.every(n => typeof n === 'number')) {
          console.error("Parsed embedding is not an array of numbers:", embeddingArray);
          return null; // Or handle error appropriately
        }
      } catch (parseError) {
        console.error("Failed to parse embedding string from TEXT column:", parseError, "Value:", result.embed);
        return null; // Or handle error appropriately
      }

      return {
        text: result.text,
        index: result.index,
        embed: embeddingArray
      };
    }
    return null;
  } catch (error) {
    console.error(`Failed to get entry with id ${id} from my_table:`, error);
    throw error;
  }
};

// New function to check if the database has any entries in 'my_table'
export const hasEntries = async (db: SQLite.SQLiteDatabase): Promise<boolean> => {
  try {
    // Check for entries in 'my_table'
    console.log('[hasEntries] Attempting to query SELECT COUNT(*) FROM my_table');
    const result = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM my_table;');
    console.log('[hasEntries] Query result from SELECT COUNT(*):', JSON.stringify(result));
    return (result?.count ?? 0) > 0;
  } catch (error) {
    console.error("[hasEntries] Error during getFirstAsync for COUNT(*):", error);
    // Log more details about the error
    if (error instanceof Error) {
      console.error("[hasEntries] Error name:", error.name);
      console.error("[hasEntries] Error message:", error.message);
      if (error.stack) {
        console.error("[hasEntries] Error stack:", error.stack);
      }
    } else {
      // If it's not an Error instance, try to stringify it
      console.error("[hasEntries] Non-Error object thrown:", JSON.stringify(error));
    }
    return false; 
  }
};

export interface LoadAssetDbResult {
  db?: SQLite.SQLiteDatabase | null;
  entriesExist?: boolean;
  success: boolean;
  message: string;
}

// Simplified and modified to accept a module ID (number) from require()
export const loadDatabaseFromAsset = async (
): Promise<LoadAssetDbResult> => {
  const dbName = "embedDB"

  try {
    console.log(`[vector_db] Attempting to load database from asset: ${dbName}`);
    
    // expo-sqlite can open directly from the asset module ID
    const db = await SQLite.openDatabaseAsync(dbName);

    if (db) {
      console.log(`[vector_db] Successfully opened database from asset ${dbName}. Checking for entries...`);
      const entriesExist = await hasEntries(db); // hasEntries is in this file
      
      if (entriesExist) {
        const msg = `Successfully loaded "${dbName}" from assets. It contains entries in 'my_table'.`;
        console.log(`[vector_db] ${msg}`);
        return { success: true, message: msg, db: db, entriesExist: true };
      } else {
        const msg = `Successfully loaded "${dbName}" from assets, but 'my_table' appears to be empty.`;
        console.log(`[vector_db] ${msg}`);
        return { success: true, message: msg, db: db, entriesExist: false };
      }
    } else {
      // This case might be less likely if openDatabaseAsync throws on failure
      const msg = `Failed to open database from asset "${dbName}". SQLite.openDatabaseAsync returned null/undefined.`;
      console.log(`[vector_db] ${msg}`);
      return { success: false, message: msg };
    }
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    const finalMessage = `Failed to load database from asset ${dbName}: ${errorMessage}`;
    console.error(`[vector_db] ${finalMessage}`, e);
    return { success: false, message: finalMessage };
  }
};








