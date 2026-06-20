import { AttendanceStatus, SubmissionStatus, PrismaClient } from "../../../generated/prisma";
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
  extends PrismaBaseRepository<SubmissionStatus, CreatePhotoStatusDTO, UpdatePhotoStatusDTO>
  implements PhotoStatusRepository
{
  protected modelName = "submissionStatus" as const;

  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async findByName(name: string): Promise<SubmissionStatus | null> {
    return this.prisma.submissionStatus.findFirst({
      where: { name, is_deleted: false },
    });
  }
}
