import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, useMap } from 'react-leaflet'
import { REPORT_TYPES, fetchActiveReports, markManyFixed, subscribeToReports } from './reports'
import { clusterReports, streetName, timeAgo } from './cluster'

const KRAKOW = [50.0585, 19.9395]
const NAMED_HOTSPOTS = 12

function FlyTo({ target }) {
  const map = useMap()
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], 17, { duration: 0.8 })
  }, [map, target])
  return null
}

export default function Dashboard() {
  const [reports, setReports] = useState([])
  const [names, setNames] = useState({})
  const [selected, setSelected] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = () => fetchActiveReports().then(setReports).catch((err) => setError(err.message))
    load()
    return subscribeToReports(load)
  }, [])

  const hotspots = useMemo(() => clusterReports(reports), [reports])
  const hasDemo = reports.some((r) => r.is_demo)

  // Look up street names one by one (Nominatim allows about 1 request per second).
  useEffect(() => {
    let cancelled = false
    async function run() {
      for (const h of hotspots.slice(0, NAMED_HOTSPOTS)) {
        if (cancelled) return
        if (names[h.key]) continue
        const name = await streetName(h.lat, h.lng)
        if (cancelled) return
        setNames((n) => ({ ...n, [h.key]: name }))
        await new Promise((r) => setTimeout(r, 1100))
      }
    }
    run()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotspots])

  return (
    <div className="dash">
      <header className="bar">
        <strong>Rampa</strong>
        <span>City dashboard</span>
        <a className="bar-link" href="#/">
          Back to map
        </a>
      </header>
      <div className="dash-body">
        <section className="dash-side">
          <div className="stats">
            <div>
              <b>{reports.length}</b>
              <span>active reports</span>
            </div>
            <div>
              <b>{hotspots.length}</b>
              <span>hotspots</span>
            </div>
            <div>
              <b>{hotspots[0]?.count ?? 0}</b>
              <span>in the worst spot</span>
            </div>
          </div>
          {hasDemo && <p className="note">Includes demo data for presentation purposes.</p>}
          {error && <p className="error-dark">{error}</p>}
          <h2>Fix these first</h2>
          <div className="table-wrap">
            <table className="hot-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Location</th>
                  <th>Reports</th>
                  <th>Main issue</th>
                  <th>Latest</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {hotspots.map((h, i) => (
                  <tr key={h.key} className={selected?.key === h.key ? 'sel' : ''} onClick={() => setSelected(h)}>
                    <td>{i + 1}</td>
                    <td>{names[h.key] || `${h.lat.toFixed(4)}, ${h.lng.toFixed(4)}`}</td>
                    <td>
                      <b>{h.count}</b>
                    </td>
                    <td>
                      <span className="dot" style={{ background: REPORT_TYPES[h.topType].color }} />
                      {REPORT_TYPES[h.topType].label}
                    </td>
                    <td>{timeAgo(h.newest)}</td>
                    <td>
                      <button
                        className="fix-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          markManyFixed(h.ids).catch((err) => setError(err.message))
                        }}
                      >
                        Fixed
                      </button>
                    </td>
                  </tr>
                ))}
                {hotspots.length === 0 && (
                  <tr>
                    <td colSpan={6}>No active reports.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        <MapContainer center={KRAKOW} zoom={14} className="dash-map">
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FlyTo target={selected} />
          {/* Heatmap: overlapping translucent discs add up where reports cluster. */}
          {reports.map((r) => (
            <CircleMarker
              key={r.id}
              center={[r.lat, r.lng]}
              radius={26}
              pathOptions={{ stroke: false, fillColor: '#e53935', fillOpacity: 0.16 }}
              interactive={false}
            />
          ))}
          {hotspots.map((h) => (
            <CircleMarker
              key={h.key}
              center={[h.lat, h.lng]}
              radius={9 + Math.min(h.count, 10)}
              pathOptions={{ color: '#fff', weight: 2, fillColor: '#b71c1c', fillOpacity: 0.9 }}
              eventHandlers={{ click: () => setSelected(h) }}
            />
          ))}
        </MapContainer>
      </div>
    </div>
  )
}
