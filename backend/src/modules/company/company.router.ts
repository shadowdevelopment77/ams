import { Router } from 'express'
import {companyController} from './company.controller'
import {authMiddleware} from '../../middlewares/auth.middleware'
import {roleMiddleware} from '../../middlewares/role.middleware'
import {validateCreateCompany, validateUpdateCompany} from './company.validation'




const router = Router()

const adminOnly = [authMiddleware, roleMiddleware('ADMIN')]
// SUPERVISOR needs this to pick a company_id when logging a visit; mutations stay ADMIN-only.
const readAccess = [authMiddleware, roleMiddleware('ADMIN', 'SUPERVISOR')]

router.get   ('/',    readAccess, companyController.getAll)
router.get   ('/:id', readAccess, companyController.getById)
router.post  ('/',    adminOnly, validateCreateCompany, companyController.create)
router.put   ('/:id', adminOnly, validateUpdateCompany, companyController.update)
router.delete('/:id', adminOnly, companyController.delete)

export default router