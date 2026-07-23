import { Router } from 'express'
import { checklistController } from './checklist.controller'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { roleMiddleware } from '../../middlewares/role.middleware'
import { uploadChecklist } from '../../lib/multer'
import {
  validateCreateTemplate, validateUpdateTemplate,
  validateCreateItem, validateUpdateItem,
  templatesByDivisionQuerySchema, evidenceQuerySchema,
} from './checklist.validation'
import { validateQuery } from '../../middlewares/validate-query.middleware'


const router = Router()

const adminOnly = [authMiddleware, roleMiddleware('ADMIN')]
const staffOnly = [authMiddleware, roleMiddleware('STAFF')]


//ADMIN
router.post('/templates', adminOnly, validateCreateTemplate, checklistController.createTemplate)
router.get('/templates', adminOnly, validateQuery(templatesByDivisionQuerySchema), checklistController.getTemplatesByDivision)
router.get('/templates/:id', adminOnly, checklistController.getTemplateById)
router.put('/templates/:id', adminOnly, validateUpdateTemplate, checklistController.updateTemplate)
router.delete('/templates/:id',adminOnly, checklistController.deleteTemplate)

//ADMIN
router.post('/items', adminOnly, validateCreateItem, checklistController.createItem)
router.get('/items/template/:templateId', adminOnly, checklistController.getItemsByTemplate)
router.get('/items/:id', adminOnly, checklistController.getItemById)
router.put('/items/:id', adminOnly, validateUpdateItem, checklistController.updateItem)
router.delete('/items/:id', adminOnly, checklistController.deleteItem)

//STAFF
router.get('/my-checklist', staffOnly, checklistController.getMyChecklist)

router.post(
  '/:attendanceId/items/:itemId/photo',
  staffOnly,
  uploadChecklist.single('photo'),
  checklistController.uploadPhoto
)

router.post('/:attendanceId/submit', staffOnly, checklistController.submitAll)

//ADMIN
router.get('/evidence/item/:itemId', adminOnly, validateQuery(evidenceQuerySchema), checklistController.getByItemAndDate)

export default router