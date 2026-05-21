import express from "express"
import cors from "cors"
import helmet from "helmet"
import dotenv from "dotenv"

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000


app.use(helmet())
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.get("/health", (req, res) => {
  res.json({ success: true, message: "Server is running" })
})



app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

export default app