import {AppError} from "../../utils/error.response/appError"
import {PaginationParams} from "../../repositories/interfaces/base.interface"
import {userRepository, companyRepository, divisionRepository, sessionRepository, roleRepository} from "../../repositories/index.repositories"
import {MoveCompanyInput, UpdateUserInput} from "./user.validation"

export interface UserListQuery extends PaginationParams {
  search?: string
  role?: string
}


export class UserService {

  private async getUserOrThrow(id: string) {
    const user = await userRepository.findById(id)
    if (!user) throw new AppError('User not found', 404)
      const { password, ...safeUser } = user
    return safeUser
  }

  private async getCompanyOrThrow(companyId: number) {
    const company = await companyRepository.findById(companyId)
    if (!company) throw new AppError('Company not found', 404)
    return company
  }

  private async getDivisionOrThrow(divisionId: number) {
    const division = await divisionRepository.findById(divisionId)
    if (!division) throw new AppError('Division not found', 404)
    return division
  }

   private async validateDivisionBelongsToCompany(divisionId: number, companyId: number) {
    const division = await this.getDivisionOrThrow(divisionId)
    if (division.company_id !== companyId) {
      throw new AppError('Division does not belong to this company', 400)
    }
    return division
  }


  private async getUserRoleOrThrow(userId: string) {
    const roleResult  = await userRepository.findRoleByUserId(userId)
    const companyRole = roleResult.data[0]
    if (!companyRole) throw new AppError('User has no role assigned', 403)
    return companyRole
  }


  async findUsersByCompanyAndDivision(companyId: number, divisionId: number, params?: PaginationParams) {
    await this.getCompanyOrThrow(companyId)
    await this.getDivisionOrThrow(divisionId)
    return userRepository.findUsersByCompanyAndDivision(companyId, divisionId, params)
  }

async moveToCompany(userId: string, data: MoveCompanyInput) {
    const user = await this.getUserOrThrow(userId)
    if (!user.is_active) throw new AppError('Cannot move an inactive user', 400)
    await this.getCompanyOrThrow(data.company_id)
    await this.validateDivisionBelongsToCompany(data.division_id, data.company_id)
    

    const companyRole = await this.getUserRoleOrThrow(userId)
     if (companyRole.userRole.name !== 'STAFF') {
    throw new AppError('Only STAFF can be assigned to a company and division', 400)
  }

    return userRepository.updateCompanyRole(companyRole.id, {
      company_id:  data.company_id,
      division_id: data.division_id,
    })
  }

async delete(id: string) {
    await this.getUserOrThrow(id)

    await sessionRepository.deleteByUser(id)
    return userRepository.softDelete(id)
  }

  async getAll(params: UserListQuery) {
    const { role, ...rest } = params
    if (!role) return userRepository.findAllSafe(rest)

    const resolvedRole = await roleRepository.findByName(role)
    if (!resolvedRole) return { data: [], total: 0, page: rest.page ?? 1, limit: rest.limit ?? 10, totalPages: 0 }

    return userRepository.findAllSafe({ ...rest, roleId: resolvedRole.id })
  }

  async getUserById(id: string) {
    return await this.getUserOrThrow(id)
  }

  async update(id: string, data: UpdateUserInput) {
    const user = await this.getUserOrThrow(id)

    if (data.email && data.email !== user.email) {
      const existing = await userRepository.findByEmail(data.email)
      if (existing) throw new AppError('Email already registered', 409)
    }

    const updated = await userRepository.update(id, data)
    const { password, ...safeUser } = updated
    return safeUser
  }

}
export const userService = new UserService()
