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
  CreateChecklistSubmissionDTO,
  UpdateChecklistSubmissionDTO,
  ChecklistSubmissionRepository,
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

  async findTemplate(companyId: number, divisionId: number): Promise<ChecklistTemplate[]> {
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
    attendanceId: number,
    itemId: number,
  ): Promise<ChecklistSubmission | null> {
    return this.prisma.checklistSubmission.findFirst({
      where: { attendance_id: attendanceId, item_id: itemId, is_deleted: false },
      include: { evidence_photo: { where: { is_deleted: false } } },
    });
  }

  async bulkCreate(attendanceId: number, itemIds: number[]): Promise<ChecklistSubmission[]> {
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

  async submitAll(attendanceId: number): Promise<void> {
    await this.prisma.checklistSubmission.updateMany({
      where: {
        attendance_id: attendanceId,
        is_deleted: false,
        is_submitted: false,
      },
      data: {
        is_submitted: true,
        submitted_at: new Date(),
      },
    });
  }
}
