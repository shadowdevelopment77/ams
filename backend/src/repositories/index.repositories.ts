import prisma from "../lib/prisma"
import { UserRepository } from "./implementors/user.repository"
// interfaces
export * from "./interfaces/base.interface";
export * from "./interfaces/user.interface";

// implementors
export { BaseRepository } from "./implementors/base.repository";
export { UserRepository } from "./implementors/user.repository";

export const userRepository = new UserRepository(prisma)