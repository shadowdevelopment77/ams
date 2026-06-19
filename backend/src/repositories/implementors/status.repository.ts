import { AttendanceStatus, PhotoStatus, PrismaClient } from "../../../generated/prisma";
import { PrismaBaseRepository } from "./base.repository";
import {
  AttendanceStatusRepository,
  CreateAttendanceStatusDTO,
  UpdateAttendanceStatusDTO,
  CreatePhotoStatusDTO,
  UpdatePhotoStatusDTO,
  PhotoStatusRepository,
} from "../interfaces/status.interface";

export class PrismaAttendanceStatusRepository
  extends PrismaBaseRepository<AttendanceStatus, CreateAttendanceStatusDTO, UpdateAttendanceStatusDTO>
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

export class PrismaPhotoStatusRepository
  extends PrismaBaseRepository<PhotoStatus, CreatePhotoStatusDTO, UpdatePhotoStatusDTO>
  implements PhotoStatusRepository
{
  protected modelName = "photoStatus" as const;

  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async findByName(name: string): Promise<PhotoStatus | null> {
    return this.prisma.photoStatus.findFirst({
      where: { name, is_deleted: false },
    });
  }
}
