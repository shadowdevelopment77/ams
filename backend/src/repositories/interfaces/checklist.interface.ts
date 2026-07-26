import {
  ChecklistItem,
  ChecklistSubmission,
  ChecklistTemplate,
  ChecklistPhoto,
  Prisma
} from "../../../generated/prisma";
import { BaseRepository, PaginatedResult, PaginationParams } from "./base.interface";

// ─── ChecklistTemplate ──────────────────────────────────────────────────────

export interface CreateChecklistTemplateDTO {
  division_id: number;
  company_id:  number;
  title:       string;
}

export interface UpdateChecklistTemplateDTO {
  title?:     string;
  is_active?: boolean;
}

export interface ChecklistTemplateRepository
  extends BaseRepository<ChecklistTemplate, CreateChecklistTemplateDTO, UpdateChecklistTemplateDTO, number> {
  findByDivision(companyId: number, divisionId: number): Promise<ChecklistTemplate[]>;
}

// ─── ChecklistItem ──────────────────────────────────────────────────────────

export interface CreateChecklistItemDTO {
  template_id:    number;
  order_no:       number;
  description:    string;
  requires_photo: boolean;
}

export interface UpdateChecklistItemDTO {
  description?: string;
  order_no?:    number;
  is_active?:   boolean;
}

export interface ChecklistItemRepository
  extends BaseRepository<ChecklistItem, CreateChecklistItemDTO, UpdateChecklistItemDTO, number> {
  findByTemplate(templateId: number, params?: PaginationParams): Promise<PaginatedResult<ChecklistItem>>;
}

// ─── ChecklistSubmission ────────────────────────────────────────────────────

export interface CreateChecklistSubmissionDTO {
  attendance_id: string;
  item_id:       number;
}

export interface UpdateChecklistSubmissionDTO {
  is_submitted?: boolean;
  submitted_at?: Date;
}
export type ChecklistSubmissionWithPhotos = Prisma.ChecklistSubmissionGetPayload<{
  include: { photos: true; item: true }
}>

export type ChecklistSubmissionWithEvidence = Prisma.ChecklistSubmissionGetPayload<{
    include: {
    photos: true,
    attendance: { include: { user: { select: { id: true, name: true } } } },
    item: {
      include: {
        template: {
          include: {
            company:  { select: { id: true, name: true } },
            division: { select: { id: true, name: true } },
          }
        }
      }
    }
  }
}>
export interface ChecklistSubmissionRepository
  extends BaseRepository<ChecklistSubmission, CreateChecklistSubmissionDTO, UpdateChecklistSubmissionDTO, number> {
  findByAttendanceAndItem(attendanceId: string, itemId: number): Promise<ChecklistSubmission | null>;
  findByAttendance(attendanceId: string): Promise<ChecklistSubmissionWithPhotos[]>;
  bulkCreate(attendanceId: string, itemIds: number[]): Promise<ChecklistSubmission[]>;
  submitAll(attendanceId: string): Promise<void>;
  findByDivisionAndDate(
    companyId:  number,
    divisionId: number,
    date:       Date,
    params:     PaginationParams
  ): Promise<PaginatedResult<ChecklistSubmissionWithEvidence>>;
  findByUserAndDate(
    userId: string,
    date:   Date,
    params: PaginationParams
  ): Promise<PaginatedResult<ChecklistSubmissionWithEvidence>>;
}

// ─── ChecklistPhoto ─────────────────────────────────────────────────────────

export interface CreateChecklistPhotoDTO {
  submission_id: number;
  photo_url:     string;
  order:         number;
}

export interface ChecklistPhotoRepository
  extends BaseRepository<ChecklistPhoto, CreateChecklistPhotoDTO, {}, number> {
  findBySubmission(submissionId: number): Promise<ChecklistPhoto[]>;
  countBySubmission(submissionId: number): Promise<number>;
}