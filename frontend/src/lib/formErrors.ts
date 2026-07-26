import { ApiError } from '@/api/client'

// Zod's ZodIssue shape (backend's validation middleware passes
// `result.error.issues` straight through as the response's `errors` field —
// see e.g. backend/src/modules/company/company.validation.ts). Other error
// types (409 conflict, 404 not found) put `errors: null` instead, so this
// stays a best-effort mapping, not a guarantee.
interface ZodIssueLike {
  path: (string | number)[]
  message: string
}

function isZodIssueArray(value: unknown): value is ZodIssueLike[] {
  return (
    Array.isArray(value) &&
    value.every(
      (v) => v && typeof v === 'object' && Array.isArray((v as ZodIssueLike).path) && typeof (v as ZodIssueLike).message === 'string'
    )
  )
}

// Splits an ApiError into per-field messages (for inline display next to the
// offending input) and a top-level message (for anything that isn't a field
// validation error -- 409s, 404s, network failures). A field with no mapped
// issue simply won't appear in `fieldErrors`.
export function mapApiError(err: unknown): { fieldErrors: Record<string, string>; formError: string | null } {
  if (!(err instanceof ApiError)) {
    return { fieldErrors: {}, formError: 'Something went wrong' }
  }

  if (isZodIssueArray(err.issues) && err.issues.length > 0) {
    const fieldErrors: Record<string, string> = {}
    for (const issue of err.issues) {
      const field = issue.path.join('.')
      if (field) fieldErrors[field] = issue.message
    }
    return { fieldErrors, formError: null }
  }

  return { fieldErrors: {}, formError: err.message }
}
