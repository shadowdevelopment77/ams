import prisma from "../../lib/prisma"
import { CreateDivisionInput, UpdateDivisionInput } from "./division.validation"

export const createDivision = async (input: CreateDivisionInput) => {
  const company = await prisma.company.findUnique({ where: { id: input.company_id } })
  if (!company) throw new Error("Company not found")

  const existing = await prisma.division.findUnique({
    where: { company_id_name: { company_id: input.company_id, name: input.name } },
  })
  if (existing) throw new Error("Division with this name already exists in this company")

  return await prisma.division.create({ data: input })
}

export const updateDivision = async (id: number, input: UpdateDivisionInput) => {
  const division = await prisma.division.findUnique({ where: { id } })
  if (!division) throw new Error("Division not found")

  return await prisma.division.update({ where: { id }, data: input })
}

export const getDivisionsByCompany = async (company_id: number) => {
  return await prisma.division.findMany({
    where: { company_id, is_active: true },
    include: {
      shifts: {
        where: { is_active: true },
        select: { id: true, name: true, start_time: true, end_time: true },
      },
      _count: { select: { user_roles: true } },
    },
  })
}

export const deleteDivision = async (id: number) => {
  const division = await prisma.division.findUnique({ where: { id } })
  if (!division) throw new Error("Division not found")

  const hasStaff = await prisma.userCompanyRole.findFirst({ where: { division_id: id } })
  if (hasStaff) throw new Error("Cannot delete division that still has staff assigned")

  return await prisma.division.update({
    where: { id },
    data: { is_active: false },
  })
}