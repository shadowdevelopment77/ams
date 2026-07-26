import { Router } from 'express'
import { visitLogController } from './visit.controller'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { roleMiddleware } from '../../middlewares/role.middleware'
import { validateCreateVisitLog, visitLogQuerySchema } from './visit.validation'
import { validateQuery } from '../../middlewares/validate-query.middleware'
import { uploadVisit } from '../../lib/multer'

const router = Router()

const supervisorOnly = [authMiddleware, roleMiddleware('SUPERVISOR')]
const adminOnly = [authMiddleware, roleMiddleware('ADMIN')]

router.post ('/', supervisorOnly, uploadVisit.single('photo'), validateCreateVisitLog, visitLogController.create)
router.get('/my-visits',supervisorOnly, validateQuery(visitLogQuerySchema), visitLogController.getByUser)

router.get('/', adminOnly, validateQuery(visitLogQuerySchema), visitLogController.getAll)
router.get('/:id', adminOnly, visitLogController.getById)
router.delete('/:id', adminOnly, visitLogController.delete)
router.get('/user/:userId/photos',adminOnly, validateQuery(visitLogQuerySchema), visitLogController.getVisitPhotos)

export default router