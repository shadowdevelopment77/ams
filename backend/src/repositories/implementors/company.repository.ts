import { Company, PrismaClient } from "../../../generated/prisma";
import { PaginatedResult, PaginationParams } from "../interfaces/base.interface";
import { CreateCompanyDTO, CompanyRepository, UpdateCompanyDTO } from "../interfaces/company.interface";
import { PrismaBaseRepository } from "./base.repository";

export class PrismaCompanyRepository
  extends PrismaBaseRepository<Company, CreateCompanyDTO, UpdateCompanyDTO>
  implements CompanyRepository
{
  protected modelName = "company" as const;

  constructor(prisma: PrismaClient) {
    super(prisma);
  }


  async findByNameAndCode(name: string, code: string): Promise<Company | null> {
    return this.prisma.company.findFirst({
      where: { name, code, is_deleted: false },
    });
  }

  async findAllActive(params?: PaginationParams): Promise<PaginatedResult<Company>> {
    const { skip, take, page, limit } = this.resolvePagination(params);
    const where = { is_active: true, is_deleted: false };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.company.findMany({ where, skip, take, orderBy: { name: "asc" } }),
      this.prisma.company.count({ where }),
    ]);

    return this.buildPaginatedResult(data, total, page, limit);
  }


  async softDeleteCompany(id: number): Promise<Company>{
    return this.prisma.company.update({
        where :{id, is_deleted: false},
        data: {
            is_deleted: true, deleted_at: new Date(), is_active: false
        }
    })
  }
}