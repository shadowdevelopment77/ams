import express from "express"
import cors from "cors"
import helmet from "helmet"
import dotenv from "dotenv"
import authRouter from "./modules/auth/auth.router"
import cookieParser from "cookie-parser"

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000


app.use(helmet())
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

app.get("/health", (req, res) => {
  res.json({ success: true, message: "Server is running" })
})

app.use("/api/auth", authRouter)


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

export default app