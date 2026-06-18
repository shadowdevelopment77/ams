import { Attendance } from "../../../generated/prisma";
import { BaseRepository, PaginatedResult, PaginationParams } from "./base.interface";

export interface CreateAttendanceDTO {
  user_id: number;
  company_id?: number;
  division_id?: number;
  shift_id?: number;
  photo_url: string;
  latitude?: number;
  longitude?: number;
  status_id: number;
  is_late?: boolean;
  late_minutes?: number;
}

export interface UpdateAttendanceDTO {
  check_out_at?: Date;
  checkout_photo_url?: string;
  checkout_latitude?: number;
  checkout_longitude?: number;
  early_leave?: boolean;
  early_leave_reason?: string;
  status_id?: number;
}

export interface AttendanceFilterParams extends PaginationParams {
  date?: Date         // single day filter — optional
  statusId?: number
  
}

export interface AttendanceRepository
  extends BaseRepository<Attendance, CreateAttendanceDTO, UpdateAttendanceDTO> {
  findByUser(userId:number, date?: Date): Promise<Attendance | null >;
  findByDate(companyId:number, divisionId:number, params: AttendanceFilterParams): Promise<PaginatedResult<Attendance>>; 
  findByLate(companyId:number, divisionId:number, is_Late: boolean, params: AttendanceFilterParams): Promise <PaginatedResult<Attendance>>;
  checkOut(attendanceId: number, data: UpdateAttendanceDTO): Promise<Attendance>;
}