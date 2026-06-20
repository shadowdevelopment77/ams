import prisma from "../lib/prisma";
import { PrismaUserRepository } from "./implementors/user.repository";
import { PrismaDivisionRepository } from "./implementors/division.repository";
import { PrismaCompanyRepository } from "./implementors/company.repository";
import { PrismaAttendanceRepository } from "./implementors/attendance.repository";
import { PrismaRoleRepository } from "./implementors/role.repository";
import { PrismaShiftRepository } from "./implementors/shift.repository";
import {
  PrismaChecklistTemplateRepository,
  PrismaChecklistItemRepository,
  PrismaChecklistSubmissionRepository,
} from "./implementors/checklist.repository";
import { PrismaVisitLogRepository } from "./implementors/visit-log.repository";
import { PrismaEvidencePhotoRepository } from "./implementors/evidence-photo.repository";
import { PrismaSessionRepository } from "./implementors/session.repository";
import {
  PrismaAttendanceStatusRepository,
  PrismaSubmissionStatusRepository
} from "./implementors/status.repository";



// interfaces
export * from "./interfaces/base.interface";
export * from "./interfaces/user.interface";
export * from "./interfaces/division.interface";
export * from "./interfaces/company.interface";
export * from "./interfaces/attendance.interface";
export * from "./interfaces/role.interface";
export * from "./interfaces/shift.interface";
export * from "./interfaces/checklist.interface";
export * from "./interfaces/visit-log.interface";
export * from "./interfaces/evidence-photo.interface";
export * from "./interfaces/session.interface";
export * from "./interfaces/status.interface";


// implementors
export { PrismaBaseRepository } from "./implementors/base.repository";
export { PrismaUserRepository } from "./implementors/user.repository";
export { PrismaDivisionRepository } from "./implementors/division.repository";
export { PrismaCompanyRepository } from "./implementors/company.repository";
export { PrismaAttendanceRepository } from "./implementors/attendance.repository";
export { PrismaRoleRepository } from "./implementors/role.repository";
export { PrismaShiftRepository } from "./implementors/shift.repository";
export {
  PrismaChecklistTemplateRepository,
  PrismaChecklistItemRepository,
  PrismaChecklistSubmissionRepository,
} from "./implementors/checklist.repository";
export { PrismaVisitLogRepository } from "./implementors/visit-log.repository";
export { PrismaEvidencePhotoRepository } from "./implementors/evidence-photo.repository";
export { PrismaSessionRepository } from "./implementors/session.repository";
export {
  PrismaAttendanceStatusRepository,
  PrismaSubmissionStatusRepository
} from "./implementors/status.repository";



// singleton instances
export const userRepository = new PrismaUserRepository(prisma);
export const divisionRepository = new PrismaDivisionRepository(prisma);
export const companyRepository = new PrismaCompanyRepository(prisma);
export const attendanceRepository = new PrismaAttendanceRepository(prisma);
export const roleRepository = new PrismaRoleRepository(prisma);
export const shiftRepository = new PrismaShiftRepository(prisma);
export const checklistTemplateRepository = new PrismaChecklistTemplateRepository(prisma);
export const checklistItemRepository = new PrismaChecklistItemRepository(prisma);
export const checklistSubmissionRepository = new PrismaChecklistSubmissionRepository(prisma);
export const visitLogRepository = new PrismaVisitLogRepository(prisma);
export const evidencePhotoRepository = new PrismaEvidencePhotoRepository(prisma);
export const sessionRepository = new PrismaSessionRepository(prisma);
export const attendanceStatusRepository = new PrismaAttendanceStatusRepository(prisma);
export const SubmissionStatusRepository = new PrismaSubmissionStatusRepository(prisma);