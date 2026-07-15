// src/utils/date.ts
export const getToday = () => {
  const today = new Date()
  const utcDateString = today.toISOString().split('T')[0]
  const date = new Date(`${utcDateString}T00:00:00.000Z`)
  return { today, date }
}