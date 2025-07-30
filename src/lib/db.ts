import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { promises as fs } from "fs";
import {
  CamelCasePlugin,
  FileMigrationProvider,
  Kysely,
  Migrator,
  PostgresDialect,
} from "kysely";
import { fileURLToPath } from "node:url";
import path from "path";
import pg from "pg";
import Cursor from "pg-cursor";
import { Tables } from "../types/db";
import { NodePostgresAdapter } from "@lucia-auth/adapter-postgresql";

const { Pool } = pg;

// Global pool variable for singleton pattern
let globalPool: pg.Pool | undefined;

// Create pool with serverless-optimized configuration
const createPool = (): pg.Pool => {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  return new Pool({
    connectionString,
    max: 1, // Only 1 connection per function (serverless-optimized)
    min: 0, // No minimum connections
    idleTimeoutMillis: 120000, // 2 minutes - close before PgBouncer timeout
    allowExitOnIdle: true, // Let process exit when idle
    maxUses: 100, // Rotate connections frequently
  });
};

// Singleton pool getter with error recovery
const getPool = (): pg.Pool => {
  if (!globalPool) {
    globalPool = createPool();

    // Add error handling to reset pool on connection errors
    globalPool.on("error", (err: Error) => {
      console.error("Database pool error:", err);
      globalPool = undefined; // Reset to force recreation
    });
  }

  return globalPool;
};

export const getDbClient = (
  connectionString: string | undefined = process.env.DATABASE_URL
) => {
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  return new Kysely<Tables>({
    dialect: new PostgresDialect({
      pool: getPool(), // Always use the singleton pool
      cursor: Cursor,
    }),
    plugins: [new CamelCasePlugin()],
    log: ["error", "query"],
  });
};

export const getAuthAdapter = (
  connectionString: string | undefined = process.env.DATABASE_URL
) => {
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const adapter = new NodePostgresAdapter(getPool(), {
    // Use singleton pool
    user: "users",
    session: "user_session",
  });

  return adapter;
};

// Both database instances now use the same singleton pool
export const db = getDbClient();
export const luciaDb = getDbClient();

const createMigrator = async (db: Kysely<Tables>) => {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(currentDir, "../", "migrations"),
    }),
  });

  return migrator;
};

export const migrateToLatest = async (db: Kysely<Tables>): Promise<void> => {
  const migrator = await createMigrator(db);

  const { error, results } = await migrator.migrateToLatest();

  results?.forEach((it) => {
    if (it.status === "Success") {
      console.log(`Migration "${it.migrationName}" was executed successfully`);
    } else if (it.status === "Error") {
      console.error(`failed to execute migration "${it.migrationName}"`);
    }
  });

  if (error) {
    console.error("Failed to apply all database migrations");
    console.error(error);
    throw error;
  }

  console.log("Migrations up to date");
};

export async function ensureMigrations(db: Kysely<Tables>) {
  console.log("Ensuring database migrations are up to date");

  try {
    await migrateToLatest(db);
  } catch (error) {
    console.error("Failed to migrate database", error);
    throw error;
  }
}
