// Generates a display alias from a company name, e.g. "PT Sanjaya Abadi" ->
// "PTSA": a token that's already all-uppercase letters (a legal-entity
// prefix like "PT"/"CV") is kept whole, anything else contributes just its
// first letter. Not guaranteed unique -- this is a display label, not a key.
export function generateCompanyCode(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => {
      const letters = word.replace(/[^A-Za-z]/g, '')
      if (!letters) return ''
      const isAllCaps = letters === letters.toUpperCase() && letters !== letters.toLowerCase()
      return isAllCaps ? letters.toUpperCase() : letters[0].toUpperCase()
    })
    .join('')
}
