import { VisitLog, PrismaClient } from "../../../generated/prisma";
import { PrismaBaseRepository } from "./base.repository";
import {
  CreateVisitLogDTO,
  UpdateVisitLogDTO,
  VisitLogRepository,
} from "../interfaces/visit-log.interface";
import { PaginationParams, PaginatedResult } from "../interfaces/base.interface";


export class PrismaVisitLogRepository
  extends PrismaBaseRepository<VisitLog, CreateVisitLogDTO, UpdateVisitLogDTO>
  implements VisitLogRepository
{
  protected modelName = "visitLog" as const;

  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async findByUser(
    userId: string,
    date: Date,
    params?: PaginationParams,
  ): Promise<PaginatedResult<VisitLog>> {
    const { skip, take, page, limit } = this.resolvePagination(params);
    const where = { user_id: userId, date: date, is_deleted: false };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.visitLog.findMany({
        where,
        skip,
        take,
        orderBy: { visited_at: "desc" },
        include: { company: { select: { id: true, name: true } } },
      }),
      this.prisma.visitLog.count({ where }),
    ]);

    return this.buildPaginatedResult(data, total, page, limit);
  }

}
