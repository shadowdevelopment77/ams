import { Router } from "express"
import * as ChecklistController from "./checklist.controller"
import { authenticate, requireRole } from "../../middlewares/auth.middleware"
import { uploadAttendance } from "../../lib/multer"

const router = Router()
const adminOnly = [authenticate, requireRole("ADMIN")]
const supervisorOnly = [authenticate, requireRole("SUPERVISOR")]
const staffOnly = [authenticate, requireRole("STAFF")]

// ADMIN — template + items
router.post("/templates", adminOnly, ChecklistController.createTemplate)
router.post("/items", adminOnly, ChecklistController.addItem)
router.put("/items/:id", adminOnly, ChecklistController.updateItem)
router.delete("/items/:id", adminOnly, ChecklistController.deleteItem)
router.patch("/photos/:photo_id/highlight", adminOnly, ChecklistController.highlightPhoto)
router.get("/photos/highlighted", adminOnly, ChecklistController.getHighlightedPhotos)

// ALL roles — get templates
router.get("/templates/division/:division_id", ChecklistController.getTemplatesByDivision)

// STAFF — fill checklist
router.get("/my/:attendance_id", staffOnly, ChecklistController.getMyChecklist)
router.post("/submit", staffOnly, ChecklistController.submitItem)
router.post("/submissions/:submission_id/lock", staffOnly, ChecklistController.lockSubmission)
router.post("/photos/:submission_id", staffOnly, uploadAttendance.single("photo"), ChecklistController.uploadEvidencePhoto)
router.delete("/photos/:photo_id", staffOnly, ChecklistController.deleteEvidencePhoto)

// SUPERVISOR — review photos
router.get("/photos/pending/:company_id", supervisorOnly, ChecklistController.getPendingPhotosByCompany)
router.patch("/photos/:photo_id/review", supervisorOnly, ChecklistController.reviewPhoto)

export default router