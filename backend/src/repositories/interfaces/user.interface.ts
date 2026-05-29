import { User, UserCompanyRole } from "../../../generated/prisma"
import { IBaseRepository, PaginatedResult, PaginationParams } from "./base.interface";

export interface CreateUserDTO {
  name: string
  email: string
  password: string
  phone?: string
  photo_url?: string
}


export interface UpdateUserDTO {
  name?: string
  email?: string
  password?: string
  phone?: string
  photo_url?: string
}


export interface CreateRoleDTO {
  user_id: number
  company_id?: number | null
  role_id: number
  division_id?: number | null
}

export interface UpdateRoleDTO {
  company_id?: number | null
  division_id?: number | null
  role_id?: number
}



export interface IUserRepository extends IBaseRepository<User, CreateUserDTO, UpdateUserDTO> {
  findByEmail(email: string): Promise<User | null>
  findRoleByUserId(user_id: number,  params?: PaginationParams): Promise<PaginatedResult<UserCompanyRole | null>>
  findByCompanyRole(user_id: number, company_id: number): Promise<UserCompanyRole | null>
  createCompanyRole(data: CreateRoleDTO): Promise<UserCompanyRole>
  updateCompanyRole(id: number, data: UpdateRoleDTO): Promise<UserCompanyRole>
  softDeleteCompanyRole(id: number): Promise<UserCompanyRole>
  softDeleteAllCompanyRoles(user_id: number): Promise<{count: number}>
  findUsersByCompany(company_id: number, params?: PaginationParams): Promise<PaginatedResult<UserCompanyRole>>
}