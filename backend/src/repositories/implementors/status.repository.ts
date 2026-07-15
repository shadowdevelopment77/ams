import { AttendanceStatus, PrismaClient } from "../../../generated/prisma";
import { PrismaBaseRepository } from "./base.repository";
import {
  AttendanceStatusRepository,
  CreateAttendanceStatusDTO,
  UpdateAttendanceStatusDTO,
} from "../interfaces/status.interface";

export class PrismaAttendanceStatusRepository
  extends PrismaBaseRepository<AttendanceStatus, CreateAttendanceStatusDTO, UpdateAttendanceStatusDTO, number>
  implements AttendanceStatusRepository
{
  protected modelName = "attendanceStatus" as const;

  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async findByName(name: string): Promise<AttendanceStatus | null> {
    return this.prisma.attendanceStatus.findFirst({
      where: { name, is_deleted: false },
    });
  }
}
