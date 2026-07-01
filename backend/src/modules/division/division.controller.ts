import {divisionService} from "./division.service"
import {catchAsync} from "../../utils/error.response/catch-async"
import { sendError, sendSuccess } from "../../utils/error.response/response";

export class DivisionController {


    getAll = catchAsync(async (req, res) => {
      const params = { page: Number(req.query.page) || 1, limit: Number(req.query.limit) || 10 }
      const result = await divisionService.getAll(params)
      return sendSuccess(res, result, 'Divisions fetched')  
    })


    getByCompany = catchAsync(async (req, res) => {
      const companyId = Number(req.params.companyId)
      if (isNaN(companyId)) return sendError(res, 'Invalid company id', 400)
      const params = { page: Number(req.query.page) || 1, limit: Number(req.query.limit) || 10 }
      const result = await divisionService.getByCompany(companyId, params)
      return sendSuccess(res, result, 'Divisions fetched by company')  
    })

    getById = catchAsync(async (req, res) => {
        const id = Number(req.params.id)
        if (isNaN(id)) return sendError(res, 'Invalid id', 400)
        const result = await divisionService.getById(id)
        return sendSuccess(res, result, 'Division fetched')
    })
    
    create = catchAsync(async (req,res) =>{
      const result = await divisionService.create(req.body)
      return sendSuccess(res, result, 'Division created')
    })

    update = catchAsync (async (req,res) => {
      const id = Number(req.params.id)
      if (isNaN(id)) return sendError(res, 'Invalid id', 400)
      const result = await divisionService.update(id, req.body)
      return sendSuccess(res, result, 'Division updated')
    })

    delete = catchAsync(async (req,res) => {
      const id = Number(req.params.id)
      if (isNaN(id)) return sendError(res, 'Invalid id', 400)
      const result = await divisionService.delete(id)
      return sendSuccess(res, result, 'Division deleted')
    })
}

export const divisionController = new DivisionController()  
