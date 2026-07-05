import {shiftRepository, companyRepository, divisionRepository} from "../../repositories/index.repositories"
import { CreateShiftInput, UpdateShiftInput } from "./shift.validation"
import { AppError } from "../../utils/error.response/appError"



export class ShiftService {
   private async getShiftOrThrow(id: number) {
    const shift = await shiftRepository.findById(id)
    if (!shift) throw new AppError('Shift not found', 404)
    return shift
  }

  private async validateCompanyAndDivision(companyId: number, divisionId: number) {
    const company = await companyRepository.findById(companyId)
    if (!company) throw new AppError('Company not found', 404)

    const division = await divisionRepository.findById(divisionId)
    if (!division) throw new AppError('Division not found', 404)

    // make sure division belongs to company
    if (division.company_id !== companyId) {
      throw new AppError('Division does not belong to this company', 400)
    }
  }

  private async checkDuplicateName(name: string, companyId: number, divisionId: number) {
    const shifts = await shiftRepository.findShift(companyId, divisionId)
    const duplicate = shifts.find(
      s => s.name.toLowerCase() === name.toLowerCase() && !s.is_deleted
    )
    if (duplicate) throw new AppError('Shift name already exists in this division', 409)
  }




  async getAll(companyId: number, divisionId: number){
    if (isNaN(companyId) || !companyId) throw new AppError('Company is required', 400)
  if (isNaN(divisionId) || !divisionId) throw new AppError('Division is required', 400)

    return shiftRepository.findShift(companyId, divisionId)
  }


  async getById(id: number) {
    return this.getShiftOrThrow(id)
  }


  async create(data: CreateShiftInput) {
    await this.validateCompanyAndDivision(data.company_id, data.division_id)
    await this.checkDuplicateName(data.name, data.company_id, data.division_id)
    return shiftRepository.create(data)
  }

  async update (id: number, data: UpdateShiftInput) {
    const shift = await this.getShiftOrThrow(id)
    if (data.name && data.name !== shift.name) {
      await this.checkDuplicateName(data.name, shift.company_id, shift.division_id)
    }
    return shiftRepository.update(id, data)
  }

  async delete (id: number) {
    await this.getShiftOrThrow(id)
    return shiftRepository.softDelete(id)
  }

}
export const shiftService = new ShiftService()