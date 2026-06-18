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

  private buildDateFilter(date?: Date) {
    if (!date) return {}

    const start = new Date(date)
    start.setHours(0, 0, 0, 0)

    const end = new Date(date)
    end.setHours(23, 59, 59, 999)

    return { check_in_at: { gte: start, lte: end } }
  }


  async findByUser(
    userId:number, date?:Date
  ): Promise<Attendance | null > {
    const target = date ?? new Date()  // defaults to today

  const start = new Date(target)
  start.setHours(0, 0, 0, 0)

  const end = new Date(target)
  end.setHours(23, 59, 59, 999)

  return this.prisma.attendance.findFirst({
    where: {
      user_id: userId,
      is_deleted: false,
      check_in_at: { gte: start, lte: end },
    },
    include: { shift: true, status: true },
  })
}


  /**
   * findByDate — all attendance for a company+division within a date range.
   * Service passes today's midnight-to-midnight for a "daily" view.
   */
  async findByDate(
    companyId: number,
    divisionId: number,
    params?: AttendanceFilterParams,
  ): Promise<PaginatedResult<Attendance>> {
    const { skip, take, page, limit } = this.resolvePagination(params);

    const where = {
      company_id:  companyId,
      division_id: divisionId,
      is_deleted:  false,
      ...(params?.statusId && { status_id: params.statusId }),
      ...this.buildDateFilter(params?.date),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.attendance.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: "desc" }, // chronological for a daily roster view
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

  /**
   * findByLate — records where is_late=true within a date range.
   * Add companyId/divisionId via params when you need them later.
   */
  async findByLate(
    companyId: number,
    divisionId: number,
    is_late: boolean,
    params?: AttendanceFilterParams,
  ): Promise<PaginatedResult<Attendance>> {
    const { skip, take, page, limit } = this.resolvePagination(params);

    const where = {
      company_id:  companyId,
      division_id: divisionId,
      is_late:    true,
      is_deleted: false,
      ...(params?.statusId   && { status_id:   params.statusId }),
      ...this.buildDateFilter(params?.date),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.attendance.findMany({
        where,
        skip,
        take,
        orderBy: { late_minutes: "desc" }, // worst offenders first
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

  async findOpenByUser(userId: number, from: Date, to: Date): Promise<Attendance | null> {
    return this.prisma.attendance.findFirst({
      where: {
        user_id: userId,
        check_out_at: null,
        is_deleted: false,
        check_in_at: { gte: from, lte: to },
      },
    });
  }

  async findTodayByUserAndShift(
    userId: number,
    shiftId: number,
    from: Date,
    to: Date,
  ): Promise<Attendance | null> {
    return this.prisma.attendance.findFirst({
      where: {
        user_id: userId,
        shift_id: shiftId,
        is_deleted: false,
        check_in_at: { gte: from, lte: to },
      },
    });
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