import { Division, PrismaClient } from "../../../generated/prisma";
import { PaginatedResult, PaginationParams } from "../interfaces/base.interface";
import { CreateDivisionDTO, DivisionRepository, UpdateDivisionDTO } from "../interfaces/division.interface";
import { PrismaBaseRepository } from "./base.repository";

export class PrismaDivisionRepository
  extends PrismaBaseRepository<Division, CreateDivisionDTO, UpdateDivisionDTO>
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

  async findByCompanyAndName(companyId: number, name: string): Promise<Division | null> {
    return this.prisma.division.findFirst({
      where: { company_id: companyId, name, is_deleted: false },
    });
  }

  async findActiveByCompany(companyId: number): Promise<Division[]> {
    return this.prisma.division.findMany({
      where: { company_id: companyId, is_active: true, is_deleted: false },
      orderBy: { name: "asc" },
    });
  }

  async softDeleteDivision(id: number): Promise<Division>{
    return this.prisma.division.update({
        where: { id, is_deleted: false },
        data : { is_deleted: true, deleted_at: new Date(), is_active: false
        }
    })
  }
}