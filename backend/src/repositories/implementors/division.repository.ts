import { Division, PrismaClient } from "../../../generated/prisma";
import { PaginatedResult, PaginationParams } from "../interfaces/base.interface";
import { CreateDivisionDTO, DivisionRepository, UpdateDivisionDTO } from "../interfaces/division.interface";
import { PrismaBaseRepository } from "./base.repository";

export class PrismaDivisionRepository
  extends PrismaBaseRepository<Division, CreateDivisionDTO, UpdateDivisionDTO, number>
  implements DivisionRepository
{
  protected modelName = "division" as const;

  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async findByCompany(companyId: number, params?: PaginationParams): Promise<PaginatedResult<Division>> {
    const { skip, take, page, limit } = this.resolvePagination(params);
    const where = { company_id: companyId, is_deleted: false };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.division.findMany({ where, skip, take, orderBy: { name: "asc" } }),
      this.prisma.division.count({ where }),
    ]);

    return this.buildPaginatedResult(data, total, page, limit);
  }

}