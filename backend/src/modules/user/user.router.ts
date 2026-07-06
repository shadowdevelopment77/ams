import { Router } from "express"
import {userController} from "./user.controller"
import {authMiddleware} from '../../middlewares/auth.middleware'
import {roleMiddleware} from '../../middlewares/role.middleware'
import {validateMoveCompany} from "./user.validation"


const router = Router()
const adminOnly = [authMiddleware, roleMiddleware("ADMIN")]

router.use(adminOnly)

router.get("/", userController.getAllUsers)
router.get("/:id", userController.getUserById)
router.delete("/:id", userController.delete)
router.put("/move-company", validateMoveCompany, userController.moveCompany)
router.get("/company/:companyId/division/:divisionId", userController.findUsersByCompanyAndDivision)

export default router