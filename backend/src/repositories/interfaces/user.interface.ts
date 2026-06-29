import { Prisma, User, UserCompanyRole } from "../../../generated/prisma"
import { BaseRepository, PaginatedResult, PaginationParams } from "./base.interface";

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


export interface CreateUserCompanyRoleDTO {
  user_id: string
  company_id?: number | null
  role_id: number
  division_id?: number | null
}

export interface UpdateUserCompanyRoleDTO {
  company_id?: number | null
  division_id?: number | null
  role_id?: number
}


export type UserCompanyRoleWithRole = Prisma.UserCompanyRoleGetPayload<{
  include: {
    userRole: true
    company:  true
    division: true
  }
}>



export interface UserRepository extends BaseRepository<User, CreateUserDTO, UpdateUserDTO, string> {
  findByEmail(email: string): Promise<User | null>
  findRoleByUserId(user_id: string, params?: PaginationParams): Promise<PaginatedResult<UserCompanyRoleWithRole>>
  createCompanyRole(data: CreateUserCompanyRoleDTO): Promise<UserCompanyRole>
  updateCompanyRole(id: number, data: UpdateUserCompanyRoleDTO): Promise<UserCompanyRole>
  findUsersByCompany(company_id: number, params?: PaginationParams): Promise<PaginatedResult<UserCompanyRole>>
}