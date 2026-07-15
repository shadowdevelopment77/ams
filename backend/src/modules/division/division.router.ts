import { Router } from "express"
import {authMiddleware} from '../../middlewares/auth.middleware'
import {roleMiddleware} from '../../middlewares/role.middleware'
import { divisionController } from "./division.controller"
import { validateCreateDivision, validateUpdateDivision } from "./division.validation"

const router = Router()
const adminOnly = [authMiddleware, roleMiddleware("ADMIN")]

router.use(adminOnly)

router.get("/", divisionController.getAll)
router.get("/:id", divisionController.getById)
router.post("/", validateCreateDivision, divisionController.create)
router.put("/:id", validateUpdateDivision, divisionController.update)
router.delete("/:id", divisionController.delete)
router.get("/company/:companyId", divisionController.getByCompany)


export default router