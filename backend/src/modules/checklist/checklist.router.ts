import { Router } from 'express'
import { checklistController } from './checklist.controller'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { roleMiddleware } from '../../middlewares/role.middleware'
import { uploadChecklist } from '../../lib/multer'
import {
  validateCreateTemplate, validateUpdateTemplate,
  validateCreateItem, validateUpdateItem,
} from './checklist.validation'


const router = Router()

const adminOnly = [authMiddleware, roleMiddleware('ADMIN')]
const staffOnly = [authMiddleware, roleMiddleware('STAFF')]


//ADMIN
router.post('/templates', adminOnly, validateCreateTemplate, checklistController.createTemplate)
router.get('/templates', adminOnly, checklistController.getTemplatesByDivision)
router.put('/templates/:id', adminOnly, validateUpdateTemplate, checklistController.updateTemplate)
router.delete('/templates/:id',adminOnly, checklistController.deleteTemplate)

//ADMIN
router.post('/items', adminOnly, validateCreateItem, checklistController.createItem)
router.get('/items/template/:templateId', adminOnly, checklistController.getItemsByTemplate)
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
router.get('/evidence/item/:itemId', adminOnly, checklistController.getByItemAndDate)

export default router