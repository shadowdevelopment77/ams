import {
  ChecklistItem,
  ChecklistSubmission,
  ChecklistTemplate,
  PrismaClient,
} from "../../../generated/prisma";
import { PrismaBaseRepository } from "./base.repository";
import {
  CreateChecklistItemDTO,
  UpdateChecklistItemDTO,
  ChecklistTemplateRepository,
  CreateChecklistTemplateDTO,
  UpdateChecklistTemplateDTO,
  ChecklistItemRepository,
  ChecklistSubmissionRepository,
  ChecklistSubmissionFilterParams,
  CreateChecklistSubmissionDTO,
  ReviewSubmissionDTO,
  UpdateChecklistSubmissionDTO,
} from "../interfaces/checklist.interface";
import { PaginatedResult, PaginationParams } from "../interfaces/base.interface";

export class PrismaChecklistTemplateRepository
  extends PrismaBaseRepository<ChecklistTemplate, CreateChecklistTemplateDTO, UpdateChecklistTemplateDTO>
  implements ChecklistTemplateRepository
{
  protected modelName = "checklistTemplate" as const;

  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async findByDivision(companyId: number, divisionId: number): Promise<ChecklistTemplate[]> {
    return this.prisma.checklistTemplate.findMany({
      where: { company_id: companyId, division_id: divisionId, is_deleted: false },
      orderBy: { created_at: "desc" },
    });
  }

}

export class PrismaChecklistItemRepository
  extends PrismaBaseRepository<ChecklistItem, CreateChecklistItemDTO, UpdateChecklistItemDTO>
  implements ChecklistItemRepository
{
  protected modelName = "checklistItem" as const;

  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async findByTemplate(
    templateId: number,
    params?: PaginationParams,
  ): Promise<PaginatedResult<ChecklistItem>> {
    const { skip, take, page, limit } = this.resolvePagination(params);
    const where = { template_id: templateId, is_deleted: false };

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

export class PrismaChecklistSubmissionRepository
  extends PrismaBaseRepository<
    ChecklistSubmission,
    CreateChecklistSubmissionDTO,
    UpdateChecklistSubmissionDTO
  >
  implements ChecklistSubmissionRepository
{
  protected modelName = "checklistSubmission" as const;

  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async findByAttendanceAndItem(
    attendanceId: string,
    itemId: number,
  ): Promise<ChecklistSubmission | null> {
    return this.prisma.checklistSubmission.findFirst({
      where: { attendance_id: attendanceId, item_id: itemId, is_deleted: false },
      include: { evidence_photo: { where: { is_deleted: false } } },
    });
  }

  async bulkCreate(attendanceId: string, itemIds: number[]): Promise<ChecklistSubmission[]> {
    await this.prisma.checklistSubmission.createMany({
      data: itemIds.map((item_id) => ({
        attendance_id: attendanceId,
        item_id,
      })),
      skipDuplicates: true,
    });

    return this.prisma.checklistSubmission.findMany({
      where: {
        attendance_id: attendanceId,
        item_id: { in: itemIds },
        is_deleted: false,
      },
      orderBy: { item: { order_no: "asc" } },
    });
  }

async submitAll(attendanceId: string, statusId: number): Promise<void> {
  await this.prisma.checklistSubmission.updateMany({
    where: {
      attendance_id: attendanceId,
      is_submitted:  false,
      is_deleted:    false,
    },
    data: {
      is_submitted: true,
      submitted_at: new Date(),
      status_id:    statusId,
    },
  })
}

async findByDivision(
    companyId: number,
    divisionId: number,
    date: Date,
    params: ChecklistSubmissionFilterParams,
  ): Promise<PaginatedResult<ChecklistSubmission>> {
    const { skip, take, page, limit } = this.resolvePagination(params);

    const where = {
      is_deleted: false,
      ...(params.statusId && { status_id: params.statusId }),
      attendance: {
        company_id: companyId,
        division_id: divisionId,
        date: date,
        is_deleted: false,
      },
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.checklistSubmission.findMany({
        where,
        skip,
        take,
        include: {
          item: true,
          evidence_photo: { where: { is_deleted: false } },
          attendance: { include: { user: true } },
          status: true,
        },
        orderBy: { created_at: "asc" },
      }),
      this.prisma.checklistSubmission.count({ where }),
    ]);

    return this.buildPaginatedResult(data, total, page, limit);
  }

   async review(submissionId: number, data: ReviewSubmissionDTO): Promise<ChecklistSubmission> {
    return this.prisma.checklistSubmission.update({
      where: { id: submissionId },
      data: {
        status_id: data.status_id,
        reviewed_by: data.reviewed_by,
        reviewed_at: new Date(),
        reject_reason: data.reject_reason ?? null,
      },
    });
  }


  async findByItemAndDate(
    itemId: number,
    companyId: number,
    date: Date,
    params: PaginationParams,
  ): Promise<PaginatedResult<ChecklistSubmission>> {
    const { skip, take, page, limit } = this.resolvePagination(params);

    const where = {
      item_id: itemId,
      is_deleted: false,
      attendance: {
        company_id: companyId,
        date: date,
        is_deleted: false,
      },
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.checklistSubmission.findMany({
        where,
        skip,
        take,
        include: {
          evidence_photo: {
            where: { is_deleted: false },
            orderBy: { order: "asc" },
          },
          attendance: {
            include: { user: { select: { id: true, name: true } } },
          },
        },
        orderBy: { created_at: "asc" },
      }),
      this.prisma.checklistSubmission.count({ where }),
    ]);

    return this.buildPaginatedResult(data, total, page, limit);
  }

}
