import {z} from "zod"

export const registerSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.email("Invalid email format"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    phone: z.string().optional(),
    division_id: z.number({error: "Division is required"}),
    company_id: z.number({error: "Company is required"}),
    role: z.enum(["STAFF","SUPERVISOR", "ADMIN", "CLIENT"]),
    })

    export const loginSchema = z.object({
        email: z.email("Invalid email format"),
        password: z.string().min(1, "Password is required"),
    })

    export type RegisterInput = z.infer<typeof registerSchema>
    export type LoginInput = z.infer<typeof loginSchema>