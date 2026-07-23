import { Router } from "express"
import {authController} from "./auth.controller"
import {authMiddleware} from '../../middlewares/auth.middleware'
import {roleMiddleware} from '../../middlewares/role.middleware'
import {validateRegister, validateLogin} from './auth.validation'


const router = Router()
const adminOnly = [authMiddleware, roleMiddleware("ADMIN")]


router.post("/register", adminOnly, validateRegister, authController.register)
router.post("/login", validateLogin, authController.login)
router.post("/logout", authController.logout)


export default router