import { Division } from "../../../generated/prisma";
import { BaseRepository, PaginatedResult, PaginationParams } from "./base.interface";
 
export interface CreateDivisionDTO {
  company_id: number;
  name: string;
  late_tolerance_minutes?: number;
}
 
export interface UpdateDivisionDTO {
  name?: string;
  late_tolerance_minutes?: number;
  is_active?: boolean;
}
 
export interface DivisionRepository extends BaseRepository<Division, CreateDivisionDTO, UpdateDivisionDTO, number> {
  findByCompany(companyId: number, params?: PaginationParams): Promise<PaginatedResult<Division>>;
  findByName(companyId: number, name: string ): Promise<Division | null>;
}
