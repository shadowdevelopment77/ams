import { Prisma, User, UserCompanyRole } from "../../../generated/prisma"
import { BaseRepository, PaginatedResult, PaginationParams } from "./base.interface";

export interface CreateUserDTO {
  name: string
  email: string
  password: string
  phone?: string
}


export interface UpdateUserDTO {
  name?: string
  email?: string
  password?: string
  phone?: string
}


export interface CreateUserCompanyRoleDTO {
  user_id: string
  company_id?: number | null
  role_id: number
  division_id?: number | null
}

export interface UpdateUserCompanyRoleDTO {
  company_id?: number | null
  division_id?: number | null
}


export type UserCompanyRoleWithRole = Prisma.UserCompanyRoleGetPayload<{
  include: {
    userRole: true
    company:  true
    division: true
  }
}>



export interface UserListParams extends PaginationParams {
  search?: string
  roleId?: number
}

export interface UserRepository extends BaseRepository<User, CreateUserDTO, UpdateUserDTO, string> {
  findByEmail(email: string): Promise<User | null>
  findRoleByUserId(userId: string, params?: PaginationParams): Promise<PaginatedResult<UserCompanyRoleWithRole>>
  createCompanyRole(data: CreateUserCompanyRoleDTO): Promise<UserCompanyRole>
  updateCompanyRole(id: number, data: UpdateUserCompanyRoleDTO): Promise<UserCompanyRole>
  findUsersByCompanyAndDivision(companyId: number, divisionId: number, params?: PaginationParams): Promise<PaginatedResult<UserCompanyRole>>
  findAllSafe(params?: UserListParams): Promise<PaginatedResult<Omit<User, 'password'>>>

  countActiveByCompany(companyId: number): Promise<number>
  countActiveByDivision(divisionId:number): Promise<number>
}