import { Router } from "express"
import * as AttendanceController from "./attendance.controller"
import { authenticate, requireRole } from "../../middlewares/auth.middleware"
import { uploadAttendance, uploadAbsent, uploadVisit } from "../../lib/multer"

const router = Router()
const staffOnly = [authenticate, requireRole("STAFF")]
const supervisorOnly = [authenticate, requireRole("SUPERVISOR")]


// STAFF only
router.post("/checkin", staffOnly, uploadAttendance.single("photo"), AttendanceController.checkIn)
router.post("/checkout", staffOnly,uploadAttendance.single("photo"), AttendanceController.checkOut)
router.post("/absent", staffOnly, uploadAbsent.single("proof"), AttendanceController.submitAbsentRequest)
router.get("/my", staffOnly, AttendanceController.getMyAttendance)
router.get("/today", staffOnly, AttendanceController.getTodayAttendance)

// SUPERVISOR only
router.post("/visit", supervisorOnly, uploadVisit.single("photo"), AttendanceController.createVisitLog)
router.get("/visits/my", supervisorOnly, AttendanceController.getMyVisitLogs)

export default router