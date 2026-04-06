// src/index.js

import committeeRouter from './routes/committeeRoutes.js'
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { initDB } from './db.js'
import registrationsRouter from './routes/registrations.js'
import contactRouter from './routes/contact.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// ── CORS ──────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:5173',
  ],
  methods: ['GET', 'POST'],
}))

// ── Webhook must use raw body BEFORE express.json() ───────────────────────
app.use('/api/registrations/webhook', express.raw({ type: 'application/json' }))

// ── JSON for everything else ──────────────────────────────────────────────
app.use(express.json())

// ── Routes ────────────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({ status: 'Registration123 API is running ✅' })
})

app.use('/api/registrations', registrationsRouter)
app.use('/api/contact', contactRouter)
app.use('/api/committee', committeeRouter)
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' })
})

// ── Start ─────────────────────────────────────────────────────────────────
async function start() {
  await initDB()
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`)
  })
}

start().catch(err => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
