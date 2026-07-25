import { Router } from "express"
import {authController} from "./auth.controller"
import {authMiddleware} from '../../middlewares/auth.middleware'
import {roleMiddleware} from '../../middlewares/role.middleware'
import {validateRegister, validateLogin} from './auth.validation'
import {authLimiter} from '../../middlewares/rate-limit.middleware'


const router = Router()
const adminOnly = [authMiddleware, roleMiddleware("ADMIN")]


router.post("/register", authLimiter, adminOnly, validateRegister, authController.register)
router.post("/login", authLimiter, validateLogin, authController.login)
router.post("/logout", authLimiter, authController.logout)
// No authLimiter: passive session check called on every page load/refresh,
// not a brute-force target the way login/register/logout are (see app.ts).
router.get("/me", authMiddleware, authController.me)


export default router