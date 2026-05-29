import prisma from "../lib/prisma"
import { UserRepository } from "./implementors/user.repository"
import { DivisionRepository } from "./implementors/division.repository";
import { CompanyRepository } from "./implementors/company.repository";
import { AttendanceRepository } from "./implementors/attendance.repository";
// interfaces
export * from "./interfaces/base.interface";
export * from "./interfaces/user.interface";
export * from "./interfaces/division.interface"
export * from "./interfaces/company.interface"
export * from "./interfaces/attendance.interface"


// implementors
export { BaseRepository } from "./implementors/base.repository";
export { UserRepository } from "./implementors/user.repository";
export {DivisionRepository} from "./implementors/division.repository"
export {CompanyRepository} from "./implementors/company.repository"
export {AttendanceRepository} from "./implementors/attendance.repository"


export const userRepository = new UserRepository(prisma)
export const divisionRepository = new DivisionRepository(prisma)
export const companyRepository = new CompanyRepository(prisma)
export const attendanceRepository = new AttendanceRepository(prisma)