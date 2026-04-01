// src/routes/contact.js

import express from 'express'
import { pool } from '../db.js'
import {
  sendContactNotification,
  sendContactAutoReply,
} from '../email.js'

const router = express.Router()

// POST /api/contact
router.post('/', async (req, res) => {
  const { name, email, subject, message } = req.body

  // Basic validation
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ message: 'All fields are required.' })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Invalid email address.' })
  }

  try {
    // Save to database
    await pool.query(
      `INSERT INTO contacts (name, email, subject, message)
       VALUES ($1, $2, $3, $4)`,
      [name, email, subject, message]
    )

    // Send emails in parallel
    Promise.all([
      sendContactNotification({ name, email, subject, message }),
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

// GET /api/contact — view all messages (protect this in production!)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM contacts ORDER BY created_at DESC'
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router
