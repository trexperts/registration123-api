// src/api/contact.js
// Connects to the real Express backend.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export async function submitContact(formData) {
  const response = await fetch(`${API_URL}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Failed to send message. Please try again.')
  }

  return data
}
