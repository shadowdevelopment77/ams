import {Shift} from "../../../generated/prisma"
import {BaseRepository} from "./base.interface"

export interface CreateShiftDTO{
    division_id: number;
    company_id: number;
    name: string;
    start_time: string;
    end_time: string;
}


export interface UpdateShiftDTO{
    name?: string;
    start_time?: string;
    end_time?: string;
    is_active: boolean;
}

export interface ShiftRepository extends BaseRepository<Shift, CreateShiftDTO, UpdateShiftDTO> {
    findShift(companyId: number, divisionId: number): Promise<Shift[]>;
}