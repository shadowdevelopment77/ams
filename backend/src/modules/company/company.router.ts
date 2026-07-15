import { Router } from 'express'
import {companyController} from './company.controller'
import {authMiddleware} from '../../middlewares/auth.middleware'
import {roleMiddleware} from '../../middlewares/role.middleware'
import {validateCreateCompany, validateUpdateCompany} from './company.validation'




const router = Router()


router.use(authMiddleware, roleMiddleware('ADMIN'))


router.get ('/', companyController.getAll)
router.get ('/:id',  companyController.getById)
router.post('/',  validateCreateCompany, companyController.create)
router.put ('/:id',  validateUpdateCompany, companyController.update)
router.delete('/:id',  companyController.delete)

export default router