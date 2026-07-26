// Cloudinary URLs are cross-origin from the frontend, so a plain
// `<a download>` just navigates instead of forcing a save dialog. Fetching
// to a blob and creating an object URL works regardless of the CORS/
// transformation details on the source URL.
export async function downloadImage(url: string, filename: string) {
  const response = await fetch(url)
  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(objectUrl)
}
