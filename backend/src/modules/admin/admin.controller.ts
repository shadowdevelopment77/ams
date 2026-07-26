import { catchAsync } from '../../utils/error.response/catch-async'
import { sendSuccess } from '../../utils/error.response/response'
import { resetDemo } from './admin.service'

export class AdminController {
  resetDemo = catchAsync(async (req, res) => {
    const result = await resetDemo()
    return sendSuccess(res, result, 'Demo data reset successfully')
  })
}

export const adminController = new AdminController()
