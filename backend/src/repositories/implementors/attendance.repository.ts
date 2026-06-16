import { Attendance, PrismaClient } from "../../../generated/prisma";
import { PrismaBaseRepository } from "./base.repository";
import {
  AttendanceRepository,
  AttendanceFilterParams,
  CreateAttendanceDTO,
  UpdateAttendanceDTO,
} from "../interfaces/attendance.interface";
import { PaginatedResult } from "../interfaces/base.interface";

export class PrismaAttendanceRepository
  extends PrismaBaseRepository<Attendance, CreateAttendanceDTO, UpdateAttendanceDTO>
  implements AttendanceRepository
{
  protected modelName = "attendance" as const;

  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  // ─── AttendanceRepository ─────────────────────────────────────────────────

  /**
   * findByUser — admin views attendance history for a specific user.
   * from/to are optional: omit both for all-time history (still paginated).
   */
  async findByUser(
    userId: number,
    from?: Date,
    to?: Date,
    params?: AttendanceFilterParams,
  ): Promise<PaginatedResult<Attendance>> {
    const { skip, take, page, limit } = this.resolvePagination(params);

    const where = {
      user_id:    userId,
      is_deleted: false,
      ...(from && to && { created_at: { gte: from, lte: to } }),
      ...(params?.statusId   && { status_id:   params.statusId }),
      ...(params?.companyId  && { company_id:  params.companyId }),
      ...(params?.divisionId && { division_id: params.divisionId }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.attendance.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: "desc" },
      }),
      this.prisma.attendance.count({ where }),
    ]);

    return this.buildPaginatedResult(data, total, page, limit);
  }

  /**
   * findByDate — all attendance for a company+division within a date range.
   * Service passes today's midnight-to-midnight for a "daily" view.
   */
  async findByDate(
    companyId: number,
    divisionId: number,
    from: Date,
    to: Date,
    params?: AttendanceFilterParams,
  ): Promise<PaginatedResult<Attendance>> {
    const { skip, take, page, limit } = this.resolvePagination(params);

    const where = {
      company_id:  companyId,
      division_id: divisionId,
      is_deleted:  false,
      created_at:  { gte: from, lte: to },
      ...(params?.statusId && { status_id: params.statusId }),
      ...(params?.userId   && { user_id:   params.userId }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.attendance.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: "asc" }, // chronological for a daily roster view
      }),
      this.prisma.attendance.count({ where }),
    ]);

    return this.buildPaginatedResult(data, total, page, limit);
  }

  /**
   * findByLate — records where is_late=true within a date range.
   * Add companyId/divisionId via params when you need them later.
   */
  async findByLate(
    companyId: number,
    divisionId: number,
    from: Date,
    to: Date,
    params?: AttendanceFilterParams,
  ): Promise<PaginatedResult<Attendance>> {
    const { skip, take, page, limit } = this.resolvePagination(params);

    const where = {
      company_id:  companyId,
      division_id: divisionId,
      is_late:    true,
      is_deleted: false,
      created_at: { gte: from, lte: to },
      ...(params?.statusId   && { status_id:   params.statusId }),
      ...(params?.userId     && { user_id:      params.userId }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.attendance.findMany({
        where,
        skip,
        take,
        orderBy: { late_minutes: "desc" }, // worst offenders first
      }),
      this.prisma.attendance.count({ where }),
    ]);

    return this.buildPaginatedResult(data, total, page, limit);
  }

  /**
   * checkOut — updates the attendance record when a user ends their shift.
   * Defaults check_out_at to now if the caller doesn't supply it.
   */
  async checkOut(attendanceId: number, data: UpdateAttendanceDTO): Promise<Attendance> {
    return this.prisma.attendance.update({
      where: { id: attendanceId },
      data:  { ...data, check_out_at: data.check_out_at ?? new Date() },
    });
  }
}