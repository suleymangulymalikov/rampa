const ORS_URL = 'https://api.openrouteservice.org/v2/directions'

// from, to: [lat, lng]. Returns { coords: [[lat, lng], ...], distance (m), duration (s) }
export async function fetchRoute(from, to, profile = 'wheelchair') {
  const key = import.meta.env.VITE_ORS_KEY
  if (!key) throw new Error('Missing VITE_ORS_KEY in .env')

  const res = await fetch(`${ORS_URL}/${profile}/geojson`, {
    method: 'POST',
    headers: { Authorization: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      coordinates: [
        [from[1], from[0]],
        [to[1], to[0]],
      ],
    }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error?.message || `ORS error ${res.status}`)
  }
  const data = await res.json()
  const feature = data.features[0]
  return {
    coords: feature.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    distance: feature.properties.summary.distance,
    duration: feature.properties.summary.duration,
  }
}
