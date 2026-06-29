declare global {
  namespace Express {
    interface Request {
      user?: {
        id:          string
        role:        string
        companyId?:  number
        divisionId?: number
      }
      sessionId?: string
    }
  }
}

export {}