import { Router } from "express"
import * as AdminController from "./admin.controller"
import { authenticate, requireRole } from "../../../middlewares/auth.middleware"

const router = Router()
const adminOnly = [authenticate, requireRole("ADMIN")]

// all admin routes require login + ADMIN role
router.use(adminOnly)

router.post("/assign-company", AdminController.assignUserToCompany)
router.delete("/remove-company", AdminController.removeUserFromCompany)
router.get("/internal-users", AdminController.getInternalUsers)
router.post("/move-company", AdminController.moveUserToCompany)
router.get("/company/:company_id/users", AdminController.getUsersByCompanies)
router.delete("/users/:user_id", AdminController.removeUser)

export default router