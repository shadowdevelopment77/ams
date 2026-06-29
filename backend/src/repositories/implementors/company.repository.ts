import { Company, PrismaClient } from "../../../generated/prisma";
import { CreateCompanyDTO, CompanyRepository, UpdateCompanyDTO } from "../interfaces/company.interface";
import { PrismaBaseRepository } from "./base.repository";

export class PrismaCompanyRepository
  extends PrismaBaseRepository<Company, CreateCompanyDTO, UpdateCompanyDTO, number>
  implements CompanyRepository
{
  protected modelName = "company" as const;

  constructor(prisma: PrismaClient) {
    super(prisma);
  }


  async findByName(name: string): Promise<Company | null> {
    return this.prisma.company.findFirst({
      where: { name, is_deleted: false },
    });
  }

}