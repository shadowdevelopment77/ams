import prisma from "../lib/prisma"
import { UserRepository } from "./implementors/user.repository"
import { DivisionRepository } from "./implementors/division.repository";

// interfaces
export * from "./interfaces/base.interface";
export * from "./interfaces/user.interface";
export * from "./interfaces/division.interface"

// implementors
export { BaseRepository } from "./implementors/base.repository";
export { UserRepository } from "./implementors/user.repository";
export {DivisionRepository} from "./implementors/division.repository"


export const userRepository = new UserRepository(prisma)
export const divisionRepository = new DivisionRepository(prisma)