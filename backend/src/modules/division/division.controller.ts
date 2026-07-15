import {divisionService} from "./division.service"
import {catchAsync} from "../../utils/error.response/catch-async"
import {  sendSuccess } from "../../utils/error.response/response";

export class DivisionController {


    getAll = catchAsync(async (req, res) => {
      const params = { page: Number(req.query.page) || 1, limit: Number(req.query.limit) || 10 }
      const result = await divisionService.getAll(params)
      return sendSuccess(res, result, 'Divisions fetched')  
    })
    
    getByCompany = catchAsync(async (req, res) => {
      const params = { page: Number(req.query.page) || 1, limit: Number(req.query.limit) || 10 }
      const result = await divisionService.getByCompany(Number(req.params.companyId), params)
      return sendSuccess(res, result, 'Divisions fetched by company')  
    })

    getById = catchAsync(async (req, res) => {
        const result = await divisionService.getById(Number(req.params.id))
        return sendSuccess(res, result, 'Division fetched')
    })
    
    create = catchAsync(async (req,res) =>{
      const result = await divisionService.create(req.body)
      return sendSuccess(res, result, 'Division created', 201)
    })

    update = catchAsync (async (req,res) => {
      const result = await divisionService.update(Number(req.params.id), req.body)
      return sendSuccess(res, result, 'Division updated')
    })

    delete = catchAsync(async (req,res) => {
      const result = await divisionService.delete(Number(req.params.id))
      return sendSuccess(res, result, 'Division deleted')
    })
}

export const divisionController = new DivisionController()  
