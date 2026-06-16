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

}