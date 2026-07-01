import {companyRepository, divisionRepository} from "../../repositories/index.repositories"
import { CreateDivisionInput, UpdateDivisionInput } from "./division.validation"
import { AppError } from "../../utils/error.response/appError"
import { PaginationParams } from "../../repositories/interfaces/base.interface"

export class DivisionService {
  
   async getAll(params: PaginationParams) {
    return divisionRepository.findAll(params)
  }

  async getById(id: number) {
    const division = await divisionRepository.findById(id)
    if (!division) throw new AppError('Division not found', 404)
    return division
  }


  async getByCompany(companyId: number, params: PaginationParams) {
    const company = await companyRepository.findById(companyId)
    if (!company) throw new AppError('Company not found', 404)
    return divisionRepository.findByCompany(companyId, params)
  }

  async create(data: CreateDivisionInput) {
    const existing = await companyRepository.findById(data.company_id)
    if (existing) throw new AppError('Division already exists on that Company', 409)
    return divisionRepository.create(data)
  }

  async update(id: number, data: UpdateDivisionInput) {
    const division = await divisionRepository.findById(id)
    if (!division) throw new AppError('Division not found', 404)

    if (data.name && data.name !== division.name) {
      const existing = await divisionRepository.findByName(division.company_id, data.name)
      if (existing) throw new AppError('Division name already exists', 409)
    }
 
    return divisionRepository.update(id, data)
  }

  async delete(id: number) {
    const division = await divisionRepository.findById(id)
    if (!division) throw new AppError('Division not found', 404)
    return divisionRepository.softDelete(id)
  }


}

export const divisionService = new DivisionService()