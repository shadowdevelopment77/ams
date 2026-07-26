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
// No authLimiter here -- unlike login/register, logout already requires a
// valid session, so it's not a credential-guessing target. authLimiter's
// keyGenerator falls back to raw IP when there's no email in the body
// (every logout request), which meant every account sharing one browser/IP
// drew from the same 10-req bucket. The global identity-keyed apiLimiter
// (app.ts) already covers it.
router.post("/logout", authController.logout)
// No authLimiter here -- passive session check on every page load, not a brute-force target.
router.get("/me", authMiddleware, authController.me)


export default router