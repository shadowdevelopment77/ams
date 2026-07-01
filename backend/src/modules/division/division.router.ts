import { Router } from "express"
import {authMiddleware} from '../../middlewares/auth.middleware'
import {roleMiddleware} from '../../middlewares/role.middleware'
import { divisionController } from "./division.controller"
import { validateCreateDivision, validateUpdateDivision } from "./division.validation"

const router = Router()
const adminOnly = [authMiddleware, roleMiddleware("ADMIN")]

router.use(adminOnly)

router.get("/", divisionController.getAll.bind(divisionController))
router.get("/:id", divisionController.getById.bind(divisionController))
router.post("/", validateCreateDivision, divisionController.create.bind(divisionController))
router.put("/:id", validateUpdateDivision, divisionController.update.bind(divisionController))
router.delete("/:id", divisionController.delete.bind(divisionController))
router.get("/company/:companyId", divisionController.getByCompany.bind(divisionController))


export default router