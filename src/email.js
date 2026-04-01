// src/email.js
// Sends notification emails via Gmail using an App Password.

import nodemailer from 'nodemailer'
import dotenv from 'dotenv'
dotenv.config()

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

// ── Registration confirmation to the attendee ──────────────────────────────
export async function sendRegistrationConfirmation(data) {
  const ticketLabels = {
    general: 'General Admission — $49',
    vip: 'VIP Pass — $129',
    virtual: 'Virtual Access — Free',
  }

  await transporter.sendMail({
    from: `"Registration123" <${process.env.GMAIL_USER}>`,
    to: data.email,
    subject: '✅ You\'re registered for Annual Tech Summit 2026!',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;border:1px solid #e2e5f0;border-radius:12px;">
        <div style="background:#0f1f66;padding:24px;border-radius:8px;text-align:center;margin-bottom:28px;">
          <h1 style="color:white;margin:0;font-size:24px;">Registration<span style="color:#e85d14;">123</span></h1>
        </div>
        <h2 style="color:#0f1f66;">You're registered, ${data.firstName}! 🎉</h2>
        <p style="color:#555f6e;line-height:1.6;">Thanks for registering for the <strong>Annual Tech Summit 2026</strong>. Here's a summary of your registration:</p>
        <div style="background:#f7f8fc;border-radius:8px;padding:20px;margin:20px 0;">
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 0;color:#8a9099;font-size:13px;">NAME</td><td style="padding:8px 0;font-weight:600;color:#0f1f66;">${data.firstName} ${data.lastName}</td></tr>
            <tr><td style="padding:8px 0;color:#8a9099;font-size:13px;">EMAIL</td><td style="padding:8px 0;font-weight:600;color:#0f1f66;">${data.email}</td></tr>
            <tr><td style="padding:8px 0;color:#8a9099;font-size:13px;">TICKET</td><td style="padding:8px 0;font-weight:600;color:#0f1f66;">${ticketLabels[data.ticketType] || data.ticketType}</td></tr>
            <tr><td style="padding:8px 0;color:#8a9099;font-size:13px;">DATE</td><td style="padding:8px 0;font-weight:600;color:#0f1f66;">April 15, 2026 · 9:00 AM</td></tr>
            <tr><td style="padding:8px 0;color:#8a9099;font-size:13px;">LOCATION</td><td style="padding:8px 0;font-weight:600;color:#0f1f66;">Chicago Convention Center, IL</td></tr>
          </table>
        </div>
        <p style="color:#555f6e;line-height:1.6;">We'll send you a reminder closer to the event. See you there!</p>
        <p style="color:#8a9099;font-size:12px;margin-top:32px;border-top:1px solid #e2e5f0;padding-top:16px;">
          © 2026 Registration123 · Chicago, IL
        </p>
      </div>
    `,
  })
}

// ── Notification to admin when someone registers ───────────────────────────
export async function sendRegistrationNotification(data) {
  await transporter.sendMail({
    from: `"Registration123" <${process.env.GMAIL_USER}>`,
    to: process.env.NOTIFY_EMAIL,
    subject: `🎟️ New Registration: ${data.firstName} ${data.lastName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;">
        <h2 style="color:#0f1f66;">New Event Registration</h2>
        <table style="width:100%;border-collapse:collapse;margin-top:16px;">
          <tr style="background:#f7f8fc;"><td style="padding:10px;font-weight:600;width:40%;">Name</td><td style="padding:10px;">${data.firstName} ${data.lastName}</td></tr>
          <tr><td style="padding:10px;font-weight:600;">Email</td><td style="padding:10px;">${data.email}</td></tr>
          <tr style="background:#f7f8fc;"><td style="padding:10px;font-weight:600;">Phone</td><td style="padding:10px;">${data.phone || '—'}</td></tr>
          <tr><td style="padding:10px;font-weight:600;">Organization</td><td style="padding:10px;">${data.organization || '—'}</td></tr>
          <tr style="background:#f7f8fc;"><td style="padding:10px;font-weight:600;">Ticket Type</td><td style="padding:10px;">${data.ticketType}</td></tr>
          <tr><td style="padding:10px;font-weight:600;">Dietary</td><td style="padding:10px;">${data.dietary || '—'}</td></tr>
          <tr style="background:#f7f8fc;"><td style="padding:10px;font-weight:600;">Notes</td><td style="padding:10px;">${data.notes || '—'}</td></tr>
        </table>
      </div>
    `,
  })
}

// ── Contact form notification to admin ────────────────────────────────────
export async function sendContactNotification(data) {
  await transporter.sendMail({
    from: `"Registration123" <${process.env.GMAIL_USER}>`,
    to: process.env.NOTIFY_EMAIL,
    subject: `📬 New Contact: ${data.subject} — ${data.name}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;">
        <h2 style="color:#0f1f66;">New Contact Form Submission</h2>
        <table style="width:100%;border-collapse:collapse;margin-top:16px;">
          <tr style="background:#f7f8fc;"><td style="padding:10px;font-weight:600;width:40%;">Name</td><td style="padding:10px;">${data.name}</td></tr>
          <tr><td style="padding:10px;font-weight:600;">Email</td><td style="padding:10px;">${data.email}</td></tr>
          <tr style="background:#f7f8fc;"><td style="padding:10px;font-weight:600;">Subject</td><td style="padding:10px;">${data.subject}</td></tr>
          <tr><td style="padding:10px;font-weight:600;">Message</td><td style="padding:10px;white-space:pre-wrap;">${data.message}</td></tr>
        </table>
        <p style="margin-top:20px;">
          <a href="mailto:${data.email}" style="background:#e85d14;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">Reply to ${data.name}</a>
        </p>
      </div>
    `,
  })
}

// ── Contact form auto-reply to sender ─────────────────────────────────────
export async function sendContactAutoReply(data) {
  await transporter.sendMail({
    from: `"Registration123" <${process.env.GMAIL_USER}>`,
    to: data.email,
    subject: 'We received your message — Registration123',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;border:1px solid #e2e5f0;border-radius:12px;">
        <div style="background:#0f1f66;padding:24px;border-radius:8px;text-align:center;margin-bottom:28px;">
          <h1 style="color:white;margin:0;font-size:24px;">Registration<span style="color:#e85d14;">123</span></h1>
        </div>
        <h2 style="color:#0f1f66;">Thanks for reaching out, ${data.name}!</h2>
        <p style="color:#555f6e;line-height:1.6;">We received your message and will get back to you within <strong>2 business hours</strong>.</p>
        <div style="background:#f7f8fc;border-radius:8px;padding:16px;margin:20px 0;border-left:4px solid #e85d14;">
          <p style="color:#8a9099;font-size:13px;margin:0 0 6px;">YOUR MESSAGE</p>
          <p style="color:#555f6e;margin:0;white-space:pre-wrap;">${data.message}</p>
        </div>
        <p style="color:#8a9099;font-size:12px;margin-top:32px;border-top:1px solid #e2e5f0;padding-top:16px;">
          © 2026 Registration123 · Chicago, IL
        </p>
      </div>
    `,
  })
}
