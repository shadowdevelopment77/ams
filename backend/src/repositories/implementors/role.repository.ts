import {UserRole, PrismaClient} from "../../../generated/prisma"
import {RoleRepository, UpdateRoleDTO, CreateRoleDTO} from "../interfaces/role.interface"
import { PrismaBaseRepository } from "./base.repository";

export class PrismaRoleRepository extends PrismaBaseRepository<UserRole, CreateRoleDTO, UpdateRoleDTO> implements RoleRepository {

  protected modelName = "userRole" as const

  constructor(prisma: PrismaClient) {
    super(prisma)
  }

  async findByName(name: string): Promise<UserRole | null> {
    return this.prisma.userRole.findFirst({
      where: { name, is_deleted: false },
    })
  }
}