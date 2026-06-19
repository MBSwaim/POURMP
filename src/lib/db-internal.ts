/**
 * Exports the internal getDb singleton for use in server components
 * that need direct SQL access beyond the typed helper functions.
 */
import Database from 'better-sqlite3'
import path from 'path'

export function getDb(): Database.Database {
  // Re-use the global singleton if already initialised by the main db module
  if (global.__mpbc_db) return global.__mpbc_db

  // Fallback: open (the main db.ts import will have already seeded it)
  const dbPath = path.join(process.cwd(), 'data', 'mpbc.db')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require('fs')
  fs.mkdirSync(path.dirname(dbPath), { recursive: true })
  global.__mpbc_db = new Database(dbPath)
  global.__mpbc_db.pragma('journal_mode = WAL')
  global.__mpbc_db.pragma('foreign_keys = ON')
  return global.__mpbc_db
}
