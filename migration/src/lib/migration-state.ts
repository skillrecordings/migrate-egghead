/**
 * Local SQLite database for tracking migration state
 * 
 * Avoids needing to create tables in PlanetScale.
 * Stores Rails ID → Coursebuilder ID mappings locally.
 */
import Database from "bun:sqlite";
import { existsSync } from "fs";

const DB_PATH = "./migration-state.db";

let _db: Database | null = null;

export function getMigrationDb(): Database {
  if (!_db) {
    const isNew = !existsSync(DB_PATH);
    _db = new Database(DB_PATH);
    
    if (isNew) {
      console.log("📦 Creating migration state database...");
    }
    
    // Create tables if they don't exist
    _db.run(`
      CREATE TABLE IF NOT EXISTS tag_map (
        rails_id INTEGER PRIMARY KEY,
        cb_id TEXT NOT NULL,
        rails_slug TEXT,
        rails_name TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    _db.run(`
      CREATE TABLE IF NOT EXISTS course_map (
        rails_id INTEGER PRIMARY KEY,
        cb_id TEXT NOT NULL,
        rails_slug TEXT,
        rails_title TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    _db.run(`
      CREATE TABLE IF NOT EXISTS lesson_map (
        rails_id INTEGER PRIMARY KEY,
        cb_id TEXT NOT NULL,
        rails_slug TEXT,
        rails_title TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create indexes
    _db.run("CREATE INDEX IF NOT EXISTS idx_tag_cb_id ON tag_map(cb_id)");
    _db.run("CREATE INDEX IF NOT EXISTS idx_course_cb_id ON course_map(cb_id)");
    _db.run("CREATE INDEX IF NOT EXISTS idx_lesson_cb_id ON lesson_map(cb_id)");
  }
  
  return _db;
}

export function closeMigrationDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}

// Tag mappings
export function saveTagMapping(railsId: number, cbId: string, slug?: string, name?: string): void {
  const db = getMigrationDb();
  db.run(
    "INSERT OR REPLACE INTO tag_map (rails_id, cb_id, rails_slug, rails_name) VALUES (?, ?, ?, ?)",
    [railsId, cbId, slug ?? null, name ?? null]
  );
}

export function getTagCbId(railsId: number): string | null {
  const db = getMigrationDb();
  const row = db.query("SELECT cb_id FROM tag_map WHERE rails_id = ?").get(railsId) as { cb_id: string } | null;
  return row?.cb_id ?? null;
}

// Course mappings
export function saveCourseMapping(railsId: number, cbId: string, slug?: string, title?: string): void {
  const db = getMigrationDb();
  db.run(
    "INSERT OR REPLACE INTO course_map (rails_id, cb_id, rails_slug, rails_title) VALUES (?, ?, ?, ?)",
    [railsId, cbId, slug ?? null, title ?? null]
  );
}

export function getCourseCbId(railsId: number): string | null {
  const db = getMigrationDb();
  const row = db.query("SELECT cb_id FROM course_map WHERE rails_id = ?").get(railsId) as { cb_id: string } | null;
  return row?.cb_id ?? null;
}

// Lesson mappings
export function saveLessonMapping(railsId: number, cbId: string, slug?: string, title?: string): void {
  const db = getMigrationDb();
  db.run(
    "INSERT OR REPLACE INTO lesson_map (rails_id, cb_id, rails_slug, rails_title) VALUES (?, ?, ?, ?)",
    [railsId, cbId, slug ?? null, title ?? null]
  );
}

export function getLessonCbId(railsId: number): string | null {
  const db = getMigrationDb();
  const row = db.query("SELECT cb_id FROM lesson_map WHERE rails_id = ?").get(railsId) as { cb_id: string } | null;
  return row?.cb_id ?? null;
}

// Stats
export function getMigrationStats(): { tags: number; courses: number; lessons: number } {
  const db = getMigrationDb();
  const tags = (db.query("SELECT COUNT(*) as count FROM tag_map").get() as { count: number }).count;
  const courses = (db.query("SELECT COUNT(*) as count FROM course_map").get() as { count: number }).count;
  const lessons = (db.query("SELECT COUNT(*) as count FROM lesson_map").get() as { count: number }).count;
  return { tags, courses, lessons };
}
