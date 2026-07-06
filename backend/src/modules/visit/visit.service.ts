import { visitLogRepository, companyRepository, userRepository } from '../../repositories/index.repositories'
import { CreateVisitLogInput } from './visit.validation'
import { AppError } from '../../utils/error.response/appError'
import { reverseGeocode } from '../../utils/geocode'
import { PaginationParams } from '../../repositories/interfaces/base.interface'

export class VisitLogService {

//helper

private async getUserOrThrow(userId: string) {
  const user = await userRepository.findById(userId)
  if (!user) throw new AppError('User not found', 404)
  return user
}


  private async getCompanyOrThrow(companyId: number) {
    const company = await companyRepository.findById(companyId)
    if (!company) throw new AppError('Company not found', 404)
    return company
  }

  private async getLocation(lat?: number, lng?: number) {
    return lat && lng ? await reverseGeocode(lat, lng) : undefined
  }

  
  async create(
    userId:   string,
    photoUrl: string,
    dto:      CreateVisitLogInput
  ) {
    await this.getCompanyOrThrow(dto.company_id)

    const today   = new Date()
    const date    = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const address = await this.getLocation(dto.latitude, dto.longitude)

    return visitLogRepository.create({
      user_id:          userId,
      company_id:       dto.company_id,
      photo_url:        photoUrl,
      date:             date,
      latitude:         dto.latitude,
      longitude:        dto.longitude,
      location_addres:  address,
      notes:            dto.notes,
      visited_at:       today,
    })
  }

  async getVisitPhotos(userId: string, date: Date, params: PaginationParams){
    await this.getUserOrThrow(userId)
    const result = await visitLogRepository.findByUser(userId, date, params)

    return {
        ...result,
        data: result.data.map(a => ({
        company_id: a.company_id,
        visit_photo: a.photo_url,
        visited_at: a.visited_at,
        notes: a.notes,
        }))
    }
  }

  async getByUser(
    userId: string,
    date:   Date,
    params: PaginationParams
  ) {
    return visitLogRepository.findByUser(userId, date, params)
  }

  async getAll(params: PaginationParams) {
    return visitLogRepository.findAll(params)
  }

  async delete(id: number) {
    const log = await visitLogRepository.findById(id)
    if (!log) throw new AppError('Visit log not found', 404)
    return visitLogRepository.softDelete(id)
  }
}

export const visitLogService = new VisitLogService()