import { Router } from 'express'
import { adminController } from './admin.controller'
import { resetDemoAuth } from '../../middlewares/reset-demo-auth.middleware'

const router = Router()

router.post('/reset-demo', resetDemoAuth, adminController.resetDemo)

export default router
