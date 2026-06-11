import { Attendance, PrismaClient } from "../../../generated/prisma";
import { PaginatedResult } from "../interfaces/base.interface";
import {
  AttendanceFilterParams,
  CreateAttendanceDTO,
  AttendanceRepository,
  UpdateAttendanceDTO,
} from "../interfaces/attendance.interface";
import { PrismaBaseRepository } from "./base.repository";

const ATTENDANCE_WITH_DETAILS = {
  user: true,
  shift: true,
  status: true,
  submissions: {
    where: { is_deleted: false },
    include: { item: true, evidence_photo: true },
  },
  work_logs: { where: { is_deleted: false } },
};

export class PrismaAttendanceRepository
  extends PrismaBaseRepository<Attendance, CreateAttendanceDTO, UpdateAttendanceDTO>
  implements AttendanceRepository
{
  protected modelName = "attendance" as const;

  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  private buildDateFilter(params?: AttendanceFilterParams) {
    const { dateFrom, dateTo } = params ?? {};
    if (!dateFrom && !dateTo) return {};
    return {
      check_in_at: {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo ? { lte: dateTo } : {}),
      },
    };
  }

  async findByUser(userId: number, params?: AttendanceFilterParams): Promise<PaginatedResult<Attendance>> {
    const { skip, take, page, limit } = this.resolvePagination(params);
    const where = {
      user_id: userId,
      is_deleted: false,
      ...(params?.statusId ? { status_id: params.statusId } : {}),
      ...(params?.isLate !== undefined ? { is_late: params.isLate } : {}),
      ...this.buildDateFilter(params),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.attendance.findMany({ where, skip, take, orderBy: { check_in_at: "desc" } }),
      this.prisma.attendance.count({ where }),
    ]);

    return this.buildPaginatedResult(data, total, page, limit);
  }

  async findByCompany(companyId: number, params?: AttendanceFilterParams): Promise<PaginatedResult<Attendance>> {
    const { skip, take, page, limit } = this.resolvePagination(params);
    const where = {
      company_id: companyId,
      is_deleted: false,
      ...(params?.divisionId ? { division_id: params.divisionId } : {}),
      ...(params?.statusId ? { status_id: params.statusId } : {}),
      ...(params?.isLate !== undefined ? { is_late: params.isLate } : {}),
      ...this.buildDateFilter(params),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.attendance.findMany({
        where, skip, take,
        orderBy: { check_in_at: "desc" },
        include: { user: { select: { id: true, name: true, email: true } }, shift: true, status: true },
      }),
      this.prisma.attendance.count({ where }),
    ]);

    return this.buildPaginatedResult(data, total, page, limit);
  }

  async findByDivision(divisionId: number, params?: AttendanceFilterParams): Promise<PaginatedResult<Attendance>> {
    const { skip, take, page, limit } = this.resolvePagination(params);
    const where = {
      division_id: divisionId,
      is_deleted: false,
      ...this.buildDateFilter(params),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.attendance.findMany({ where, skip, take, orderBy: { check_in_at: "desc" } }),
      this.prisma.attendance.count({ where }),
    ]);

    return this.buildPaginatedResult(data, total, page, limit);
  }

  async findTodayByUser(userId: number): Promise<Attendance | null> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return this.prisma.attendance.findFirst({
      where: {
        user_id: userId,
        is_deleted: false,
        check_in_at: { gte: startOfDay, lte: endOfDay },
      },
    });
  }

  async findWithDetails(attendanceId: number): Promise<Attendance | null> {
    return this.prisma.attendance.findFirst({
      where: { id: attendanceId, is_deleted: false },
      include: ATTENDANCE_WITH_DETAILS,
    });
  }

  async findUserByLate(userId: number, params?: AttendanceFilterParams): Promise<PaginatedResult<Attendance>> {
    const { skip, take, page, limit } = this.resolvePagination(params);
    const where = {
      user_id: userId,
      is_deleted: false,
      is_late: true,
      ...(params?.divisionId ? { division_id: params.divisionId } : {}),
      ...(params?.statusId ? { status_id: params.statusId } : {}),
      ...this.buildDateFilter(params),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.attendance.findMany({
        where, skip, take,
        orderBy: { check_in_at: "desc" },
        include: { shift: true, status: true },
      }),
      this.prisma.attendance.count({ where }),
    ]);

    return this.buildPaginatedResult(data, total, page, limit);
  }

  async checkOut(attendanceId: number, data: UpdateAttendanceDTO): Promise<Attendance> {
    return this.prisma.attendance.update({
      where: { id: attendanceId },
      data: { ...data, check_out_at: data.check_out_at ?? new Date() },
    });
  }
}