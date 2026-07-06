import express from "express"
import cors from "cors"
import helmet from "helmet"
import dotenv from "dotenv"
import authRouter from "./modules/auth/auth.router"
import cookieParser from "cookie-parser"
import userRouter from "./modules/user/user.router"
import divisionRouter from "./modules/division/division.router"
import shiftRouter from "./modules/shift/shift.router"
import attendanceRouter from "./modules/attendance/attendance.router"
import checklistRouter from "./modules/checklist/checklist.router"
import companyRouter from "./modules/company/company.route"
import { errorMiddleware } from "./middlewares/error.middleware";
import {apiLimiter, authLimiter} from "./middlewares/rate-limit.middleware";

dotenv.config()

const app = express()



app.use(helmet())
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())
app.use(errorMiddleware) // Error handling middleware should be registered after all routes
app.use('/api', apiLimiter)

app.use("/api/auth", authRouter, authLimiter)
app.use("/api/users", userRouter)
app.use("/api/divisions", divisionRouter)
app.use("/api/shifts", shiftRouter)
app.use("/api/attendance", attendanceRouter)
app.use("/api/checklist", checklistRouter)
app.use("/api/company", companyRouter)


export default app