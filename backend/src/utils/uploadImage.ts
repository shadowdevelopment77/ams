import cloudinary from "../lib/cloudinary"
import sharp from "sharp"

type UploadFolder = "ams/attendance" | "ams/visits" | "ams/checklist"

export const uploadImage = async (
  buffer: Buffer,
  folder: UploadFolder
): Promise<string> => {
  const compressed = await sharp(buffer)
    .resize(1080, 1080, {
      fit:               'inside',
      withoutEnlargement: true
    })
    .jpeg({ quality: 70 })
    .toBuffer()

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        transformation: [{
          quality:      "auto:low",
          fetch_format: "auto",
        }]
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error("Upload failed"))
        resolve(result.secure_url)
      }
    )
    stream.end(compressed) // not the original buffer
  })
}