// src/routes/contact.js

import express from 'express'
import { pool } from '../db.js'
import { sendContactNotification, sendContactAutoReply } from '../email.js'

const router = express.Router()

// POST /api/contact
router.post('/', async (req, res) => {
  const { name, email, subject, message, estimatedParticipants, programMonth, programYear } = req.body

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ message: 'All required fields must be filled.' })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Invalid email address.' })
  }

  try {
    await pool.query(
      `INSERT INTO contacts (name, email, subject, message, estimated_participants, program_month, program_year)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [name, email, subject, message, estimatedParticipants || null, programMonth || null, programYear || null]
    )

    Promise.all([
      sendContactNotification({ name, email, subject, message, estimatedParticipants, programMonth, programYear }),
      sendContactAutoReply({ name, email, message }),
    ]).catch(err => console.error('Email error:', err))

    return res.status(201).json({
      success: true,
      message: 'Message received! We\'ll be in touch within 2 business hours.',
    })
  } catch (err) {
    console.error('Contact error:', err)
    return res.status(500).json({ message: 'Server error. Please try again.' })
  }
})

// GET /api/contact
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM contacts ORDER BY created_at DESC')
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router
