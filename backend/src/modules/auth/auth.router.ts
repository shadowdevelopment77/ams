import { Router } from "express"
import * as AuthController from "./auth.controller"
import {authenticate, requireRole} from "../../middlewares/auth.middleware"

const router = Router()


router.post("/register", requireRole("ADMIN"), AuthController.register)
router.post("/login", AuthController.login)
router.post("/logout", AuthController.logout)
router.get("/me", authenticate, AuthController.getMe)

export default router