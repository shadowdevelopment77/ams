import { Router } from "express"
import { shiftController} from "./shift.controller"
import { authMiddleware }from "../../middlewares/auth.middleware"
import { roleMiddleware } from "../../middlewares/role.middleware"
import { validateCreateShift, validateUpdateShift } from "./shift.validation"

const router = Router()


router.use(authMiddleware, roleMiddleware("ADMIN"))



router.post("/",  validateCreateShift, shiftController.create.bind(shiftController))
router.put("/:id",  validateUpdateShift, shiftController.update.bind(shiftController))
router.delete("/:id", shiftController.delete.bind(shiftController))
router.get("/:id", shiftController.getById.bind(shiftController))
router.get("/company/:companyId/division/:divisionId", shiftController.getAll.bind(shiftController))

export default router