/**
 * SQLite database connection for reading download-egghead databases
 *
 * Uses better-sqlite3 for synchronous access to SQLite databases.
 */
import Database from "better-sqlite3";
import path from "path";

const DOWNLOAD_EGGHEAD_PATH = path.resolve(
  import.meta.dirname,
  "../../../../download-egghead",
);

/**
 * Open the egghead_videos.db SQLite database
 */
export const openVideosDb = () => {
  const dbPath = path.join(DOWNLOAD_EGGHEAD_PATH, "egghead_videos.db");
  return new Database(dbPath, { readonly: true });
};

/**
 * Open the backup database
 */
export const openBackupDb = () => {
  const dbPath = path.join(DOWNLOAD_EGGHEAD_PATH, "egghead_videos-backup.db");
  return new Database(dbPath, { readonly: true });
};

/**
 * Get all tables in a SQLite database
 */
export const getTables = (db: Database.Database) => {
  return db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`)
    .all() as { name: string }[];
};

/**
 * Get schema for a table
 */
export const getTableSchema = (db: Database.Database, tableName: string) => {
  return db.prepare(`PRAGMA table_info(${tableName})`).all() as {
    cid: number;
    name: string;
    type: string;
    notnull: number;
    dflt_value: string | null;
    pk: number;
  }[];
};

/**
 * Get row count for a table
 */
export const getRowCount = (db: Database.Database, tableName: string) => {
  const result = db
    .prepare(`SELECT COUNT(*) as count FROM ${tableName}`)
    .get() as { count: number };
  return result.count;
};

/**
 * Sample rows from a table
 */
export const sampleRows = (
  db: Database.Database,
  tableName: string,
  limit = 5,
) => {
  return db.prepare(`SELECT * FROM ${tableName} LIMIT ?`).all(limit);
};
