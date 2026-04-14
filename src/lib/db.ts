import { createClient } from "@libsql/client";

// Ces variables seront chargées depuis l'env (fichier .env)
const TURSO_URL = import.meta.env.VITE_TURSO_URL as string;
const TURSO_TOKEN = import.meta.env.VITE_TURSO_TOKEN as string;

if (!TURSO_URL || !TURSO_TOKEN) {
  console.warn("[NexBoost] Variables VITE_TURSO_URL ou VITE_TURSO_TOKEN manquantes dans .env");
}

export const db = createClient({
  url: TURSO_URL || "file:local.db",
  authToken: TURSO_TOKEN,
});

// Initialisation des tables si elles n'existent pas
export async function initDatabase() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      username   TEXT NOT NULL UNIQUE,
      email      TEXT NOT NULL UNIQUE,
      password   TEXT NOT NULL,
      premium    INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS premium_keys (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      key_value  TEXT NOT NULL UNIQUE,
      used_by    INTEGER REFERENCES users(id),
      used_at    TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS benchmark_history (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id),
      cpu_score   INTEGER NOT NULL,
      ram_score   INTEGER NOT NULL,
      disk_score  INTEGER NOT NULL,
      total_score INTEGER NOT NULL,
      duration_ms INTEGER NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

// Hash simple côté client (à remplacer par bcrypt côté backend si on ajoute un serveur)
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "optipc_salt_2024");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Auth functions
export async function registerUser(username: string, email: string, password: string) {
  const hashed = await hashPassword(password);
  const result = await db.execute({
    sql: "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
    args: [username, email, hashed],
  });
  return result.lastInsertRowid;
}

export async function loginUser(email: string, password: string) {
  const hashed = await hashPassword(password);
  const result = await db.execute({
    sql: "SELECT id, username, email, premium FROM users WHERE email = ? AND password = ?",
    args: [email, hashed],
  });
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: Number(row.id),
    username: String(row.username),
    email: String(row.email),
    premium: Boolean(row.premium),
  };
}

export interface BenchmarkHistoryRow {
  cpu_score: number; ram_score: number; disk_score: number;
  total_score: number; duration_ms: number; created_at: string;
}

export async function saveBenchmarkResult(userId: number, result: { cpu_score: number; ram_score: number; disk_score: number; total_score: number; duration_ms: number }): Promise<void> {
  await db.execute({
    sql: "INSERT INTO benchmark_history (user_id, cpu_score, ram_score, disk_score, total_score, duration_ms) VALUES (?, ?, ?, ?, ?, ?)",
    args: [userId, result.cpu_score, result.ram_score, result.disk_score, result.total_score, result.duration_ms],
  });
}

export async function getBenchmarkHistory(userId: number): Promise<BenchmarkHistoryRow[]> {
  const result = await db.execute({
    sql: "SELECT cpu_score, ram_score, disk_score, total_score, duration_ms, created_at FROM benchmark_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 10",
    args: [userId],
  });
  return result.rows.map(row => ({
    cpu_score:   Number(row.cpu_score),
    ram_score:   Number(row.ram_score),
    disk_score:  Number(row.disk_score),
    total_score: Number(row.total_score),
    duration_ms: Number(row.duration_ms),
    created_at:  String(row.created_at),
  }));
}

export async function activatePremiumKey(userId: number, keyValue: string): Promise<boolean> {
  const keyResult = await db.execute({
    sql: "SELECT id, used_by FROM premium_keys WHERE key_value = ?",
    args: [keyValue],
  });
  if (keyResult.rows.length === 0) return false;
  const key = keyResult.rows[0];
  if (key.used_by !== null) return false;

  await db.batch([
    {
      sql: "UPDATE premium_keys SET used_by = ?, used_at = datetime('now') WHERE key_value = ?",
      args: [userId, keyValue],
    },
    {
      sql: "UPDATE users SET premium = 1 WHERE id = ?",
      args: [userId],
    },
  ]);
  return true;
}
