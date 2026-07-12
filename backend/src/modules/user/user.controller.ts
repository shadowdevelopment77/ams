import {userService} from "./user.service"
import {catchAsync} from "../../utils/error.response/catch-async"
import { sendError, sendSuccess } from "../../utils/error.response/response";

export class UserController {

  moveCompany = catchAsync(async (req, res) => {
    const result = await userService.moveToCompany(req.params.id as string, req.body)
    return sendSuccess(res, result, 'User company and division updated')
  })
  getAllUsers = catchAsync(async (req, res) => {
    const params = { page: Number(req.query.page) || 1, limit: Number(req.query.limit) || 10 }
    const result = await userService.getAll(params)
    return sendSuccess(res, result, 'Users fetched')
  })

  getUserById = catchAsync(async (req, res) => {
    const result = await userService.getUserById(String(req.params.id))
    return sendSuccess(res, result, 'User fetched')
  })

  findUsersByCompanyAndDivision = catchAsync(async (req, res) => {
    const companyId = Number(req.params.companyId)
    const divisionId = Number(req.params.divisionId)
    if (isNaN(companyId) || isNaN(divisionId)) return sendError(res, 'Invalid company or division id', 400)
    const params = { page: Number(req.query.page) || 1, limit: Number(req.query.limit) || 10 }
    const result = await userService.findUsersByCompanyAndDivision(companyId, divisionId, params)
    return sendSuccess(res, result, 'Users fetched by company and division')
  })

  delete = catchAsync(async (req, res) => {
    const result = await userService.delete(String(req.params.id))
    return sendSuccess(res, result, 'User deleted')
  })
}

export const userController = new UserController()