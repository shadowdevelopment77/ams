import { EvidencePhoto, Prisma } from "../../../generated/prisma";
import { BaseRepository, PaginatedResult, PaginationParams } from "./base.interface";

export interface CreateEvidencePhotoDTO {
  submission_id: number
  photo_url:     string
  order:         number   // 1, 2, or 3
}



export interface EvidencePhotoFilterParams extends PaginationParams {
  companyId?: number;
  divisionId?: number;
}

export type EvidencePhotoWithSubmission = Prisma.EvidencePhotoGetPayload<{
  include: {
    submission: {
      include: {
        item: { select: { description: true } }
      }
    }
  }
}>

export interface EvidencePhotoRepository
  extends BaseRepository<EvidencePhoto, CreateEvidencePhotoDTO, {}, number> {
  findBySubmission(submissionId: number): Promise<EvidencePhoto[]>;
  countBySubmission(submissionId: number): Promise<number>;
}
