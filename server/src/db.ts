import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

// Config that doesn't depend on db (just port and path)
const dbPath = process.env.DB_PATH || './data/oneatatime.db';
const port = parseInt(process.env.PORT || '3006');

export { port, dbPath };

// Ensure data directory exists
mkdirSync(dirname(dbPath), { recursive: true });

const db = new Database(dbPath);

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    description   TEXT NOT NULL,
    scheduled_date TEXT NOT NULL,
    sort_order    INTEGER NOT NULL,
    time_start    TEXT,
    time_end      TEXT,
    location      TEXT,
    created_at    TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(scheduled_date);

  CREATE TABLE IF NOT EXISTS app_state (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// Migration: drop dead-weight columns from existing databases (SQLite 3.35+)
const colCheck = db.prepare("SELECT COUNT(*) AS cnt FROM pragma_table_info('tasks') WHERE name = 'status'").get() as { cnt: number };
if (colCheck.cnt > 0) {
  db.exec('ALTER TABLE tasks DROP COLUMN status');
  db.exec('ALTER TABLE tasks DROP COLUMN completed_at');
}

// Seed app_state with defaults if not already set
const seedState = db.transaction(() => {
  const existing = db.prepare('SELECT key FROM app_state WHERE key = ?').get('current_date');
  if (!existing) {
    const today = new Date().toISOString().split('T')[0];
    db.prepare('INSERT INTO app_state (key, value) VALUES (?, ?)').run('current_date', today);
    db.prepare('INSERT INTO app_state (key, value) VALUES (?, ?)').run('current_mode', 'focus');
  }
});
seedState();

export type Mode = 'focus' | 'planning';

export interface AppState {
  currentDate: string;
  currentMode: Mode;
}

export function getAppState(): AppState {
  const dateRow = db.prepare('SELECT value FROM app_state WHERE key = ?').get('current_date') as { value: string };
  const modeRow = db.prepare('SELECT value FROM app_state WHERE key = ?').get('current_mode') as { value: string };
  return {
    currentDate: dateRow.value,
    currentMode: modeRow.value as Mode,
  };
}

export function setAppState(date: string, mode: Mode): void {
  db.prepare('UPDATE app_state SET value = ? WHERE key = ?').run(date, 'current_date');
  db.prepare('UPDATE app_state SET value = ? WHERE key = ?').run(mode, 'current_mode');
}

export default db;
