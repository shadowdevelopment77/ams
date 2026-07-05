import {companyRepository, divisionRepository} from "../../repositories/index.repositories"
import { CreateDivisionInput, UpdateDivisionInput } from "./division.validation"
import { AppError } from "../../utils/error.response/appError"
import { PaginationParams } from "../../repositories/interfaces/base.interface"

export class DivisionService {
  
  private async getDivisionOrThrow(id: number) {
    const division = await divisionRepository.findById(id)
    if (!division) throw new AppError('Division not found', 404)
    return division
  }

  private async getCompanyOrThrow(companyId: number) {
    const company = await companyRepository.findById(companyId)
    if (!company) throw new AppError('Company not found', 404)
    return company
  }

  private async checkDuplicateName(companyId: number, name: string) {
    const existing = await divisionRepository.findByName(companyId, name)
    if (existing) throw new AppError('Division name already exists in this company', 409)
  }


   async getAll(params: PaginationParams) {
    return divisionRepository.findAll(params)
  }

  async getById(id: number) {
    return this.getDivisionOrThrow(id)
  }


  async getByCompany(companyId: number, params: PaginationParams) {
    await this.getCompanyOrThrow(companyId)
    return divisionRepository.findByCompany(companyId, params)
  }

  async create(data: CreateDivisionInput) {
    await this.getCompanyOrThrow(data.company_id)
    await this.checkDuplicateName(data.company_id, data.name)
    return divisionRepository.create(data)
  }

  async update(id: number, data: UpdateDivisionInput) {
    const division = await this.getDivisionOrThrow(id)

    if (data.name && data.name !== division.name) {
      await this.checkDuplicateName(division.company_id, data.name)
    }
 
    return divisionRepository.update(id, data)
  }

  async delete(id: number) {
    await this.getDivisionOrThrow(id)
    return divisionRepository.softDelete(id)
  }


}

export const divisionService = new DivisionService()