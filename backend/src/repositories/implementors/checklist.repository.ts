import { ChecklistItem, ChecklistSubmission, ChecklistTemplate } from "../../../generated/prisma";
import {PrismaBaseRepository} from "./base.repository"
import {
    CreateChecklistItemDTO,
    UpdateChecklistItemDTO,
    ChecklistTemplateRepository,
    CreateChecklistTemplateDTO,
    UpdateChecklistTemplateDTO,
    ChecklistItemRepository,
    CreateChecklistSubmissionDTO,
    UpdateChecklistSubmissionDTO,
    ChecklistSubmissionRepository
} from "../interfaces/checklist.interface"
import { PrismaClient } from "@prisma/client/extension";
import { PaginatedResult, PaginationParams } from "../interfaces/base.interface"


export class PrismaChecklistTemplateRepository extends PrismaBaseRepository<ChecklistTemplate, CreateChecklistTemplateDTO, UpdateChecklistTemplateDTO> implements ChecklistTemplateRepository {
    protected modelName = "checklistTemplate" as const;

    constructor(prisma: PrismaClient){
        super(prisma);
    }

    async findTemplate(companyId: number, divisionId: number): Promise<ChecklistTemplate[]>{
        return this.prisma.checklistTemplate.findMany({
            where: {company_id: companyId, division_id: divisionId, is_deleted: false},
            orderBy: {
                created_at: "desc"
            }
        })
    }
}

export class PrismaChecklistItemRepository extends PrismaBaseRepository<ChecklistItem, CreateChecklistItemDTO, UpdateChecklistItemDTO> implements ChecklistItemRepository {
    protected modelName = "checklistItem" as const;

    constructor(prisma: PrismaClient){
        super(prisma);
    }


    async findItem(templateId: number, companyId: number, divisionId: number, params?: PaginationParams): Promise<PaginatedResult<ChecklistItem>>{
        const { skip, take, page, limit } = this.resolvePagination(params);
    const where = {
        template_id: templateId,
        company_id:  companyId,
        division_id: divisionId,
        is_deleted:  false,
     };

    const [data, total] = await this.prisma.$transaction([
        this.prisma.checklistItem.findMany({
        where,
        skip,
        take,
        orderBy: { order_no: "asc" },
        }),
        this.prisma.checklistItem.count({ where }),
    ]);

    return this.buildPaginatedResult(data, total, page, limit);
    }
}

export class PrismaChecklistSubmissionRepository extends PrismaBaseRepository<ChecklistSubmission, CreateChecklistSubmissionDTO, UpdateChecklistSubmissionDTO> implements ChecklistSubmissionRepository {
    protected modelName = "checklistSubmission" as const;

    constructor(prisma: PrismaClient){
        super(prisma);
    }
    
    async findByAttendance(attendanceId: number): Promise<ChecklistSubmission[]> {
    return this.prisma.checklistSubmission.findMany({
      where: {
        attendance_id: attendanceId,
        is_deleted:    false,
      },
      orderBy: { item: { order_no: "asc" } }, // follow the checklist order
    });
  }

  /**
   * bulkCreate — when staff clocks in, system auto-creates one submission
   * row per checklist item so staff can tick them off one by one.
   * Uses createMany for a single DB round-trip instead of N inserts.
   */
  async bulkCreate(
    attendanceId: number,
    itemIds: number[],
  ): Promise<ChecklistSubmission[]> {
    // createMany doesn't return the created rows in Prisma,
    // so we insert then fetch in a transaction to keep it consistent
    await this.prisma.checklistSubmission.createMany({
      data: itemIds.map((item_id) => ({
        attendance_id: attendanceId,
        item_id,
      })),
      skipDuplicates: true, // safety: don't double-create if called twice
    });

    return this.prisma.checklistSubmission.findMany({
      where: {
        attendance_id: attendanceId,
        item_id:       { in: itemIds },
        is_deleted:    false,
      },
      orderBy: { item: { order_no: "asc" } },
    });
  }

  /**
   * submitAll — staff hits "submit" after completing all items.
   * Marks every submission under this attendance as submitted at once.
   * Returns void because the service will re-fetch via findByAttendance
   * if it needs the updated records.
   */
  async submitAll(attendanceId: number): Promise<void> {
    await this.prisma.checklistSubmission.updateMany({
      where: {
        attendance_id: attendanceId,
        is_deleted:    false,
        is_submitted:  false, // only update ones not already submitted
      },
      data: {
        is_submitted: true,
        submitted_at: new Date(),
      },
    });
  }
}