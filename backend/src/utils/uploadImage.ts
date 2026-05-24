import cloudinary from "../lib/cloudinary"

type UploadFolder = "ams/attendance" | "ams/absent" | "ams/visits"

export const uploadImage = (
  buffer: Buffer,
  folder: UploadFolder
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        transformation: [{ width: 500, height: 500, crop: "limit" }],
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error("Upload failed"))
        resolve(result.secure_url)
      }
    )
    stream.end(buffer)
  })
}