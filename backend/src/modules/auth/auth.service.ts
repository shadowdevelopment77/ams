import bcrypt from "bcryptjs"
import crypto from "crypto"
import prisma from "../../lib/prisma"
import { RegisterInput, LoginInput } from "./auth.validation"

export const register = async (input: RegisterInput) => {
  
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
  })
  if (existing) throw new Error("Email already registered")


  if (input.role === "STAFF" ) {
    if (!input.company_id) throw new Error("Staff must belong to a company")
    if (!input.division_id) throw new Error("Staff must have a division")

      const company = await prisma.company.findUnique({
    where: { id: input.company_id },
  })
  if (!company) throw new Error("Company not found")

    const division = await prisma.division.findUnique({
      where: { id: input.division_id },
    })
    if (!division) throw new Error("Division not found")
    if (division.company_id !== input.company_id)
      throw new Error("Division does not belong to the specified company")
  }

  if (input.role === "CLIENT"){
    if (!input.company_id) throw new Error("Client must belong to a company")

    const company = await prisma.company.findUnique({
      where: { id: input.company_id },
    })
    if (!company) throw new Error("Company not found")
  }

  // ADMIN/SUPERVISOR/CLIENT — no division needed
  if ((input.role === "ADMIN" || input.role === "SUPERVISOR") && (input.division_id || input.company_id)) {
    throw new Error("Admin and Supervisor do not belong to a division or company")
  }

  const hashedPassword = await bcrypt.hash(input.password, 12)

  
  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        name: input.name,
        email: input.email,
        password: hashedPassword,
        phone: input.phone,
      },
    })

    // Only create UserCompanyRole for STAFF at register time
    if (input.role === "STAFF") {
      await tx.userCompanyRole.create({
        data: {
          user_id: newUser.id,
          company_id: input.company_id!,
          role: input.role,
          division_id: input.division_id!,
        },
      })
    }

    if (input.role === "CLIENT") {
      await tx.userCompanyRole.create({
        data: {
          user_id: newUser.id,
          company_id: input.company_id!,
          role: input.role,
          division_id: null,
        },
      })
    }

    return newUser
  })

  
  const { password: _, ...userWithoutPassword } = user
  return userWithoutPassword
}

export const login = async (input: LoginInput) => {
  
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: {
      company_roles: {
        include: { company: true, 
          division: true,
        },
      },
    },
  })

  
  if (!user) throw new Error("Invalid email or password")
  if (!user.is_active) throw new Error("Account is deactivated")
  if (user.is_deleted) throw new Error("Invalid email or password")

  const isMatch = await bcrypt.compare(input.password, user.password)
  if (!isMatch) throw new Error("Invalid email or password")


  const sessionId = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24) // 24 jam

  await prisma.session.create({
    data: {
      id: sessionId,
      user_id: user.id,
      expires_at: expiresAt,
    },
  })

  
  const { password: _, ...userWithoutPassword } = user
  return {
    session_id: sessionId,
    expires_at: expiresAt,
    user: userWithoutPassword,
  }
}

export const logout = async (sessionId: string) => {
  await prisma.session.delete({
    where: { id: sessionId },
  }).catch(() => {
    // nothing to do if session already deleted/expired
  })
}

export const getMe = async (sessionId: string) => {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  })

  if (!session) throw new Error("Unauthorized")
  if (session.expires_at < new Date()) {
    await prisma.session.delete({ where: { id: sessionId } })
    throw new Error("Session expired - please login again")
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user_id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      photo_url: true,
      is_active: true,
      company_roles: {
        include: { company: true, division: true },
      },
    },
  })

  if (!user) throw new Error("User not found")
  return user
}