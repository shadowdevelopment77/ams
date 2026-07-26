import { Router } from "express"
import { attendanceController }from "./attendance.controller"
import {authMiddleware} from '../../middlewares/auth.middleware'
import {roleMiddleware} from '../../middlewares/role.middleware'
import {validateCheckIn, validateCheckOut, validateEarlyLeaveReason, attendanceQuerySchema} from './attendance.validation'
import { validateQuery } from '../../middlewares/validate-query.middleware'
import { uploadAttendance } from '../../lib/multer'

const router = Router()
const staffOnly = [authMiddleware, roleMiddleware("STAFF")]
const adminOnly = [authMiddleware, roleMiddleware("ADMIN")]


router.get("/today", staffOnly, attendanceController.getToday)
router.get("/history", staffOnly, attendanceController.getMyHistory)
router.post("/checkin", staffOnly, uploadAttendance.single("photo"), validateCheckIn, attendanceController.checkIn)
router.patch("/checkout/:id", staffOnly, uploadAttendance.single("checkout_photo"), validateCheckOut, attendanceController.checkOut)
router.get("/", adminOnly, validateQuery(attendanceQuerySchema), attendanceController.getByDate)
router.get("/late", adminOnly, validateQuery(attendanceQuerySchema), attendanceController.getLate)
router.patch("/early-leave/:id", staffOnly, validateEarlyLeaveReason, attendanceController.submitEarlyLeaveReason)
router.get("/attendance-photos", adminOnly, validateQuery(attendanceQuerySchema), attendanceController.getAttendancePhotos)

export default router