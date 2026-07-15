import { Router } from "express"
import { shiftController} from "./shift.controller"
import { authMiddleware }from "../../middlewares/auth.middleware"
import { roleMiddleware } from "../../middlewares/role.middleware"
import { validateCreateShift, validateUpdateShift } from "./shift.validation"

const router = Router()


router.use(authMiddleware, roleMiddleware("ADMIN"))

// Place more specific routes BEFORE generic /:id routes
router.get("/company/:companyId/division/:divisionId", shiftController.getAll)

router.post("/",  validateCreateShift, shiftController.create)
router.get("/:id", shiftController.getById)
router.put("/:id",  validateUpdateShift, shiftController.update)
router.delete("/:id", shiftController.delete)

export default router