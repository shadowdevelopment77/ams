import {UserRole} from "../../../generated/prisma"
import { BaseRepository } from "./base.interface";


export interface CreateRoleDTO{
    name:string
}


export interface UpdateRoleDTO {
  name?: string
  is_active?: boolean
}

export interface RoleRepository extends BaseRepository <UserRole, CreateRoleDTO, UpdateRoleDTO>{
  
}