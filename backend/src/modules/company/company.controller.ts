import {companyService} from "./company.service"
import {catchAsync} from "../../utils/error.response/catch-async"
import { sendSuccess } from "../../utils/error.response/response";

export class CompanyController {

    getAll = catchAsync(async (req, res) => {
    const params = { page: Number(req.query.page) || 1, limit: Number(req.query.limit) || 10 }
    const result = await companyService.getAll(params)
    return sendSuccess(res, result, 'Companies fetched')
  })


    getById = catchAsync(async (req, res) => {
    const result = await companyService.getById(Number(req.params.id))
    return sendSuccess(res, result, 'Company fetched')
    })


    create = catchAsync(async (req,res) => {
        const result = await companyService.create(req.body)
    return sendSuccess(res, result, 'Company created', 201)
    })

    update = catchAsync(async (req,res) => {
    const result = await companyService.update(Number(req.params.id), req.body)
    return sendSuccess(res, result, 'Company updated')
    })

    delete = catchAsync(async (req,res) => {
    const result = await companyService.delete(Number(req.params.id))
    return sendSuccess(res, result, 'Company deleted')
    })
}

export const companyController = new CompanyController()