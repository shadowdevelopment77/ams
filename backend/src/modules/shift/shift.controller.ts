
import {shiftService} from "./shift.service"
import {catchAsync} from "../../utils/error.response/catch-async"
import { sendSuccess } from "../../utils/error.response/response"



export class ShiftController {

getAll = catchAsync(async (req, res) => {
    const companyId  = Number(req.user!.companyId)
    const divisionId = Number(req.user!.divisionId)


    const result = await shiftService.getAll(companyId, divisionId)
    return sendSuccess(res, result, 'Shifts fetched')
  })

  getById = catchAsync(async (req, res) => {
    const result = await shiftService.getById(Number(req.params.id))
    return sendSuccess(res, result, 'Shift fetched')
  })

  create = catchAsync(async (req, res) => {
    const result = await shiftService.create(req.body)
    return sendSuccess(res, result, 'Shift created', 201)
  })

  update = catchAsync(async (req, res) => {
    const result = await shiftService.update(Number(req.params.id), req.body)
    return sendSuccess(res, result, 'Shift updated')
  })

  delete = catchAsync(async (req, res) => {
    await shiftService.delete(Number(req.params.id))
    return sendSuccess(res, null, 'Shift deleted')
  })

  // staff gets available shifts for their division

}

export const shiftController = new ShiftController()