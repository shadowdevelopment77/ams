// parse "22:00" → minutes from midnight
export const parseTime = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

// is this a night shift? (end time crosses midnight)
export const isNightShift = (startTime: string, endTime: string): boolean => {
  return parseTime(endTime) < parseTime(startTime)
}

// build actual DateTime from a date + "HH:mm" string
export const toDateTime = (date: Date, time: string): Date => {
  const [hours, minutes] = time.split(':').map(Number)
 const utcDateString = date.toISOString().split('T')[0]
 return new Date(`${utcDateString}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00.000Z`)
}