import {Shift , PrismaClient} from "../../../generated/prisma"
import {ShiftRepository, CreateShiftDTO, UpdateShiftDTO} from "../interfaces/shift.interface"
import {PrismaBaseRepository} from "./base.repository"


export class PrismaShiftRepository extends PrismaBaseRepository<Shift, CreateShiftDTO, UpdateShiftDTO> implements ShiftRepository {
    protected modelName = "shift" as const;

    constructor(prisma: PrismaClient) {
        super(prisma);
    }

    async findShift(companyId: number, divisionId: number): Promise<Shift[]> {
        return this.prisma.shift.findMany({
            where: { company_id: companyId, division_id: divisionId, is_deleted: false },
            orderBy: { id: "asc" },
        });
    }

}
