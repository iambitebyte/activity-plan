import Database from "better-sqlite3";
import fs from "fs";
import { randomUUID } from "crypto";
import { DB_PATH, LEGACY_DB_PATH, ensureDataDirs } from "./paths";

/** 旧版位置存在数据库而新位置没有时，自动搬迁（含 WAL/SHM） */
function migrateLegacyDb(): void {
  ensureDataDirs();
  if (fs.existsSync(DB_PATH) || !fs.existsSync(LEGACY_DB_PATH)) return;
  for (const suffix of ["", "-wal", "-shm"]) {
    const from = LEGACY_DB_PATH + suffix;
    if (fs.existsSync(from)) fs.copyFileSync(from, DB_PATH + suffix);
  }
  console.log(`[db] 已迁移旧数据库 ${LEGACY_DB_PATH} -> ${DB_PATH}`);
}

const globalForDb = globalThis as unknown as {
  db: Database.Database | undefined;
};

function initDb(): Database.Database {
  migrateLegacyDb();
  const database = new Database(DB_PATH);
  database.pragma("journal_mode = WAL");
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS signups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      session_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, session_id)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      session_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS uploads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      session_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      md5 TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      session_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      md5 TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      content_type TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Migration: add uuid column to existing tables
  const addUuidIfMissing = (table: string) => {
    const cols = database.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    if (!cols.some(c => c.name === "uuid")) {
      database.exec(`ALTER TABLE ${table} ADD COLUMN uuid TEXT`);
      const rows = database.prepare(`SELECT id FROM ${table} WHERE uuid IS NULL`).all() as { id: number }[];
      const stmt = database.prepare(`UPDATE ${table} SET uuid = ? WHERE id = ?`);
      for (const row of rows) {
        stmt.run(randomUUID(), row.id);
      }
    }
  };
  addUuidIfMissing("signups");
  addUuidIfMissing("comments");

  return database;
}

export const db = new Proxy({} as Database.Database, {
  get(_, prop) {
    if (!globalForDb.db) {
      globalForDb.db = initDb();
    }
    return Reflect.get(globalForDb.db, prop as string | symbol);
  }
});

export interface User {
  id: number;
  username: string;
  display_name: string;
  created_at: string;
}

export interface Signup {
  id: number;
  uuid: string;
  user_id: number;
  session_id: string;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: number;
  uuid: string;
  user_id: number;
  session_id: string;
  content: string;
  created_at: string;
}

export interface Upload {
  id: number;
  uuid: string;
  user_id: number;
  session_id: string;
  filename: string;
  original_name: string;
  md5: string;
  file_size: number;
  created_at: string;
}

export interface Image {
  id: number;
  uuid: string;
  user_id: number;
  session_id: string;
  filename: string;
  original_name: string;
  md5: string;
  file_size: number;
  content_type: string;
  created_at: string;
}

export function getUserById(id: number): User | undefined {
  return db.prepare("SELECT id, username, display_name, created_at FROM users WHERE id = ?").get(id) as User | undefined;
}

export function getUserByUsername(username: string): (User & { password_hash: string }) | undefined {
  return db.prepare("SELECT * FROM users WHERE username = ?").get(username) as (User & { password_hash: string }) | undefined;
}

export function createUser(username: string, passwordHash: string, displayName: string): User {
  const result = db.prepare("INSERT INTO users (username, password_hash, display_name) VALUES (?, ?, ?)").run(username, passwordHash, displayName);
  return { id: result.lastInsertRowid as number, username, display_name: displayName, created_at: new Date().toISOString() };
}

export function createSession(token: string, userId: number): void {
  db.prepare("INSERT INTO user_sessions (token, user_id) VALUES (?, ?)").run(token, userId);
}

export function getUserBySessionToken(token: string): User | undefined {
  const row = db.prepare(`
    SELECT u.id, u.username, u.display_name, u.created_at
    FROM user_sessions s JOIN users u ON s.user_id = u.id
    WHERE s.token = ?
  `).get(token) as User | undefined;
  return row;
}

export function deleteSession(token: string): void {
  db.prepare("DELETE FROM user_sessions WHERE token = ?").run(token);
}

export function getSignupsBySession(sessionId: string): (Signup & { display_name: string; username: string })[] {
  return db.prepare(`
    SELECT s.*, u.display_name, u.username
    FROM signups s JOIN users u ON s.user_id = u.id
    WHERE s.session_id = ?
    ORDER BY s.created_at
  `).all(sessionId) as (Signup & { display_name: string; username: string })[];
}

export function getSignupsByUser(userId: number): Signup[] {
  return db.prepare("SELECT * FROM signups WHERE user_id = ? ORDER BY created_at").all(userId) as Signup[];
}

export function getAllSignups(): { session_id: string; user_id: number; display_name: string }[] {
  return db.prepare(`
    SELECT s.session_id, s.user_id, u.display_name
    FROM signups s JOIN users u ON s.user_id = u.id
  `).all() as { session_id: string; user_id: number; display_name: string }[];
}

export function createSignup(userId: number, sessionId: string): void {
  db.prepare("INSERT OR IGNORE INTO signups (uuid, user_id, session_id) VALUES (?, ?, ?)").run(randomUUID(), userId, sessionId);
}

export function deleteSignup(userId: number, sessionId: string): void {
  db.prepare("DELETE FROM signups WHERE user_id = ? AND session_id = ?").run(userId, sessionId);
}

