import { Router } from "express"
import { shiftController} from "./shift.controller"
import { authMiddleware }from "../../middlewares/auth.middleware"
import { roleMiddleware } from "../../middlewares/role.middleware"
import { validateCreateShift, validateUpdateShift } from "./shift.validation"

const router = Router()

const adminOnly = [authMiddleware, roleMiddleware("ADMIN")]
const staffOnly = [authMiddleware, roleMiddleware("STAFF")]


router.get("/my-division", staffOnly, shiftController.getMyDivisionShifts)

router.get("/company/:companyId/division/:divisionId", adminOnly, shiftController.getAll)
router.post("/", adminOnly, validateCreateShift, shiftController.create)
router.put("/:id", adminOnly, validateUpdateShift, shiftController.update)
router.delete("/:id", adminOnly, shiftController.delete)
router.get("/:id", adminOnly, shiftController.getById)


export default router