import { PrismaClient } from "../../generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"
import * as pg from "pg"
import dotenv from "dotenv"

dotenv.config()

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL!,
})

const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({ adapter })

// prisma.$disconnect() doesn't close the underlying pg.Pool (built externally
// and passed into the adapter) -- use this instead, not $disconnect() alone.
export async function disconnectPrisma() {
  await prisma.$disconnect()
  await pool.end()
}

export default prisma