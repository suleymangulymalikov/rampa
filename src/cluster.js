const CLUSTER_RADIUS_M = 30

function distanceM(a, b) {
  const dLat = (b.lat - a.lat) * 111320
  const dLng = (b.lng - a.lng) * 111320 * Math.cos((a.lat * Math.PI) / 180)
  return Math.hypot(dLat, dLng)
}

// Groups reports within CLUSTER_RADIUS_M of each other into hotspots, biggest first.
export function clusterReports(reports) {
  const clusters = []
  for (const r of reports) {
    const home = clusters.find((c) => distanceM(c, r) <= CLUSTER_RADIUS_M)
    if (home) {
      home.reports.push(r)
      home.lat = home.reports.reduce((s, x) => s + x.lat, 0) / home.reports.length
      home.lng = home.reports.reduce((s, x) => s + x.lng, 0) / home.reports.length
    } else {
      clusters.push({ lat: r.lat, lng: r.lng, reports: [r] })
    }
  }
  return clusters
    .map((c) => {
      const byType = {}
      for (const r of c.reports) byType[r.type] = (byType[r.type] || 0) + 1
      const topType = Object.entries(byType).sort((a, b) => b[1] - a[1])[0][0]
      const newest = Math.max(...c.reports.map((r) => new Date(r.created_at).getTime()))
      return {
        key: c.reports.map((r) => r.id).sort()[0],
        lat: c.lat,
        lng: c.lng,
        count: c.reports.length,
        ids: c.reports.map((r) => r.id),
        byType,
        topType,
        newest,
        hasDemo: c.reports.some((r) => r.is_demo),
      }
    })
    .sort((a, b) => b.count - a.count || b.newest - a.newest)
}

export function timeAgo(ms) {
  const mins = Math.round((Date.now() - ms) / 60000)
  if (mins < 60) return `${Math.max(mins, 1)} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 48) return `${hours} h ago`
  return `${Math.round(hours / 24)} days ago`
}

const nameCache = new Map()

// Street name for a point via OpenStreetMap Nominatim; falls back to coordinates.
export async function streetName(lat, lng) {
  const k = `${lat.toFixed(4)},${lng.toFixed(4)}`
  if (nameCache.has(k)) return nameCache.get(k)
  let name = `${lat.toFixed(4)}, ${lng.toFixed(4)}`
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=jsonv2&zoom=17`,
      { headers: { 'Accept-Language': 'en' } },
    )
    if (res.ok) {
      const a = (await res.json()).address || {}
      name = a.road || a.pedestrian || a.footway || a.square || a.suburb || name
    }
  } catch {
    /* keep the coordinate fallback */
  }
  nameCache.set(k, name)
  return name
}
