import { Router } from 'express'
import { checklistController } from './checklist.controller'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { roleMiddleware } from '../../middlewares/role.middleware'
import { uploadChecklist } from '../../lib/multer'
import {
  validateCreateTemplate, validateUpdateTemplate,
  validateCreateItem, validateUpdateItem,
  templatesByDivisionQuerySchema,
  checklistPhotosByDivisionQuerySchema, checklistPhotosByUserQuerySchema,
} from './checklist.validation'
import { validateQuery } from '../../middlewares/validate-query.middleware'


const router = Router()

const adminOnly = [authMiddleware, roleMiddleware('ADMIN')]
const staffOnly = [authMiddleware, roleMiddleware('STAFF')]


router.post('/templates', adminOnly, validateCreateTemplate, checklistController.createTemplate)
router.get('/templates', adminOnly, validateQuery(templatesByDivisionQuerySchema), checklistController.getTemplatesByDivision)
router.get('/templates/:id', adminOnly, checklistController.getTemplateById)
router.put('/templates/:id', adminOnly, validateUpdateTemplate, checklistController.updateTemplate)
router.delete('/templates/:id',adminOnly, checklistController.deleteTemplate)

router.post('/items', adminOnly, validateCreateItem, checklistController.createItem)
router.get('/items/template/:templateId', adminOnly, checklistController.getItemsByTemplate)
router.get('/items/:id', adminOnly, checklistController.getItemById)
router.put('/items/:id', adminOnly, validateUpdateItem, checklistController.updateItem)
router.delete('/items/:id', adminOnly, checklistController.deleteItem)

router.get('/my-checklist', staffOnly, checklistController.getMyChecklist)

router.post(
  '/:attendanceId/items/:itemId/photo',
  staffOnly,
  uploadChecklist.single('photo'),
  checklistController.uploadPhoto
)

router.post('/:attendanceId/submit', staffOnly, checklistController.submitAll)

router.get('/photos/by-division', adminOnly, validateQuery(checklistPhotosByDivisionQuerySchema), checklistController.getPhotosByDivision)
router.get('/photos/by-user/:userId', adminOnly, validateQuery(checklistPhotosByUserQuerySchema), checklistController.getPhotosByUser)

export default router