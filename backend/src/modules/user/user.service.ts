import {AppError} from "../../utils/error.response/appError"
import {PaginationParams} from "../../repositories/interfaces/base.interface"
import {userRepository, companyRepository, divisionRepository} from "../../repositories/index.repositories"
import {MoveCompanyInput} from "./user.validation"


export class UserService {


  async findUsersByCompanyAndDivision(companyId: number, divisionId: number, params?: PaginationParams) {
    const companyAndDivision = await userRepository.findUsersByCompanyAndDivision(companyId, divisionId, params)
    if (!companyAndDivision) throw new AppError('No users found for the specified company and division', 404)
    return companyAndDivision
  }

  async moveUserToCompanyAndDivision(userId: string, data: MoveCompanyInput) {
    const user = await userRepository.findById(userId)
    if (!user) throw new AppError('User not found', 404)
      const company = await companyRepository.findById(data.company_id)
      if (!company) throw new AppError('Company not found', 404)

        if (data.division_id) {
          const division = await divisionRepository.findById(data.division_id)
    if (!division) throw new AppError('Division not found', 404)
    if (division.company_id !== data.company_id) {
      throw new AppError('Division does not belong to the target company', 400)
        }  
      }

      const roleResult = await userRepository.findRoleByUserId(userId)
      const companyRole = roleResult.data[0]
      if (!companyRole) throw new AppError('User has no role assigned', 403)
        
      const updatedRole = await userRepository.updateCompanyRole(companyRole.id, {
        company_id: data.company_id,
        division_id: data.division_id ?? null,
      })

      return updatedRole
}

async delete(id: string) {
    const user = await userRepository.findById(id)
    if (!user) throw new AppError('User not found', 404)
    return userRepository.softDelete(id)
  }

  async getAllUsers(params: PaginationParams) {
    return userRepository.findAll(params)
  }

  async getUserById(id: string) {
    const user = await userRepository.findById(id)
    if (!user) throw new AppError('User not found', 404)
    return user
  }

}
export const userService = new UserService()
