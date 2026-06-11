import {UserRole, PrismaClient, User} from "../../../generated/prisma"
import {RoleRepository, UpdateRoleDTO, CreateRoleDTO} from "../interfaces/role.interface"

export class PrismaRoleRepository implements RoleRepository {
  constructor(private prisma: PrismaClient) {}

  

  async findAll(): Promise<UserRole[]> {
    return this.prisma.userRole.findMany({
      where: { is_active: true, is_deleted: false },
      orderBy: { id: "asc" }
    })
  }

  async findById(id: number): Promise<UserRole | null> {
    return this.prisma.userRole.findFirst({
      where: { id, is_deleted: false }
    })
  }

  async create(data: CreateRoleDTO): Promise<UserRole>{
    return this.prisma.userRole.create({
        data: {name: data.name},
    })
  }

  async update(id: number, data: UpdateRoleDTO): Promise<UserRole>{
    return this.prisma.userRole.update({
        where: {id},
        data: {name: data.name, is_active: data.is_active}
    })
  }
}