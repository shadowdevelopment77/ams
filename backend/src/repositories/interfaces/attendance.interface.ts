import { Attendance } from "../../../generated/prisma";
import { BaseRepository, PaginatedResult, PaginationParams } from "./base.interface";

export interface CreateAttendanceDTO {
  user_id: string;
  company_id: number;
  division_id: number;
  shift_id: number;
  photo_url: string;
  date: Date; 
  latitude?: number;
  longitude?: number;
  location_address?: string;
  status_id: number;
  is_late?: boolean;
  late_minutes?: number;
}

export interface UpdateAttendanceDTO {
  check_out_at?: Date;
  checkout_photo_url?: string;
  checkout_latitude?: number;
  checkout_longitude?: number;
  checkout_address?: string;
  early_leave?: boolean;
  early_leave_reason?: string;
  status_id?: number;
}

export interface AttendanceFilterParams extends PaginationParams {
  statusId?: number
}

export interface AttendanceRepository
  extends BaseRepository<Attendance, CreateAttendanceDTO, UpdateAttendanceDTO, string> {
  findByUser(userId:string, date: Date): Promise<Attendance | null >;
  findByDate(companyId:number, divisionId:number, date: Date, params: AttendanceFilterParams): Promise<PaginatedResult<Attendance>>; 
  findByLate(companyId:number, divisionId:number, isLate: boolean, date: Date, params: AttendanceFilterParams): Promise <PaginatedResult<Attendance>>;
  checkOut(attendanceId: string, data: UpdateAttendanceDTO): Promise<Attendance>;
}