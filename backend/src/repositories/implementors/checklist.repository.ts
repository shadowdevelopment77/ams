import {
  ChecklistItem,
  ChecklistSubmission,
  ChecklistTemplate,
  ChecklistPhoto,
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
  CreateChecklistSubmissionDTO,
  UpdateChecklistSubmissionDTO,
  ChecklistPhotoRepository,
  CreateChecklistPhotoDTO,
  ChecklistSubmissionWithEvidence,
  ChecklistSubmissionWithPhotos
} from "../interfaces/checklist.interface";
import { PaginatedResult, PaginationParams } from "../interfaces/base.interface";
export class PrismaChecklistTemplateRepository
  extends PrismaBaseRepository<ChecklistTemplate, CreateChecklistTemplateDTO, UpdateChecklistTemplateDTO, number>
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
  extends PrismaBaseRepository<ChecklistItem, CreateChecklistItemDTO, UpdateChecklistItemDTO, number>
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
    UpdateChecklistSubmissionDTO,
    number
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
    });
  }

  async findByAttendance(attendanceId: string): Promise<ChecklistSubmissionWithPhotos[]> {
    return this.prisma.checklistSubmission.findMany({
      where: { attendance_id: attendanceId, is_deleted: false },
      include: { photos: true, item: true },
      orderBy: { item: { order_no: "asc" } },
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

  async submitAll(attendanceId: string): Promise<void> {
    await this.prisma.checklistSubmission.updateMany({
      where: {
        attendance_id: attendanceId,
        is_submitted:  false,
        is_deleted:    false,
      },
      data: {
        is_submitted: true,
        submitted_at: new Date(),
      },
    })
  }


  private readonly evidenceInclude = {
    photos: { orderBy: { order: "asc" as const } },
    attendance: {
      include: { user: { select: { id: true, name: true } } },
    },
    item: {
      include: {
        template: {
          include: {
            company:  { select: { id: true, name: true } },
            division: { select: { id: true, name: true } },
          }
        }
      }
    },
  };

  async findByDivisionAndDate(
    companyId: number,
    divisionId: number,
    date: Date,
    params: PaginationParams,
  ): Promise<PaginatedResult<ChecklistSubmissionWithEvidence>> {
    const { skip, take, page, limit } = this.resolvePagination(params);

    const where = {
      is_deleted: false,
      item: {
        template: {
          company_id: companyId,
          division_id: divisionId,
        },
      },
      attendance: {
        date: date,
        is_deleted: false,
      },
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.checklistSubmission.findMany({
        where,
        skip,
        take,
        include: this.evidenceInclude,
        orderBy: { created_at: "asc" },
      }),
      this.prisma.checklistSubmission.count({ where }),
    ]);

    return this.buildPaginatedResult(data, total, page, limit);
  }

  async findByUserAndDate(
    userId: string,
    date: Date,
    params: PaginationParams,
  ): Promise<PaginatedResult<ChecklistSubmissionWithEvidence>> {
    const { skip, take, page, limit } = this.resolvePagination(params);

    const where = {
      is_deleted: false,
      attendance: {
        user_id: userId,
        date: date,
        is_deleted: false,
      },
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.checklistSubmission.findMany({
        where,
        skip,
        take,
        include: this.evidenceInclude,
        orderBy: { created_at: "asc" },
      }),
      this.prisma.checklistSubmission.count({ where }),
    ]);

    return this.buildPaginatedResult(data, total, page, limit);
  }

}


export class PrismaChecklistPhotoRepository
  extends PrismaBaseRepository<ChecklistPhoto, CreateChecklistPhotoDTO, {}, number>
  implements ChecklistPhotoRepository
{
  protected modelName = "checklistPhoto" as const;

  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async findBySubmission(submissionId: number): Promise<ChecklistPhoto[]> {
    return this.prisma.checklistPhoto.findMany({
      where: { submission_id: submissionId, is_deleted: false },
      orderBy: { order: "asc" },
    });
  }

  async countBySubmission(submissionId: number): Promise<number> {
    return this.prisma.checklistPhoto.count({
      where: { submission_id: submissionId, is_deleted: false },
    });
  }
}