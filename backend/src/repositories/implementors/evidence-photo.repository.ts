import { EvidencePhoto, PrismaClient } from "../../../generated/prisma";
import { PrismaBaseRepository } from "./base.repository";
import {
  CreateEvidencePhotoDTO,
  EvidencePhotoFilterParams,
  EvidencePhotoRepository,
} from "../interfaces/evidence-photo.interface";
import { PaginatedResult } from "../interfaces/base.interface";


export class PrismaEvidencePhotoRepository
  extends PrismaBaseRepository<EvidencePhoto, CreateEvidencePhotoDTO, {}>
  implements EvidencePhotoRepository
{
  protected modelName = "evidencePhoto" as const;

  constructor(prisma: PrismaClient) {
    super(prisma);
  }

  async findBySubmission(submissionId: number): Promise<EvidencePhoto[]> {
    return this.prisma.evidencePhoto.findMany({
      where: { submission_id: submissionId, is_deleted: false },
      orderBy: { created_at: "asc" },
    });
  }

  async countBySubmission(submissionId: number): Promise<number> {
    return this.prisma.evidencePhoto.count({
      where: { submission_id: submissionId, is_deleted: false },
    });
  }

}
