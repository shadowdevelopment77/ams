
import { PrismaClient } from "../../../generated/prisma"
import { BaseRepository, PaginatedResult, PaginationParams } from "../interfaces/base.interface"

export abstract class PrismaBaseRepository<T, CreateDTO, UpdateDTO, IDType>
  implements BaseRepository<T, CreateDTO, UpdateDTO, IDType>
{
  // Each child class declares which prisma model it uses, e.g. `modelName = "user" as const`
  protected prisma: PrismaClient;
  protected abstract modelName: keyof PrismaClient

  constructor(prisma: PrismaClient){
    this.prisma = prisma
  }

  // this.delegate.findFirst() === prisma[modelName].findFirst()
  protected get delegate(): any {
    return (this.prisma as any)[this.modelName]
  }

  // ─── Pagination helpers ───────────────────────────────────────────────────

  protected resolvePagination(params?: PaginationParams) {
    const page  = Math.max(1, params?.page  ?? 1)
    const limit = Math.min(100, Math.max(1, params?.limit ?? 10))
    const skip  = (page - 1) * limit
    return { skip, take: limit, page, limit }
  }

  protected buildPaginatedResult<R>(
    data: R[],
    total: number,
    page: number,
    limit: number
  ): PaginatedResult<R> {
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  // ─── Shared CRUD (used by all repositories unless overridden) ────────────

  async findById(id: IDType): Promise<T | null> {
    return this.delegate.findFirst({
      where: { id, is_deleted: false },
    })
  }

  async findAll(params?: PaginationParams): Promise<PaginatedResult<T>> {
    const { skip, take, page, limit } = this.resolvePagination(params)
    const where = { is_deleted: false }

    const [data, total] = await this.prisma.$transaction([
      this.delegate.findMany({ where, skip, take, orderBy: { created_at: "desc" } }),
      this.delegate.count({ where }),
    ])

    return this.buildPaginatedResult(data, total, page, limit)
  }

  async create(data: CreateDTO): Promise<T> {
    return this.delegate.create({ data })
  }

  async update(id: IDType, data: UpdateDTO): Promise<T> {
    return this.delegate.update({ where: { id }, data })
  }

  async softDelete(id: IDType): Promise<T> {
    return this.delegate.update({
      where: { id },
      data: { is_deleted: true, deleted_at: new Date(), is_active: false },
    })
  }

}