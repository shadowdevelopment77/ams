import { companyRepository, userRepository } from '../../repositories/index.repositories'
import {CreateCompanyInput, UpdateCompanyInput} from './company.validation'
import { AppError } from '../../utils/error.response/appError'
import { PaginationParams } from '../../repositories/interfaces/base.interface'

export class CompanyService {

  private async getCompanyOrThrow(id: number) {
    const company = await companyRepository.findById(id)
    if (!company) throw new AppError('Company not found', 404)
    return company
  }

  private async validateCompanyName(name: string) {
    const existing = await companyRepository.findByName(name)
    if (existing) throw new AppError('Company name already exists', 409)
  }

  async getAll(params: PaginationParams) {
    return companyRepository.findAll(params)
  }

  async getById(id: number) {
    return this.getCompanyOrThrow(id)
  }

  async create(data: CreateCompanyInput) {
    await this.validateCompanyName(data.name)
    return companyRepository.create(data)
  }

  async update(id: number, data: UpdateCompanyInput) {
    const company = await this.getCompanyOrThrow(id)

    if (data.name && data.name !== company.name) {
      await this.validateCompanyName(data.name)
    }

    return companyRepository.update(id, data)
  }

  async delete(id: number) {
    await this.getCompanyOrThrow(id)

    const activeStaffCount  = await userRepository.countActiveByCompany(id)
    if (activeStaffCount > 0 )
      throw new AppError(`Cannot delete: ${activeStaffCount} staff member(s) are still assigned to this company. Move them first.`,
        409
)
    
    return companyRepository.softDelete(id)
  }
}

export const companyService = new CompanyService()