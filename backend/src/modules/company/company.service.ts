import { companyRepository } from '../../repositories/index.repositories'
import {CreateCompanyInput, UpdateCompanyInput} from './company.validation'
import { AppError } from '../../utils/error.response/appError'
import { PaginationParams } from '../../repositories/interfaces/base.interface'

export class CompanyService {

  async getAll(params: PaginationParams) {
    return companyRepository.findAll(params)
  }

  async getById(id: number) {
    const company = await companyRepository.findById(id)
    if (!company) throw new AppError('Company not found', 404)
    return company
  }

  async create(data: CreateCompanyInput) {
    const existing = await companyRepository.findByName(data.name)
    if (existing) throw new AppError('Company already exists', 409)
    return companyRepository.create(data)
  }

  async update(id: number, data: UpdateCompanyInput) {
    const company = await companyRepository.findById(id)
    if (!company) throw new AppError('Company not found', 404)

    if (data.name && data.name !== company.name) {
      const existing = await companyRepository.findByName(data.name)
      if (existing) throw new AppError('Company name already exists', 409)
    }

    return companyRepository.update(id, data)
  }

  async delete(id: number) {
    const company = await companyRepository.findById(id)
    if (!company) throw new AppError('Company not found', 404)
    return companyRepository.softDelete(id)
  }
}

export const companyService = new CompanyService()