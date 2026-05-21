import { Request, Response } from "express"
import * as AuthService from "./auth.service"
import { registerSchema, loginSchema } from "./auth.validation"
import { sendSuccess, sendError } from "../../utils/response"

export const register = async (req: Request, res: Response) => {
  try {
    const parsed = registerSchema.safeParse(req.body)
    if (!parsed.success) {
      return sendError(res, "Validation failed", 400, parsed.error.issues)
    }

    const user = await AuthService.register(parsed.data)
    return sendSuccess(res, user, "Registration successful", 201)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Registration failed"
    return sendError(res, message, 400)
  }
}

export const login = async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) {
      return sendError(res, "Validation failed", 400, parsed.error.issues)
    }

    const result = await AuthService.login(parsed.data)

   
    res.cookie("session_id", result.session_id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: result.expires_at,
    })

    return sendSuccess(res, { user: result.user }, "Login successful")
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Login failed"
    return sendError(res, message, 401)
  }
}

export const logout = async (req: Request, res: Response) => {
  try {
    const sessionId = req.cookies?.session_id
    if (sessionId) await AuthService.logout(sessionId)

    res.clearCookie("session_id")
    return sendSuccess(res, null, "Logout successful")
  } catch (error: unknown) {
    return sendError(res, "Logout failed", 500)
  }
}

export const getMe = async (req: Request, res: Response) => {
  try {
    const sessionId = req.cookies?.session_id
    if (!sessionId) return sendError(res, "Unauthorized", 401)

    const user = await AuthService.getMe(sessionId)
    return sendSuccess(res, user, "User fetched successfully")
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unauthorized"
    return sendError(res, message, 401)
  }
}