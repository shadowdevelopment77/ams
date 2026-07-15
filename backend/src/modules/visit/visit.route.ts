import { Router } from 'express'
import { visitLogController } from './visit.controller'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { roleMiddleware } from '../../middlewares/role.middleware'
import { validateCreateVisitLog } from './visit.validation'
import { uploadVisit } from '../../lib/multer'

const router = Router()

const supervisorOnly = [authMiddleware, roleMiddleware('SUPERVISOR')]
const adminOnly = [authMiddleware, roleMiddleware('ADMIN')]

//supervisor
router.post ('/', supervisorOnly, uploadVisit.single('photo'), validateCreateVisitLog, visitLogController.create)
router.get('/my-visits',supervisorOnly,visitLogController.getByUser)

//admin
router.get('/', adminOnly, visitLogController.getAll)
router.delete('/:id', adminOnly, visitLogController.delete)
router.get('/user/:userId/photos',adminOnly, visitLogController.getVisitPhotos)

export default router