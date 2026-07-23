import bcrypt from "bcryptjs";
import {userRepository, sessionRepository, roleRepository, divisionRepository} from '../../repositories/index.repositories'
import { AppError } from "../../utils/error.response/appError";
import { RegisterInput, LoginInput } from "./auth.validation";


export class AuthService {
   async register(data: RegisterInput) {
    // check duplicate email
    const existing = await userRepository.findByEmail(data.email)
    if (existing) throw new AppError('Email already registered', 409)

    // check role exists
    const role = await roleRepository.findByName(data.role)
    if (!role) throw new AppError('Role not found', 404)

    if (data.company_id && data.division_id) {
    const division = await divisionRepository.findById(data.division_id)
    if (!division) throw new AppError('Division not found', 404)
    if (division.company_id !== data.company_id) {
      throw new AppError('Division does not belong to the specified company', 400)
    }
  }

    // hash password
    const hashed = await bcrypt.hash(data.password, 10)


    // create user
    const user = await userRepository.create({
      name:      data.name,
      email:     data.email,
      password:  hashed,
      phone:     data.phone,
    })


    // assign role
    await userRepository.createCompanyRole({
      user_id:     user.id,
      role_id:     role.id,
      company_id:  data.company_id  ?? null,
      division_id: data.division_id ?? null,
    })

    return {
      id:    user.id,
      name:  user.name,
      email: user.email,
    }
  }

  async login(data: LoginInput) {
    // find user
    const user = await userRepository.findByEmail(data.email)
    if (!user) throw new AppError('Invalid email or password', 401)

    // check active
    if (!user.is_active) throw new AppError('Account is inactive', 403)

    // check password
    const isValid = await bcrypt.compare(data.password, user.password)
    if (!isValid) throw new AppError('Invalid email or password', 401)

    // get role
    const roleResult = await userRepository.findRoleByUserId(user.id)
    const companyRole = roleResult.data[0]
    if (!companyRole) throw new AppError('User has no role assigned', 403)

    // create session
    const session = await sessionRepository.create({
      user_id:    user.id,
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 2), // 2 hours
    })

    return {
      sessionId: session.id,
      user: {
        id:    user.id,
        name:  user.name,
        email: user.email,
        role:  companyRole.userRole.name,
      }
    }
  }

  async logout(sessionId: string) {
    await sessionRepository.delete(sessionId)
  }

  async getMe(userId: string) {
    const user = await userRepository.findById(userId)
    if (!user) throw new AppError('User not found', 404)

    const roleResult = await userRepository.findRoleByUserId(userId)
    const companyRole = roleResult.data[0]
    if (!companyRole) throw new AppError('User has no role assigned', 403)

    return {
      id:         user.id,
      name:       user.name,
      email:      user.email,
      phone:      user.phone,
      role:       companyRole.userRole.name,
      companyId:  companyRole.company_id  ?? undefined,
      divisionId: companyRole.division_id ?? undefined,
    }
  }
}

export const authService = new AuthService()