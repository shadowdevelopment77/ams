import {UserRole} from "../../../generated/prisma"


export interface CreateRoleDTO{
    name:string
}


export interface UpdateRoleDTO {
  name?: string
  is_active?: boolean
}

export interface IRoleRepository {
  findAll(): Promise<UserRole[]>
  findById(id: number): Promise<UserRole | null>

  create(data: CreateRoleDTO): Promise<UserRole>
  update(id:number, data: UpdateRoleDTO): Promise<UserRole>
}