import { z } from "zod"

// Fail fast at boot instead of hardcoding config or letting a missing var
// surface confusingly deep inside a Cloudinary/Prisma call later. Only vars
// with no safe fallback are listed here — PORT and CORS_ORIGIN already have
// working defaults in app.ts/index.ts, so they're intentionally excluded.
const envSchema = z.object({
  DATABASE_URL:           z.string().min(1, "DATABASE_URL is required"),
  CLOUDINARY_CLOUD_NAME:  z.string().min(1, "CLOUDINARY_CLOUD_NAME is required"),
  CLOUDINARY_API_KEY:     z.string().min(1, "CLOUDINARY_API_KEY is required"),
  CLOUDINARY_API_SECRET:  z.string().min(1, "CLOUDINARY_API_SECRET is required"),
})

export function validateEnv() {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    console.error("Invalid/missing environment variables:")
    for (const issue of result.error.issues) {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`)
    }
    process.exit(1)
  }
}
