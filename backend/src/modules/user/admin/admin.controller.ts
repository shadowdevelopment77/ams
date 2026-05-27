import { Request, Response } from "express"
import * as AdminService from "./admin.service"
import { assignCompanySchema, removeCompanySchema, moveCompanySchema, createCompanySchema} from "./admin.validation"
import { sendSuccess, sendError } from "../../../utils/response"

export const assignUserToCompany = async (req: Request, res: Response) => {
  try {
    const parsed = assignCompanySchema.safeParse(req.body)
    if (!parsed.success) return sendError(res, "Validation failed", 400, parsed.error.issues)

    const result = await AdminService.assignUserToCompany(parsed.data)
    return sendSuccess(res, result, "User assigned to company successfully")
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Assignment failed"
    return sendError(res, message, 400)
  }
}

export const removeUserFromCompany = async (req: Request, res: Response) => {
  try {
    const parsed = removeCompanySchema.safeParse(req.body)
    if (!parsed.success) return sendError(res, "Validation failed", 400, parsed.error.issues)

    const result = await AdminService.removeUserFromCompany(parsed.data)
    return sendSuccess(res, result, "User removed from company successfully")
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Removal failed"
    return sendError(res, message, 400)
  }
}

export const getInternalUsers = async (req: Request, res: Response) => {
  try {
    const users = await AdminService.getInternalUsers()
    return sendSuccess(res, users, "Internal users fetched successfully")
  } catch (error: unknown) {
    return sendError(res, "Failed to fetch users", 500)
  }
}


export const moveUserToCompany = async (req: Request, res: Response) => {
  try {
    const parsed = moveCompanySchema.safeParse(req.body)
    if (!parsed.success) return sendError(res, "Validation failed", 400, parsed.error.issues)

    const result = await AdminService.moveUserToCompany(parsed.data)
    return sendSuccess(res, result, "User moved to new company successfully")
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Move failed"
    return sendError(res, message, 400)
  }
}

export const getUsersByCompanies = async (req: Request, res: Response) => {
  try {
    const company_id = parseInt(req.params.company_id as string)
    if (isNaN(company_id)) return sendError(res, "Invalid company ID", 400)

    const users = await AdminService.getUsersByCompanies(company_id)
    return sendSuccess(res, users, "Users fetched successfully")
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch users"
    return sendError(res, message, 400)
  }
}

export const removeUser = async (req: Request, res: Response) => {
  try {
    const user_id = parseInt(req.params.user_id as string)
    if (isNaN(user_id)) return sendError(res, "Invalid user ID", 400)

    const result = await AdminService.removeUser({ user_id })
    return sendSuccess(res, result, "User deleted successfully")
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete user"
    return sendError(res, message, 400)
  }
}

export const createCompany = async (req: Request, res: Response) => {
  try{
    const parsed = createCompanySchema.safeParse(req.body)
    if (!parsed.success) return sendError (res, "Validation failed", 400, parsed.error.issues)
      const result = await AdminService.createCompany(parsed.data)
    return sendSuccess(res, result, "Company created successfully", 201)
  } catch (error: unknown){
    const message = error instanceof Error ? error.message : "Failed to create company"
    return sendError(res, message, 400)
  }
}