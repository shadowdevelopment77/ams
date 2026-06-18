import { ChecklistItem, ChecklistSubmission, ChecklistTemplate } from "../../../generated/prisma";
import { BaseRepository, PaginatedResult, PaginationParams } from "./base.interface";

// --- ChecklistTemplate ---
export interface CreateChecklistTemplateDTO {
  division_id: number;
  company_id: number;
  title: string;
}

export interface UpdateChecklistTemplateDTO {
  title?: string;
  is_active?: boolean;
}

export interface ChecklistTemplateRepository
  extends BaseRepository<ChecklistTemplate, CreateChecklistTemplateDTO, UpdateChecklistTemplateDTO> {
  findTemplate(companyId: number, divisionId: number): Promise<ChecklistTemplate[]>;
}

// --- ChecklistItem ---
export interface CreateChecklistItemDTO {
  template_id: number;
  order_no: number;
  description: string;
  requires_photo?: boolean;
}

export interface UpdateChecklistItemDTO {
  description?: string;
  requires_photo?: boolean;
  is_active?: boolean;
}


export interface ChecklistItemRepository
  extends BaseRepository<ChecklistItem, CreateChecklistItemDTO, UpdateChecklistItemDTO> {
  findByTemplate(templateId: number, params?: PaginationParams): Promise<PaginatedResult<ChecklistItem>>;
}

// --- ChecklistSubmission ---
export interface CreateChecklistSubmissionDTO {
  attendance_id: number;
  item_id: number;
}

export interface UpdateChecklistSubmissionDTO {
  is_done?: boolean;
  is_submitted?: boolean;
  notes?: string;
  submitted_at?: Date;
}

export interface ChecklistSubmissionRepository
  extends BaseRepository<ChecklistSubmission, CreateChecklistSubmissionDTO, UpdateChecklistSubmissionDTO> {
  findByAttendanceAndItem(attendanceId: number, itemId: number): Promise<ChecklistSubmission | null>;
  bulkCreate(attendanceId: number, itemIds: number[]): Promise<ChecklistSubmission[]>;
  submitAll(attendanceId: number): Promise<void>;
}