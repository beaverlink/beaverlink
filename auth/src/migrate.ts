import 'dotenv/config'
import { readdirSync, readFileSync } from 'node:fs'
import { pool } from './db.js'

const migrationsDir = new URL('../migrations/', import.meta.url)

async function runMigrations() {
  const files = readdirSync(migrationsDir)
    .filter((file) => /^\d+_.*\.sql$/.test(file))
    .sort()

  const client = await pool.connect()

  try {
    for (const file of files) {
      await client.query('BEGIN')

      try {
        // Create the migration tracking table
        await client.query(`
          CREATE SCHEMA IF NOT EXISTS better_auth;

          CREATE TABLE IF NOT EXISTS better_auth.schema_migrations (
            filename TEXT PRIMARY KEY,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );
        `)

        // Check whether migration has already run
        const result = await client.query(
          `SELECT 1
           FROM better_auth.schema_migrations
           WHERE filename = $1`,
          [file]
        )

        if (result.rowCount === 0) {
          // Execute migration
          const sql = readFileSync(
            new URL(`../migrations/${file}`, import.meta.url),
            'utf8'
          )

          await client.query(sql)

          // Record successful migration
          await client.query(
            `INSERT INTO better_auth.schema_migrations (filename)
             VALUES ($1)`,
            [file]
          )

          console.log(`Applied: ${file}`)
        } else {
          console.log(`Skipped: ${file} (already applied)`)
        }

        await client.query('COMMIT')
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      }
    }
  } finally {
    client.release()
  }
}

async function main() {
  try {
    await runMigrations()
    console.log('Migrations complete')
  } catch (error) {
    console.error('Migration failed:', error)
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}

void main()