import {companyService} from "./company.service"
import {catchAsync} from "../../utils/error.response/catch-async"
import { sendError, sendSuccess } from "../../utils/error.response/response";

export class CompanyController {

    getAll = catchAsync(async (req, res) => {
    const params = { page: Number(req.query.page) || 1, limit: Number(req.query.limit) || 10 }
    const result = await companyService.getAll(params)
    return sendSuccess(res, result, 'Companies fetched')
  })


    getById = catchAsync(async (req, res) => {
        const id = Number(req.params.id)
    if (isNaN(id)) return sendError(res, 'Invalid id', 400)
    const result = await companyService.getById(id)
    return sendSuccess(res, result, 'Company fetched')
    })


    create = catchAsync(async (req,res) => {
        const result = await companyService.create(req.body)
    return sendSuccess(res, result, 'Company created', 201)
    })

    update = catchAsync(async (req,res) => {
        const id = Number(req.params.id)
    if (isNaN(id)) return sendError(res, 'Invalid id', 400)
    const result = await companyService.update(id, req.body)
    return sendSuccess(res, result, 'Company updated')
    })

    delete = catchAsync(async (req,res) => {
        const id = Number(req.params.id)
        if (isNaN(id)) return sendError(res, 'Invalid id', 400)
    const result = await companyService.delete(id)
    return sendSuccess(res, result, 'Company deleted')
    })
}

export const companyController = new CompanyController()