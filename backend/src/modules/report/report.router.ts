import { Router } from "express"
import * as ReportController from "./report.controller"
import { authenticate, requireRole } from "../../middlewares/auth.middleware"

const router = Router()
const adminOnly = [authenticate,requireRole("ADMIN")]


// ADMIN only
router.post("/templates", adminOnly, ReportController.createReportTemplate)
router.put("/templates/:division_id", adminOnly, ReportController.updateReportTemplate)
router.post("/generate", adminOnly, ReportController.generateReport)
router.delete("/:id", adminOnly, ReportController.deleteReport)
router.patch("/:id/printed", adminOnly, ReportController.markReportPrinted)
router.get("/templates/:division_id",adminOnly, ReportController.getReportTemplate)
router.get("/division/:division_id", adminOnly, ReportController.getReportsByDivision)
router.get("/:id", adminOnly, ReportController.getReportById)
router.get("/:id/download", adminOnly, ReportController.downloadReport)

export default router