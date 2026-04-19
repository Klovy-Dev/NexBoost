import { createClient } from "@libsql/client";

const TURSO_URL   = import.meta.env.VITE_TURSO_URL   as string;
const TURSO_TOKEN = import.meta.env.VITE_TURSO_TOKEN  as string;

if (!TURSO_URL || !TURSO_TOKEN) {
  console.warn("[PCPulse] Variables VITE_TURSO_URL ou VITE_TURSO_TOKEN manquantes dans .env");
}

export const db = createClient({
  url:       TURSO_URL || "file:local.db",
  authToken: TURSO_TOKEN,
});

export async function initDatabase() {
  // ── Tables principales ────────────────────────────────────────────────────
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      username        TEXT    NOT NULL UNIQUE,
      email           TEXT    NOT NULL UNIQUE,
      password        TEXT    NOT NULL,
      premium         INTEGER NOT NULL DEFAULT 0,
      created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS premium_keys (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      key_value     TEXT    NOT NULL UNIQUE,
      used_by       INTEGER REFERENCES users(id),
      used_at       TEXT,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
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
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // ── Migrations ────────────────────────────────────────────────────────────
  // Colonnes plan sur users (ignorées si déjà présentes)
  try { await db.execute("ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'free'") } catch {}
  try { await db.execute("ALTER TABLE users ADD COLUMN plan_expires_at TEXT") } catch {}
  try { await db.execute("ALTER TABLE users ADD COLUMN billing_cycle TEXT") } catch {}

  // Colonnes plan sur premium_keys
  try { await db.execute("ALTER TABLE premium_keys ADD COLUMN plan TEXT NOT NULL DEFAULT 'pro'") } catch {}
  try { await db.execute("ALTER TABLE premium_keys ADD COLUMN duration_days INTEGER NOT NULL DEFAULT 31") } catch {}

  // Migrer les anciens comptes premium (premium = 1) vers plan = 'pro'
  await db.execute("UPDATE users SET plan = 'pro' WHERE premium = 1 AND plan = 'free'");
}

// ── Hash password ─────────────────────────────────────────────────────────────
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data    = encoder.encode(password + "optipc_salt_2024");
  const buf     = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export async function registerUser(username: string, email: string, password: string) {
  const hashed = await hashPassword(password);
  const result = await db.execute({
    sql:  "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
    args: [username, email, hashed],
  });
  return result.lastInsertRowid;
}

export type Plan         = "free" | "pro";
export type BillingCycle = "monthly" | "annual";

export interface LoginResult {
  id:            number;
  username:      string;
  email:         string;
  plan:          Plan;
  planExpiresAt: string | null;
  billingCycle:  BillingCycle | null;
}

export async function loginUser(email: string, password: string): Promise<LoginResult | null> {
  const hashed = await hashPassword(password);
  const result = await db.execute({
    sql:  `SELECT id, username, email, plan, plan_expires_at, billing_cycle
           FROM users WHERE email = ? AND password = ?`,
    args: [email, hashed],
  });
  if (result.rows.length === 0) return null;

  const row          = result.rows[0];
  let   plan         = (String(row.plan ?? "free")) as Plan;
  let   planExpiresAt = row.plan_expires_at ? String(row.plan_expires_at) : null;
  let   billingCycle  = row.billing_cycle  ? (String(row.billing_cycle)  as BillingCycle) : null;

  // Auto-expire : rétrograder vers free si la date est dépassée
  if (plan === "pro" && planExpiresAt) {
    if (new Date(planExpiresAt) < new Date()) {
      await db.execute({
        sql:  "UPDATE users SET plan = 'free', billing_cycle = NULL WHERE id = ?",
        args: [row.id],
      });
      plan          = "free";
      planExpiresAt = null;
      billingCycle  = null;
    }
  }

  return {
    id:            Number(row.id),
    username:      String(row.username),
    email:         String(row.email),
    plan,
    planExpiresAt: plan === "pro" ? planExpiresAt : null,
    billingCycle:  plan === "pro" ? billingCycle  : null,
  };
}

export async function checkEmailExists(email: string): Promise<boolean> {
  const result = await db.execute({ sql: "SELECT id FROM users WHERE email = ?", args: [email] });
  return result.rows.length > 0;
}

// ── Benchmark ─────────────────────────────────────────────────────────────────
export interface BenchmarkHistoryRow {
  cpu_score: number; ram_score: number; disk_score: number;
  total_score: number; duration_ms: number; created_at: string;
}

export async function saveBenchmarkResult(
  userId: number,
  result: { cpu_score: number; ram_score: number; disk_score: number; total_score: number; duration_ms: number }
): Promise<void> {
  await db.execute({
    sql:  `INSERT INTO benchmark_history
           (user_id, cpu_score, ram_score, disk_score, total_score, duration_ms)
           VALUES (?, ?, ?, ?, ?, ?)`,
    args: [userId, result.cpu_score, result.ram_score, result.disk_score, result.total_score, result.duration_ms],
  });
}

export async function getBenchmarkHistory(userId: number): Promise<BenchmarkHistoryRow[]> {
  const result = await db.execute({
    sql:  `SELECT cpu_score, ram_score, disk_score, total_score, duration_ms, created_at
           FROM benchmark_history WHERE user_id = ? ORDER BY created_at DESC LIMIT 10`,
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

// ── Activation de clé Pro ─────────────────────────────────────────────────────
export interface ActivationResult {
  plan:          "pro";
  planExpiresAt: string;
  billingCycle:  BillingCycle;
}

export async function activatePremiumKey(
  userId:   number,
  keyValue: string
): Promise<ActivationResult | null> {
  const keyResult = await db.execute({
    sql:  "SELECT id, used_by, plan, duration_days FROM premium_keys WHERE key_value = ?",
    args: [keyValue],
  });
  if (keyResult.rows.length === 0) return null;

  const key = keyResult.rows[0];
  if (key.used_by !== null) return null;

  const durationDays = Number(key.duration_days) || 31;
  const billingCycle: BillingCycle = durationDays >= 300 ? "annual" : "monthly";

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + durationDays);
  const planExpiresAt = expiresAt.toISOString();

  await db.batch([
    {
      sql:  "UPDATE premium_keys SET used_by = ?, used_at = datetime('now') WHERE key_value = ?",
      args: [userId, keyValue],
    },
    {
      sql:  "UPDATE users SET premium = 1, plan = 'pro', plan_expires_at = ?, billing_cycle = ? WHERE id = ?",
      args: [planExpiresAt, billingCycle, userId],
    },
  ]);

  return { plan: "pro", planExpiresAt, billingCycle };
}
