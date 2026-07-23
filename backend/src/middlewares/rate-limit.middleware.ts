import rateLimit from 'express-rate-limit'

const isTest = process.env.NODE_ENV === 'test'


export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {success: false, message: 'Too many request, please try again later'},
    standardHeaders: true,
    legacyHeaders: false,
     skip: () => isTest, 
})


export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max:      10,              
  message:  { success: false, message: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders:   false,
  skip: () => isTest,     
})