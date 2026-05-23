import { Router } from "express"
import * as ShiftController from "./shift.controller"
import { authenticate, requireRole } from "../../middlewares/auth.middleware"

const router = Router()
const adminOnly = [authenticate, requireRole("ADMIN")]



router.post("/", adminOnly, ShiftController.createShift)
router.put("/:id", adminOnly, ShiftController.updateShift)
router.delete("/:id", adminOnly, ShiftController.deleteShift)
router.get("/division/:division_id",  ShiftController.getShiftsByDivision)

export default router