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
  findByDivision(companyId: number, divisionId: number): Promise<ChecklistTemplate[]>;
}

// --- ChecklistItem ---
export interface CreateChecklistItemDTO {
  template_id: number;
  order_no: number;
  description: string;
  requires_photo: boolean;
}

export interface UpdateChecklistItemDTO {
  description?: string;
  requires_photo?: boolean;
  order_no?: number;
  is_active?: boolean;
}


export interface ChecklistItemRepository
  extends BaseRepository<ChecklistItem, CreateChecklistItemDTO, UpdateChecklistItemDTO> {
  findByTemplate(templateId: number, params?: PaginationParams): Promise<PaginatedResult<ChecklistItem>>;
}

// --- ChecklistSubmission ---
export interface CreateChecklistSubmissionDTO {
  attendance_id: string;
  item_id: number;
  status_id?: number;
}

export interface UpdateChecklistSubmissionDTO {
  notes?: string;
  submitted_at?: Date;
}

export interface ReviewSubmissionDTO{
  status_id: number;
  reviewed_by: string;
  reject_reason: string;
}

export interface ChecklistSubmissionFilterParams extends PaginationParams {
  statusId?: number
}

export interface ChecklistSubmissionRepository
  extends BaseRepository<ChecklistSubmission, CreateChecklistSubmissionDTO, UpdateChecklistSubmissionDTO> {
  findByAttendanceAndItem(attendanceId: string, itemId: number): Promise<ChecklistSubmission | null>;
  bulkCreate(attendanceId: string, itemIds: number[]): Promise<ChecklistSubmission[]>;
  submitAll(attendanceId: string, statusId: number): Promise<void>;

  findByDivision(companyId: number, divisionId: number, date: Date, params: ChecklistSubmissionFilterParams ): Promise<PaginatedResult<ChecklistSubmission>>
  review(submissionId: number, data: ReviewSubmissionDTO): Promise<ChecklistSubmission>
  findByItemAndDate(itemId: number, companyId: number, date: Date, params: PaginationParams ): Promise<PaginatedResult<ChecklistSubmission>>
}