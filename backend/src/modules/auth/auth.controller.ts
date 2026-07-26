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

  // sameSite must be 'none' (not 'lax') for a cross-site prod deploy
  // (frontend/backend on different domains) -- 'none' requires 'secure'
  // to be true too, browsers reject the combination otherwise.
  const isProd = process.env.NODE_ENV === 'production'
  res.cookie('sessionId', result.sessionId, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 1000 * 60 * 60 * 2, // must match auth.service.ts's session expires_at
  })
      return sendSuccess(res, { user: result.user }, 'Login successful')
    })

    logout = catchAsync(async (req,res) => {
      const sessionId = req.cookies.sessionId
      if (!sessionId) return sendError(res, 'No session found', 400)
      await authService.logout(sessionId)
      const isProd = process.env.NODE_ENV === 'production'
      res.clearCookie('sessionId', { httpOnly: true, secure: isProd, sameSite: isProd ? 'none' : 'lax' })
      return sendSuccess(res, null, 'User logged out successfully')

    })

    me = catchAsync(async (req, res) => {
      const result = await authService.getMe(req.user!.id)
      return sendSuccess(res, result, 'Current user fetched')
    })
}

export const authController = new AuthController()