export const reverseGeocode = async (
  lat: number,
  lng: number
): Promise<string> => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'User-Agent': 'AMS-App/1.0' } }
    )
    if (!res.ok) return 'Location unavailable'
    const data = await res.json() as { display_name?: string }
    return data.display_name ?? 'Location unavailable'
  } catch {
    return 'Location unavailable'
  }
}