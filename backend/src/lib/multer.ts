import multer from "multer"

const imageFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowed = ["image/jpeg", "image/png", "image/webp"]
  if (!allowed.includes(file.mimetype)) {
    return cb(new Error("Only JPEG, PNG, and WEBP images allowed"))
  }
  cb(null, true)
}

const MAX_SIZE = 1 * 1024 * 1024 // 1MB

export const uploadAttendance = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE },
  fileFilter: imageFilter,
})

export const uploadAbsent = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE },
  fileFilter: imageFilter,
})

export const uploadVisit = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE },
  fileFilter: imageFilter,
})