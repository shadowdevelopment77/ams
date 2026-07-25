
import { User, UserCompanyRole, PrismaClient } from "../../../generated/prisma"
import { PrismaBaseRepository } from "./base.repository"
import {
  UserRepository,
  CreateUserDTO,
  UpdateUserDTO,
  CreateUserCompanyRoleDTO,
  UpdateUserCompanyRoleDTO,
  UserCompanyRoleWithRole,
  UserListParams
} from "../interfaces/user.interface"
import { PaginatedResult, PaginationParams } from "../interfaces/base.interface"

export class PrismaUserRepository
extends PrismaBaseRepository<User, CreateUserDTO, UpdateUserDTO, string>
  implements UserRepository
{
  // tells BaseRepository to use prisma.user for all generic CRUD
  protected modelName = "user" as const
  constructor(prisma: PrismaClient){
    super(prisma)
  }

  // ─── User-specific methods ────────────────────────────────────────────────

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email, is_deleted: false },
    })
  }

  async findAllSafe(params?: UserListParams): Promise<PaginatedResult<Omit<User, 'password'>>> {
     const { skip, take, page, limit } = this.resolvePagination(params)
  const where: any = { is_deleted: false }
  if (params?.search) {
    where.name = { contains: params.search, mode: 'insensitive' }
  }
  if (params?.roleId) {
    where.company_roles = { some: { role_id: params.roleId, is_deleted: false } }
  }

  const [data, total] = await this.prisma.$transaction([
    this.prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: { created_at: 'desc' },
      select: {
        id:         true,
        name:       true,
        email:      true,
        phone:      true,
        is_active:  true,
        is_deleted:  true,   
        created_at:  true,   
        deleted_at:  true,   
        updated_at:  true,   
      }
    }),
    this.prisma.user.count({ where })
  ])

  return this.buildPaginatedResult(data, total, page, limit)
  }
  // ─── UserCompanyRole methods ──────────────────────────────────────────────

  async findRoleByUserId(
    user_id: string,
    params?: PaginationParams
  ): Promise<PaginatedResult<UserCompanyRoleWithRole>> {
    const { skip, take, page, limit } = this.resolvePagination(params)
    const where = { user_id, is_deleted: false }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.userCompanyRole.findMany({
        where,
        skip,
        take,
        include: { company: true, division: true, userRole: true },
        orderBy: { created_at: "desc" },
      }),
      this.prisma.userCompanyRole.count({ where }),
    ])

    return this.buildPaginatedResult(data, total, page, limit)
  }

  
  
  async findUsersByCompanyAndDivision(
    companyId: number,
    divisionId: number,
    params?: PaginationParams
  ): Promise<PaginatedResult<UserCompanyRole>> {
    const { skip, take, page, limit } = this.resolvePagination(params)
    const where = { company_id: companyId, division_id: divisionId, is_deleted: false }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.userCompanyRole.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: "asc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              is_active: true,
            },
          },
          userRole: true,
        },
      }),
       this.prisma.userCompanyRole.count({ where }),
    ])

    return this.buildPaginatedResult(data, total, page, limit)
  }
  

  async createCompanyRole(data: CreateUserCompanyRoleDTO): Promise<UserCompanyRole> {
    return  this.prisma.userCompanyRole.create({
      data: {
        user_id: data.user_id,
        company_id: data.company_id,
        role_id: data.role_id,
        division_id: data.division_id,
      },
    })
  }

  async updateCompanyRole(id: number, data: UpdateUserCompanyRoleDTO): Promise<UserCompanyRole> {
    return  this.prisma.userCompanyRole.update({
      where: { id },
      data: {
        company_id: data.company_id,
        division_id: data.division_id,
      },
    })
  }

  async countActiveByCompany(companyId:number): Promise<number>{
    return this.prisma.userCompanyRole.count({
      where: {
        company_id: companyId, is_deleted: false
      },
    })
  }

  async countActiveByDivision(divisionId:number): Promise<number>{
    return this.prisma.userCompanyRole.count({
      where: {
        division_id: divisionId, is_deleted: false
      },
    })
  }
}