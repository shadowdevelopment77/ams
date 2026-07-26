// Extracts a Cloudinary public_id (e.g. "ams/attendance/abc123") from a
// secure_url (e.g. "https://res.cloudinary.com/<cloud>/image/upload/v.../ams/attendance/abc123.jpg"),
// used by the reset-demo job to delete real visitor-uploaded photos via
// Cloudinary's Admin API. Returns null for anything not actually hosted on
// Cloudinary (the seed scripts' picsum.photos URLs never match).
export function extractCloudinaryPublicId(url: string | null | undefined): string | null {
  if (!url || !url.includes('res.cloudinary.com')) return null
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/)
  return match ? match[1] : null
}
