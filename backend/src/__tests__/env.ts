// Loaded via jest.config.js `setupFiles` — runs before the test framework
// itself is installed, so this is the earliest point env vars can be set.
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../.env.test') })