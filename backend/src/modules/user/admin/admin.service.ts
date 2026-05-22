
import prisma from "../../../lib/prisma"
import { AssignCompanyInput, RemoveCompanyInput, MoveCompanyInput } from "./admin.validation"

// Assign ADMIN AND SUPERVISOR to a company
export const assignUserToCompany = async (input: AssignCompanyInput) => {
  const user = await prisma.user.findUnique({ where: { id: input.user_id } })
  if (!user) throw new Error("User not found")

  const company = await prisma.company.findUnique({ where: { id: input.company_id } })
  if (!company) throw new Error("Company not found")

  const existing = await prisma.userCompanyRole.findUnique({
    where: {
      user_id_company_id: {
        user_id: input.user_id,
        company_id: input.company_id,
      },
    },
  })
  if (existing) throw new Error("User already assigned to this company")

  const isStaff = await prisma.userCompanyRole.findFirst({
    where: { user_id: input.user_id, role: "STAFF" },
  })
  if (isStaff) throw new Error("Staff Cannot be assigned to multiple companies")

  return await prisma.userCompanyRole.create({
    data: {
      user_id: input.user_id,
      company_id: input.company_id,
      role: input.role,
      division_id: null,
    },
    include: { company: true },
  })
}

//STAFF ONLY
export const moveUserToCompany = async (input: MoveCompanyInput) => {
  const user = await prisma.user.findUnique({ where: { id: input.user_id } })
  if (!user) throw new Error("User not found")

  const company = await prisma.company.findUnique({ where: { id: input.company_id } })
  if (!company) throw new Error("Company not found")

    const division = await prisma.division.findUnique({ where: { id: input.division_id } })
  if (!division) throw new Error("Division not found")
  if (division.company_id !== input.company_id)
    throw new Error("Division does not belong to the specified company")

  const existing = await prisma.userCompanyRole.findFirst({
    where: { user_id: input.user_id, role: "STAFF" },
  })
  if (!existing) throw new Error("User is not a STAFF member")

  // just update in place — same row, new values
  return await prisma.userCompanyRole.update({
    where: {
      user_id_company_id: {
        user_id: input.user_id,
        company_id: existing.company_id, // their current company
      },
    },
    data: {
      company_id: input.company_id,   // new company
      division_id: input.division_id, // new division
    },
    include: { company: true, division: true },
  })
}

// Remove from a company
export const removeUserFromCompany = async (input: RemoveCompanyInput) => {
  const existing = await prisma.userCompanyRole.findUnique({
    where: {
      user_id_company_id: {
        user_id: input.user_id,
        company_id: input.company_id,
      },
    },
  })
  if (!existing) throw new Error("Assignment not found")

  await prisma.userCompanyRole.delete({
    where: {
      user_id_company_id: {
        user_id: input.user_id,
        company_id: input.company_id,
      },
    },
  })

  return { message: "User removed from company" }
}

// Get all internal users (ADMIN/SUPERVISOR) with their assigned companies
export const getInternalUsers = async () => {
  return await prisma.user.findMany({
    where: {
      is_deleted: false,
      NOT: {
        company_roles: {
          some: { role: "STAFF" } // exclude pure staff accounts
        }
      }
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      is_active: true,
      company_roles: {
        select: {
          role: true,
          company: { select: { id: true, name: true } },
        },
      },
    },
  })
}

export const getUsersByCompanies = async (company_id: number) => {
   const company = await prisma.company.findUnique({ where: { id: company_id } })
  if (!company) throw new Error("Company not found")

  return await prisma.userCompanyRole.findMany({
    where: { company_id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          photo_url: true,
          is_active: true,
        },
      },
      division: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })
}