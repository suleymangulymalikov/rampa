const ORS_URL = 'https://api.openrouteservice.org/v2/directions'

// ORS has no stroller/elderly profile, so each one maps to an ORS profile plus limits.
export const PROFILES = {
  wheelchair: {
    label: 'Wheelchair',
    orsProfile: 'wheelchair',
    options: {
      profile_params: {
        restrictions: {
          surface_type: 'cobblestone:flattened',
          track_type: 'grade1',
          smoothness_type: 'good',
          maximum_sloped_kerb: 0.03,
          maximum_incline: 6,
        },
      },
    },
  },
  stroller: {
    label: 'Stroller',
    orsProfile: 'wheelchair',
    options: {
      profile_params: {
        restrictions: {
          surface_type: 'cobblestone:flattened',
          smoothness_type: 'intermediate',
          maximum_sloped_kerb: 0.06,
          maximum_incline: 8,
        },
      },
    },
  },
  elderly: {
    label: 'Elderly',
    orsProfile: 'foot-walking',
    options: { avoid_features: ['steps'] },
  },
}

// from, to: [lat, lng]. Returns { coords: [[lat, lng], ...], distance (m), duration (s) }
export async function fetchRoute(from, to, profileKey = 'wheelchair') {
  const key = import.meta.env.VITE_ORS_KEY
  if (!key) throw new Error('Missing VITE_ORS_KEY in .env')
  const profile = PROFILES[profileKey]

  const res = await fetch(`${ORS_URL}/${profile.orsProfile}/geojson`, {
    method: 'POST',
    headers: { Authorization: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      coordinates: [
        [from[1], from[0]],
        [to[1], to[0]],
      ],
      options: profile.options,
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