export function getSignup(userId: number, sessionId: string): Signup | undefined {
  return db.prepare("SELECT * FROM signups WHERE user_id = ? AND session_id = ?").get(userId, sessionId) as Signup | undefined;
}

export function getCommentsBySession(sessionId: string): (Comment & { display_name: string; username: string })[] {
  return db.prepare(`
    SELECT c.*, u.display_name, u.username
    FROM comments c JOIN users u ON c.user_id = u.id
    WHERE c.session_id = ?
    ORDER BY c.created_at DESC
  `).all(sessionId) as (Comment & { display_name: string; username: string })[];
}

export function createComment(userId: number, sessionId: string, content: string): void {
  db.prepare("INSERT INTO comments (uuid, user_id, session_id, content) VALUES (?, ?, ?, ?)").run(randomUUID(), userId, sessionId, content);
}

export function getCommentsByUser(userId: number): Comment[] {
  return db.prepare("SELECT * FROM comments WHERE user_id = ? ORDER BY created_at").all(userId) as Comment[];
}

export function importSignup(userId: number, sessionId: string, createdAt: string): { success: boolean; reason?: string } {
  const dup = db.prepare("SELECT id FROM signups WHERE user_id = ? AND session_id = ?").get(userId, sessionId);
  if (dup) return { success: false, reason: "duplicate" };
  db.prepare("INSERT INTO signups (uuid, user_id, session_id, created_at, updated_at) VALUES (?, ?, ?, ?, datetime('now'))").run(randomUUID(), userId, sessionId, createdAt);
  return { success: true };
}

export function importComment(userId: number, sessionId: string, content: string, createdAt: string): { success: boolean; reason?: string } {
  const dup = db.prepare("SELECT id FROM comments WHERE user_id = ? AND session_id = ? AND content = ?").get(userId, sessionId, content);
  if (dup) return { success: false, reason: "duplicate" };
  db.prepare("INSERT INTO comments (uuid, user_id, session_id, content, created_at) VALUES (?, ?, ?, ?, ?)").run(randomUUID(), userId, sessionId, content, createdAt);
  return { success: true };
}

export function getUploadsBySession(sessionId: string): (Upload & { display_name: string; username: string })[] {
  return db.prepare(`
    SELECT u.*, usr.display_name, usr.username
    FROM uploads u JOIN users usr ON u.user_id = usr.id
    WHERE u.session_id = ?
    ORDER BY u.created_at DESC
  `).all(sessionId) as (Upload & { display_name: string; username: string })[];
}

export function getUploadById(id: number): Upload | undefined {
  return db.prepare("SELECT * FROM uploads WHERE id = ?").get(id) as Upload | undefined;
}

export function getUploadByMd5AndSession(md5: string, sessionId: string): Upload | undefined {
  return db.prepare("SELECT * FROM uploads WHERE md5 = ? AND session_id = ? LIMIT 1").get(md5, sessionId) as Upload | undefined;
}

export function createUpload(userId: number, sessionId: string, filename: string, originalName: string, md5: string, fileSize: number): void {
  db.prepare("INSERT INTO uploads (uuid, user_id, session_id, filename, original_name, md5, file_size) VALUES (?, ?, ?, ?, ?, ?, ?)").run(randomUUID(), userId, sessionId, filename, originalName, md5, fileSize);
}

export function deleteUpload(id: number, userId: number): { filename: string } | null {
  const upload = db.prepare("SELECT * FROM uploads WHERE id = ? AND user_id = ?").get(id, userId) as Upload | undefined;
  if (!upload) return null;
  db.prepare("DELETE FROM uploads WHERE id = ?").run(id);
  const remaining = db.prepare("SELECT id FROM uploads WHERE filename = ? LIMIT 1").get(upload.filename);
  if (!remaining) {
    return { filename: upload.filename };
  }
  return { filename: "" };
}

export function getImagesBySession(sessionId: string): (Image & { display_name: string; username: string })[] {
  return db.prepare(`
    SELECT i.*, usr.display_name, usr.username
    FROM images i JOIN users usr ON i.user_id = usr.id
    WHERE i.session_id = ?
    ORDER BY i.created_at DESC
  `).all(sessionId) as (Image & { display_name: string; username: string })[];
}

export function getImageById(id: number): Image | undefined {
  return db.prepare("SELECT * FROM images WHERE id = ?").get(id) as Image | undefined;
}

export function createImage(userId: number, sessionId: string, filename: string, originalName: string, md5: string, fileSize: number, contentType: string): void {
  db.prepare("INSERT INTO images (uuid, user_id, session_id, filename, original_name, md5, file_size, content_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(randomUUID(), userId, sessionId, filename, originalName, md5, fileSize, contentType);
}

export function deleteImage(id: number, userId: number): { filename: string } | null {
  const image = db.prepare("SELECT * FROM images WHERE id = ? AND user_id = ?").get(id, userId) as Image | undefined;
  if (!image) return null;
  db.prepare("DELETE FROM images WHERE id = ?").run(id);
  const remaining = db.prepare("SELECT id FROM uploads WHERE filename = ? LIMIT 1").get(image.filename);
  const remainingImg = db.prepare("SELECT id FROM images WHERE filename = ? AND id != ? LIMIT 1").get(image.filename, id);
  if (!remaining && !remainingImg) {
    return { filename: image.filename };
  }
  return { filename: "" };
}
