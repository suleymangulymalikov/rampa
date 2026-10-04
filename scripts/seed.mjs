// Inserts ~30 demo reports (is_demo = true) into Supabase. Run once: node --env-file=.env scripts/seed.mjs
const url = process.env.VITE_SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY
if (!url || !key) throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY (run with --env-file=.env)')

const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }

// Hotspots in Old Town and Kazimierz. Several reports at one spot is what the city dashboard ranks.
const HOTSPOTS = [
  { lat: 50.0515, lng: 19.9455, types: ['high_curb', 'high_curb', 'blocked_sidewalk', 'high_curb', 'construction', 'high_curb', 'blocked_sidewalk', 'high_curb'] }, // Szeroka, Kazimierz
  { lat: 50.0617, lng: 19.9373, types: ['blocked_sidewalk', 'high_curb', 'blocked_sidewalk', 'construction', 'blocked_sidewalk', 'high_curb'] }, // Rynek Główny
  { lat: 50.064, lng: 19.94, types: ['construction', 'construction', 'blocked_sidewalk', 'construction', 'high_curb'] }, // Floriańska
  { lat: 50.059, lng: 19.9385, types: ['high_curb', 'high_curb', 'broken_elevator', 'high_curb'] }, // Grodzka
  { lat: 50.053, lng: 19.943, types: ['broken_elevator', 'broken_elevator', 'blocked_sidewalk', 'broken_elevator'] }, // Stradom
  { lat: 50.0655, lng: 19.944, types: ['construction', 'high_curb', 'broken_elevator'] }, // Planty, near the station
]

// Small deterministic offsets (a few metres) so markers at one spot don't sit exactly on top of each other.
const offset = (i) => ({ dLat: Math.sin(i * 12.9898) * 0.00005, dLng: Math.cos(i * 78.233) * 0.00007 })

const rows = HOTSPOTS.flatMap((h, hi) =>
  h.types.map((type, i) => {
    const n = hi * 10 + i
    const { dLat, dLng } = offset(n)
    const hoursAgo = 1 + ((n * 37) % 120)
    return {
      lat: h.lat + dLat,
      lng: h.lng + dLng,
      type,
      is_demo: true,
      confirmations: (n * 7) % 5,
      created_at: new Date(Date.now() - hoursAgo * 3600 * 1000).toISOString(),
    }
  }),
)

const existing = await fetch(`${url}/rest/v1/reports?select=id&is_demo=eq.true&limit=10`, { headers })
if (!existing.ok) throw new Error(`Could not check existing data: ${existing.status} ${await existing.text()}`)
if ((await existing.json()).length >= 10) {
  console.log('Demo reports already exist, not seeding again.')
  process.exit(0)
}

// Snap every point to the nearest wheelchair-walkable path so no report lands inside a building.
const snap = await fetch('https://api.openrouteservice.org/v2/snap/wheelchair', {
  method: 'POST',
  headers: { Authorization: process.env.VITE_ORS_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({ locations: rows.map((r) => [r.lng, r.lat]), radius: 60 }),
})
if (!snap.ok) throw new Error(`Snap failed: ${snap.status} ${await snap.text()}`)
;(await snap.json()).locations.forEach((loc, i) => {
  if (loc) [rows[i].lng, rows[i].lat] = loc.location
})

const res = await fetch(`${url}/rest/v1/reports`, { method: 'POST', headers, body: JSON.stringify(rows) })
if (!res.ok) throw new Error(`Insert failed: ${res.status} ${await res.text()}`)
console.log(`Inserted ${rows.length} demo reports.`)
