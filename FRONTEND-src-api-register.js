// src/api/register.js
// Connects to the real Express backend.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export async function submitRegistration(formData) {
  const response = await fetch(`${API_URL}/api/registrations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Registration failed. Please try again.')
  }

  return data
}
