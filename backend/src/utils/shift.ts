export const parseTime = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export const isNightShift = (startTime: string, endTime: string): boolean => {
  return parseTime(endTime) < parseTime(startTime)
}

export const toDateTime = (date: Date, time: string): Date => {
  const [hours, minutes] = time.split(':').map(Number)
 const utcDateString = date.toISOString().split('T')[0]
 return new Date(`${utcDateString}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00.000Z`)
}