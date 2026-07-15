import {catchAsync} from "../../utils/error.response/catch-async"
import { sendError, sendSuccess } from "../../utils/error.response/response";
import { authService } from "./auth.service";


export class AuthController {


    register = catchAsync(async (req,res) => {

      const result = await authService.register(req.body)
      return sendSuccess(res, result, 'User registered successfully', 201)
    })

    login = catchAsync(async (req,res) => {
      const result = await authService.login(req.body)

  res.cookie('sessionId', result.sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 2, // 2 hours, matches session expiry
  })
      return sendSuccess(res, { user: result.user }, 'Login successful')
    })
    
    logout = catchAsync(async (req,res) => {
      const sessionId = req.cookies.sessionId
      if (!sessionId) return sendError(res, 'No session found', 400)
      await authService.logout(sessionId)
      res.clearCookie('sessionId')
      return sendSuccess(res, null, 'User logged out successfully')

    })
}

export const authController = new AuthController()