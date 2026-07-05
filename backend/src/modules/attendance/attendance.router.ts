import { Router } from "express"
import { attendanceController }from "./attendance.controller"
import {authMiddleware} from '../../middlewares/auth.middleware'
import {roleMiddleware} from '../../middlewares/role.middleware'
import {validateCheckIn, validateCheckOut, validateEarlyLeaveReason} from './attendance.validation'
import { uploadAttendance } from '../../lib/multer'

const router = Router()
const staffOnly = [authMiddleware, roleMiddleware("STAFF")]
const adminOnly = [authMiddleware, roleMiddleware("ADMIN")]


router.post("/checkin", uploadAttendance.single("photo"), validateCheckIn, staffOnly, attendanceController.checkIn.bind(attendanceController))
router.patch("/checkout", uploadAttendance.single("checkout_photo"), validateCheckOut, staffOnly, attendanceController.checkOut.bind(attendanceController))
router.get("/", adminOnly, attendanceController.getByDate.bind(attendanceController))
router.get("/late", adminOnly, attendanceController.getLate.bind(attendanceController))
router.patch("/early-leave/:id", validateEarlyLeaveReason, staffOnly, attendanceController.submitEarlyLeaveReason.bind(attendanceController))


export default router