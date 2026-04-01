// src/routes/registrations.js

import express from 'express'
import Stripe from 'stripe'
import { pool } from '../db.js'
import {
  sendRegistrationConfirmation,
  sendRegistrationNotification,
} from '../email.js'
import dotenv from 'dotenv'
dotenv.config()

const router = express.Router()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const TICKET_PRICES = {
  general: { label: 'General Admission', amount: 4900 }, // in cents
  vip:     { label: 'VIP Pass',          amount: 12900 },
  virtual: { label: 'Virtual Access',    amount: 0     },
}

// ── POST /api/registrations/checkout ──────────────────────────────────────
// Creates a Stripe Checkout session and returns the URL
router.post('/checkout', async (req, res) => {
  const {
    firstName, lastName, email, phone,
    organization, ticketType, dietary, notes,
  } = req.body

  if (!firstName || !lastName || !email || !ticketType) {
    return res.status(400).json({ message: 'Missing required fields.' })
  }

  const ticket = TICKET_PRICES[ticketType]
  if (!ticket) {
    return res.status(400).json({ message: 'Invalid ticket type.' })
  }

  try {
    // Save pending registration to DB first
    const result = await pool.query(
      `INSERT INTO registrations
        (first_name, last_name, email, phone, organization, ticket_type, dietary, notes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'pending')
       RETURNING id`,
      [firstName, lastName, email, phone, organization, ticketType, dietary, notes]
    )
    const registrationId = result.rows[0].id

    // Free ticket — skip Stripe
    if (ticket.amount === 0) {
      await pool.query(
        `UPDATE registrations SET status='confirmed' WHERE id=$1`,
        [registrationId]
      )
      Promise.all([
        sendRegistrationConfirmation({ firstName, lastName, email, ticketType }),
        sendRegistrationNotification({ firstName, lastName, email, phone, organization, ticketType, dietary, notes }),
      ]).catch(err => console.error('Email error:', err))

      return res.status(201).json({
        success: true,
        free: true,
        confirmationId: `REG-${registrationId}`,
      })
    }

    // Paid ticket — create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Annual Tech Summit 2026 — ${ticket.label}`,
              description: `Registered for: ${firstName} ${lastName}`,
            },
            unit_amount: ticket.amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/register/success?session_id={CHECKOUT_SESSION_ID}&reg_id=${registrationId}`,
      cancel_url: `${process.env.FRONTEND_URL}/register/cancel`,
      metadata: {
        registrationId: String(registrationId),
        firstName, lastName, email, ticketType,
      },
    })

    res.json({ url: session.url })

  } catch (err) {
    console.error('Checkout error:', err)
    res.status(500).json({ message: 'Server error. Please try again.' })
  }
})

// ── POST /api/registrations/webhook ───────────────────────────────────────
// Stripe calls this when payment is confirmed
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature']
  let event

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('Webhook signature error:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const { registrationId, firstName, lastName, email, ticketType } = session.metadata

    try {
      await pool.query(
        `UPDATE registrations SET status='confirmed', stripe_session_id=$1 WHERE id=$2`,
        [session.id, registrationId]
      )

      Promise.all([
        sendRegistrationConfirmation({ firstName, lastName, email, ticketType }),
        sendRegistrationNotification({ firstName, lastName, email, ticketType }),
      ]).catch(err => console.error('Email error:', err))

    } catch (err) {
      console.error('Webhook DB error:', err)
    }
  }

  res.json({ received: true })
})

// ── GET /api/registrations ─────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM registrations ORDER BY created_at DESC'
    )
    res.json(result.rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router
