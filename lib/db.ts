import Database from "better-sqlite3";
import path from "path";
import os from "os";
import fs from "fs";

const QECON_DIR = path.join(os.homedir(), ".qecon");

if (!fs.existsSync(QECON_DIR)) {
  fs.mkdirSync(QECON_DIR, { recursive: true });
}

const DB_PATH = path.join(QECON_DIR, "qecon.db");

const globalForDb = globalThis as unknown as {
  db: Database.Database | undefined;
};

function initDb(): Database.Database {
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
      user_id INTEGER NOT NULL,
      session_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, session_id)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      session_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
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
  user_id: number;
  session_id: string;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: number;
  user_id: number;
  session_id: string;
  content: string;
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
  db.prepare("INSERT OR IGNORE INTO signups (user_id, session_id) VALUES (?, ?)").run(userId, sessionId);
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
  db.prepare("INSERT INTO comments (user_id, session_id, content) VALUES (?, ?, ?)").run(userId, sessionId, content);
}
