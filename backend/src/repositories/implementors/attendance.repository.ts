import { Attendance, PrismaClient } from "../../../generated/prisma";
import { PrismaBaseRepository } from "./base.repository";
import {
  AttendanceRepository,
  AttendanceFilterParams,
  CreateAttendanceDTO,
  UpdateAttendanceDTO,
} from "../interfaces/attendance.interface";
import { PaginatedResult, PaginationParams } from "../interfaces/base.interface";

export class PrismaAttendanceRepository
  extends PrismaBaseRepository<Attendance, CreateAttendanceDTO, UpdateAttendanceDTO, string>
  implements AttendanceRepository
{
  protected modelName = "attendance" as const;

  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  // ─── AttendanceRepository ─────────────────────────────────────────────────

  // Single exact-date lookup (checkin/getToday) -- see findHistoryByUser for a paginated list.
  async findByUser(
    userId:string, date:Date
  ): Promise<Attendance | null > {

  return this.prisma.attendance.findFirst({
    where: {
      user_id: userId,
      is_deleted: false,
      date: date,
    },
    include: { shift: true, status: true },
  })
}

  async findHistoryByUser(
    userId: string,
    params?: PaginationParams,
  ): Promise<PaginatedResult<Attendance>> {
    const { skip, take, page, limit } = this.resolvePagination(params);
    const where = { user_id: userId, is_deleted: false };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.attendance.findMany({
        where,
        skip,
        take,
        orderBy: { date: "desc" },
        include: { shift: true, status: true },
      }),
      this.prisma.attendance.count({ where }),
    ]);

    return this.buildPaginatedResult(data, total, page, limit);
  }

  async findByDate(
    companyId: number,
    divisionId: number,
    date: Date,
    params?: AttendanceFilterParams,
  ): Promise<PaginatedResult<Attendance>> {
    const { skip, take, page, limit } = this.resolvePagination(params);

    const where = {
      company_id:  companyId,
      division_id: divisionId,
      date: date,
      is_deleted:  false,
      ...(params?.statusId && { status_id: params.statusId }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.attendance.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: "desc" },
        include: {
        user: { select: { id: true, name: true, email: true } },
        shift: true,
        status: true,
        },
      }),
      this.prisma.attendance.count({ where }),
    ]);

    return this.buildPaginatedResult(data, total, page, limit);
  }

  async findByLate(
    companyId: number,
    divisionId: number,
    isLate: boolean,
    date: Date,
    params?: AttendanceFilterParams,
  ): Promise<PaginatedResult<Attendance>> {
    const { skip, take, page, limit } = this.resolvePagination(params);

    const where = {
      company_id:  companyId,
      division_id: divisionId,
      is_late:    isLate,
      date: date,
      is_deleted: false,
      ...(params?.statusId   && { status_id:   params.statusId }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.attendance.findMany({
        where,
        skip,
        take,
        orderBy: { late_minutes: "desc" },
        include: {
        user: { select: { id: true, name: true, email: true } },
        shift: true,
        status: true,
        },
      }),
      this.prisma.attendance.count({ where }),
    ]);

    return this.buildPaginatedResult(data, total, page, limit);
  }

  async checkOut(attendanceId: string, data: UpdateAttendanceDTO): Promise<Attendance> {
    return this.prisma.attendance.update({
      where: { id: attendanceId },
      data:  { ...data, check_out_at: data.check_out_at ?? new Date() },
    });
  }
}