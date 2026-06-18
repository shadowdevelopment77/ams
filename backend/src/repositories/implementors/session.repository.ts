import { PrismaClient } from "../../../generated/prisma";
import { CreateSessionDTO, SessionRepository } from "../interfaces/session.interface";

export class PrismaSessionRepository implements SessionRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: CreateSessionDTO) {
    return this.prisma.session.create({ data });
  }

  async findById(id: string) {
    return this.prisma.session.findUnique({ where: { id } });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.session.delete({ where: { id } }).catch(() => {});
  }

  async deleteByUser(userId: number): Promise<void> {
    await this.prisma.session.deleteMany({ where: { user_id: userId } });
  }

  async deleteExpired(): Promise<number> {
    const result = await this.prisma.session.deleteMany({
      where: { expires_at: { lt: new Date() } },
    });
    return result.count;
  }
}
