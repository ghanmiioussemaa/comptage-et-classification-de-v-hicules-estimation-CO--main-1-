const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8001'

/**
 * Upload a video file → returns { session_id, status }
 */
export async function uploadVideo(file) {
  const form = new FormData()
  form.append('file', file)

  const res = await fetch(`${BASE}/api/video/upload`, {
    method: 'POST',
    body: form,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `Upload failed (${res.status})`)
  }
  return res.json()  // { session_id, status: "pending" }
}

/**
 * Poll session status → returns { session_id, status, error? }
 * status is one of: "pending" | "processing" | "completed" | "failed"
 */
export async function getSessionStatus(sessionId) {
  const res = await fetch(`${BASE}/api/video/session/${sessionId}`)

  if (!res.ok) {
    throw new Error(`Session poll failed (${res.status})`)
  }
  return res.json()  // { session_id, status, error? }
}