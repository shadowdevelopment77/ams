import { Division } from "../../../generated/prisma";
import { BaseRepository, PaginatedResult, PaginationParams } from "./base.interface";
 
export interface CreateDivisionDTO {
  company_id: number;
  name: string;
  has_checklist?: boolean;
  has_evidence_photo?: boolean;
  has_work_log?: boolean;
  min_photo_per_day?: number;
  photo_highlight_only?: boolean;
  late_tolerance_minutes?: number;
}
 
export interface UpdateDivisionDTO {
  name?: string;
  has_checklist?: boolean;
  has_evidence_photo?: boolean;
  has_work_log?: boolean;
  min_photo_per_day?: number;
  photo_highlight_only?: boolean;
  late_tolerance_minutes?: number;
  is_active?: boolean;
}
 
export interface DivisionRepository extends BaseRepository<Division, CreateDivisionDTO, UpdateDivisionDTO> {
  findByCompany(companyId: number, params?: PaginationParams): Promise<PaginatedResult<Division>>;
  findByCompanyAndName(companyId: number, name: string): Promise<Division | null>;
}
