// src/db.js

import pg from 'pg'
import dotenv from 'dotenv'
dotenv.config()

const { Pool } = pg

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
})

export async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS registrations (
      id                SERIAL PRIMARY KEY,
      first_name        TEXT NOT NULL,
      last_name         TEXT NOT NULL,
      email             TEXT NOT NULL,
      phone             TEXT,
      organization      TEXT,
      ticket_type       TEXT NOT NULL,
      dietary           TEXT,
      notes             TEXT,
      status            TEXT DEFAULT 'pending',
      stripe_session_id TEXT,
      created_at        TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id         SERIAL PRIMARY KEY,
      name       TEXT NOT NULL,
      email      TEXT NOT NULL,
      subject    TEXT NOT NULL,
      message    TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Add new columns if they don't exist yet
    ALTER TABLE registrations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
    ALTER TABLE registrations ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
  `)
  console.log('✅ Database tables ready')
}
