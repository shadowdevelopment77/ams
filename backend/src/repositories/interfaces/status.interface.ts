import { AttendanceStatus, SubmissionStatus } from "../../../generated/prisma";
import { BaseRepository } from "./base.interface";

export interface CreateAttendanceStatusDTO {
  name: string;
}

export interface UpdateAttendanceStatusDTO {
  name?: string;
  is_active?: boolean;
}

export interface AttendanceStatusRepository
  extends BaseRepository<AttendanceStatus, CreateAttendanceStatusDTO, UpdateAttendanceStatusDTO> {
  findByName(name: string): Promise<AttendanceStatus | null>;
}

export interface CreatePhotoStatusDTO {
  name: string;
}

export interface UpdatePhotoStatusDTO {
  name?: string;
  is_active?: boolean;
}

export interface SubmissionStatusRepository
  extends BaseRepository<SubmissionStatus, CreatePhotoStatusDTO, UpdatePhotoStatusDTO> {
  findByName(name: string): Promise<SubmissionStatus | null>;
}
