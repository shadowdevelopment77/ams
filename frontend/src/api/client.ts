const API_URL = import.meta.env.VITE_API_URL

// Mirrors backend/src/utils/error.response/response.ts's error shape.
export class ApiError extends Error {
  status: number
  issues: unknown

  constructor(status: number, message: string, issues?: unknown) {
    super(message)
    this.status = status
    this.issues = issues
  }
}

interface Envelope<T> {
  success: boolean
  message: string
  data?: T
  errors?: unknown
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      ...(options.body && !(options.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...options.headers,
    },
  })

  // 204/empty-body responses (rare here, but don't assume every response has JSON).
  const body: Envelope<T> | null = await res.json().catch(() => null)

  if (!res.ok || !body || !body.success) {
    throw new ApiError(
      res.status,
      body?.message ?? `Request failed with status ${res.status}`,
      body?.errors
    )
  }

  return body.data as T
}
