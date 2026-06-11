
import { User, UserCompanyRole, PrismaClient } from "../../../generated/prisma"
import { BaseRepository } from "./base.repository"
import {
  IUserRepository,
  CreateUserDTO,
  UpdateUserDTO,
  CreateRoleDTO,
  UpdateRoleDTO,
} from "../interfaces/user.interface"
import { PaginatedResult, PaginationParams } from "../interfaces/base.interface"

export class UserRepository
extends BaseRepository<User, CreateUserDTO, UpdateUserDTO>
  implements IUserRepository
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
  // ─── UserCompanyRole methods ──────────────────────────────────────────────

  async findRoleByUserId(
    user_id: number,
    params?: PaginationParams
  ): Promise<PaginatedResult<UserCompanyRole>> {
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

  async findByCompanyRole(
    user_id: number,
    company_id: number
  ): Promise<UserCompanyRole | null> {
    return this.prisma.userCompanyRole.findFirst({
      where: { user_id, company_id, is_deleted: false },
    })
  }

  async findUsersByCompany(
    company_id: number,
    params?: PaginationParams
  ): Promise<PaginatedResult<UserCompanyRole>> {
    const { skip, take, page, limit } = this.resolvePagination(params)
    const where = { company_id, is_deleted: false }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.userCompanyRole.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              photo_url: true,
              is_active: true,
            },
          },
          division: { select: { id: true, name: true } },
          userRole: true,
        },
      }),
       this.prisma.userCompanyRole.count({ where }),
    ])

    return this.buildPaginatedResult(data, total, page, limit)
  }

  async createCompanyRole(data: CreateRoleDTO): Promise<UserCompanyRole> {
    return  this.prisma.userCompanyRole.create({
      data: {
        user_id: data.user_id,
        company_id: data.company_id,
        role_id: data.role_id,
        division_id: data.division_id,
      },
    })
  }

  async updateCompanyRole(id: number, data: UpdateRoleDTO): Promise<UserCompanyRole> {
    return  this.prisma.userCompanyRole.update({
      where: { id },
      data: {
        company_id: data.company_id,
        division_id: data.division_id,
        role_id: data.role_id,
      },
    })
  }
}