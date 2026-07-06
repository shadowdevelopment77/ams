import {AppError} from "../../utils/error.response/appError"
import {PaginationParams} from "../../repositories/interfaces/base.interface"
import {userRepository, companyRepository, divisionRepository} from "../../repositories/index.repositories"
import {MoveCompanyInput} from "./user.validation"


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
    await this.getUserOrThrow(userId)
    await this.getCompanyOrThrow(data.company_id)

    if (data.division_id) {
      await this.validateDivisionBelongsToCompany(data.division_id, data.company_id)
    }

    const companyRole = await this.getUserRoleOrThrow(userId)

    return userRepository.updateCompanyRole(companyRole.id, {
      company_id:  data.company_id,
      division_id: data.division_id,
    })
  }

async delete(id: string) {
    await this.getUserOrThrow(id)
    return userRepository.softDelete(id)
  }

  async getAll(params: PaginationParams) {
    return userRepository.findAllSafe(params)
  }

  async getUserById(id: string) {
    return await this.getUserOrThrow(id)
  }

}
export const userService = new UserService()
