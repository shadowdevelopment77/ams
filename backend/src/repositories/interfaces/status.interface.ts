import { AttendanceStatus } from "../../../generated/prisma";
import { BaseRepository } from "./base.interface";

export interface CreateAttendanceStatusDTO {
  name: string;
}

export interface UpdateAttendanceStatusDTO {
  name?: string;
  is_active?: boolean;
}

export interface AttendanceStatusRepository
  extends BaseRepository<AttendanceStatus, CreateAttendanceStatusDTO, UpdateAttendanceStatusDTO, number> {
  findByName(name: string): Promise<AttendanceStatus | null>;
}

