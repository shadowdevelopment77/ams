export interface Coordinates {
  latitude: number
  longitude: number
}

// GPS is mandatory for check-in/check-out/visit-log (integrity requirement,
// same rationale as the mobile-only device gate) -- wraps the callback-based
// browser API in a Promise so callers can just await it and treat any
// rejection as "block the submission".
export function getCurrentPosition(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Your browser does not support location access.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
      },
      () => {
        reject(new Error('Location access is required. Please enable GPS/location permissions and try again.'))
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  })
}
