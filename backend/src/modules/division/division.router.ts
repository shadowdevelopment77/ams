import { Router } from "express"
import * as DivisionController from "./division.controller"
import { authenticate, requireRole } from "../../middlewares/auth.middleware"

const router = Router()
const adminOnly = [authenticate, requireRole("ADMIN")]

router.use(adminOnly)

router.post("/", DivisionController.createDivision)
router.put("/:id", DivisionController.updateDivision)
router.delete("/:id", DivisionController.deleteDivision)
router.get("/company/:company_id", DivisionController.getDivisionsByCompany)

export default router