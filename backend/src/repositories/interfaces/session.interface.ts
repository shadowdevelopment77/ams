import { Session } from "../../../generated/prisma";

export interface CreateSessionDTO {
  user_id: string;
  expires_at: Date;
}

export interface SessionRepository {
  create(data: CreateSessionDTO): Promise<Session>;
  findById(id: string): Promise<Session | null>;
  delete(id: string): Promise<void>;
  deleteByUser(userId: string): Promise<void>;
  deleteExpired(): Promise<number>;
}
