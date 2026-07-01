import { Router } from 'express'
import {companyController} from './company.controller'
import {authMiddleware} from '../../middlewares/auth.middleware'
import {roleMiddleware} from '../../middlewares/role.middleware'
import {validateCreateCompany, validateUpdateCompany} from './company.validation'




const router = Router()


router.use(authMiddleware, roleMiddleware('ADMIN'))


router.get ('/', companyController.getAll.bind(companyController))
router.get ('/:id',  companyController.getById.bind(companyController))
router.post('/',  validateCreateCompany, companyController.create.bind(companyController))
router.put ('/:id',  validateUpdateCompany, companyController.update.bind(companyController))
router.delete('/:id',  companyController.delete.bind(companyController))

export default router