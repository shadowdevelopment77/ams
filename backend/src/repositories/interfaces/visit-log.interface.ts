import { VisitLog } from "../../../generated/prisma";
import { BaseRepository, PaginatedResult, PaginationParams } from "./base.interface";

export interface CreateVisitLogDTO {
  user_id: string;
  company_id: number;
  photo_url: string;
  date: Date;
  latitude?: number;
  longitude?: number;
  location_addres?: string;
  notes?: string;
  visited_at?: Date;
}

export interface UpdateVisitLogDTO {
  notes?: string;
}


export interface VisitLogRepository
  extends BaseRepository<VisitLog, CreateVisitLogDTO, UpdateVisitLogDTO, number> {
  findByUser(userId: string, date: Date, params?: PaginationParams): Promise<PaginatedResult<VisitLog>>;
}
