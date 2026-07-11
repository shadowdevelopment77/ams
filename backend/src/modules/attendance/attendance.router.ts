import { Router } from "express"
import { attendanceController }from "./attendance.controller"
import {authMiddleware} from '../../middlewares/auth.middleware'
import {roleMiddleware} from '../../middlewares/role.middleware'
import {validateCheckIn, validateCheckOut, validateEarlyLeaveReason} from './attendance.validation'
import { uploadAttendance } from '../../lib/multer'

const router = Router()
const staffOnly = [authMiddleware, roleMiddleware("STAFF")]
const adminOnly = [authMiddleware, roleMiddleware("ADMIN")]


router.post("/checkin", uploadAttendance.single("photo"), validateCheckIn, staffOnly, attendanceController.checkIn)
router.patch("/checkout/:id", uploadAttendance.single("checkout_photo"), validateCheckOut, staffOnly, attendanceController.checkOut)
router.get("/", adminOnly, attendanceController.getByDate)
router.get("/late", adminOnly, attendanceController.getLate)
router.patch("/early-leave/:id", validateEarlyLeaveReason, staffOnly, attendanceController.submitEarlyLeaveReason)
router.get("/attendance-photos", adminOnly, attendanceController.getAttendancePhotos)

export default router