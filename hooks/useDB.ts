import { drizzle } from 'drizzle-orm/expo-sqlite'
import * as SQLite from 'expo-sqlite';

export default function useExistingDB() {
    const db = SQLite.useSQLiteContext();
    return drizzle(db)
  }
