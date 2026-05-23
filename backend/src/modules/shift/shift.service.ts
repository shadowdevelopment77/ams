import prisma from "../../lib/prisma"
import { CreateShiftInput, UpdateShiftInput } from "./shift.validation"


export const createShift = async (input: CreateShiftInput) => {
  const division = await prisma.division.findUnique({ where: { id: input.division_id } })
  if (!division) throw new Error("Division not found")
  if (division.company_id !== input.company_id) throw new Error("Division does not belong to this company")

  return await prisma.shift.create({
    data: {
     division_id: input.division_id,
      company_id: input.company_id,
      name: input.name,
      start_time: input.start_time,   
      end_time: input.end_time,       
      notify_before_minutes: input.notify_before_minutes,
    },
  })
}

export const updateShift = async (id: number, input: UpdateShiftInput) => {
  const shift = await prisma.shift.findUnique({ where: { id } })
  if (!shift) throw new Error("Shift not found")

  return await prisma.shift.update({
    where: { id },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.start_time && { start_time: input.start_time }), // plain string, no conversion
      ...(input.end_time && { end_time: input.end_time }),
      ...(input.notify_before_minutes && { notify_before_minutes: input.notify_before_minutes }),
    },
  })
}

export const getShiftsByDivision = async (division_id: number, user_id: number) => {
    const division = await prisma.division.findUnique({ where: { id: division_id }, select: { company_id: true } })
  if (!division) throw new Error("Division not found")
    
 const userRole = await prisma.userCompanyRole.findFirst({
    where: { user_id, company_id: division.company_id }
  })
  if (!userRole) throw new Error("division not found") 
  return await prisma.shift.findMany({
    where: { division_id, is_active: true },
    include: {
      _count: { select: { attendances: true } },
    },
  })
}

export const deleteShift = async (id: number) => {
  const shift = await prisma.shift.findUnique({ where: { id } })
  if (!shift) throw new Error("Shift not found")

  return await prisma.shift.update({ where: { id }, data: { is_active: false } })
}