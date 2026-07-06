import { Router } from "express"
import { shiftController} from "./shift.controller"
import { authMiddleware }from "../../middlewares/auth.middleware"
import { roleMiddleware } from "../../middlewares/role.middleware"
import { validateCreateShift, validateUpdateShift } from "./shift.validation"

const router = Router()


router.use(authMiddleware, roleMiddleware("ADMIN"))



router.post("/",  validateCreateShift, shiftController.create)
router.put("/:id",  validateUpdateShift, shiftController.update)
router.delete("/:id", shiftController.delete)
router.get("/:id", shiftController.getById)
router.get("/company/:companyId/division/:divisionId", shiftController.getAll)

export default router