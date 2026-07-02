import { Router } from "express"
import {userController} from "./user.controller"
import {authMiddleware} from '../../middlewares/auth.middleware'
import {roleMiddleware} from '../../middlewares/role.middleware'
import {validateMoveCompany} from "./user.validation"


const router = Router()
const adminOnly = [authMiddleware, roleMiddleware("ADMIN")]

router.use(adminOnly)

router.get("/", userController.getAllUsers.bind(userController))
router.get("/:id", userController.getUserById.bind(userController))
router.delete("/:id", userController.delete.bind(userController))
router.put("/move-company", validateMoveCompany, userController.moveCompany.bind(userController))
router.get("/company/:companyId/division/:divisionId", userController.findUsersByCompanyAndDivision.bind(userController))

export default router