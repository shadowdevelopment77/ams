import { Router } from "express"
import {userController} from "./user.controller"
import {authMiddleware} from '../../middlewares/auth.middleware'
import {roleMiddleware} from '../../middlewares/role.middleware'
import {validateMoveCompany} from "./user.validation"


const router = Router()

router.use(authMiddleware, roleMiddleware("ADMIN"))

router.get("/company/:companyId/division/:divisionId", userController.findUsersByCompanyAndDivision)
router.get("/", userController.getAllUsers)
router.get("/:id", userController.getUserById)
router.delete("/:id", userController.delete)
router.put("/:id/move-company", validateMoveCompany, userController.moveCompany)


export default router