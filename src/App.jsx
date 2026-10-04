import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, CircleMarker, Popup, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import './App.css'
import { fetchRoute, PROFILES } from './routing'
import { REPORT_TYPES, fetchActiveReports, markFixed, subscribeToReports } from './reports'
import ReportForm from './ReportForm'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

const KRAKOW = [50.0614, 19.9383]

function ClickHandler({ onPick }) {
  useMapEvents({ click: (e) => onPick([e.latlng.lat, e.latlng.lng]) })
  return null
}

export default function App() {
  const [points, setPoints] = useState([])
  const [route, setRoute] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState('wheelchair')
  const [mode, setMode] = useState('route')
  const [reports, setReports] = useState([])
  const [pendingReport, setPendingReport] = useState(null)

  useEffect(() => {
    const load = () => fetchActiveReports().then(setReports).catch((err) => setError(err.message))
    load()
    return subscribeToReports(load)
  }, [])

  const requestId = useRef(0)

  // Re-route whenever the points, the profile or the active reports change.
  useEffect(() => {
    if (points.length !== 2) return
    const id = ++requestId.current
    setError('')
    setLoading(true)
    fetchRoute(points[0], points[1], profile, reports)
      .then((r) => id === requestId.current && setRoute(r))
      .catch((err) => {
        if (id !== requestId.current) return
        setRoute(null)
        setError(err.message)
      })
      .finally(() => id === requestId.current && setLoading(false))
  }, [points, profile, reports])

  async function handlePick(latlng) {
    setError('')
    if (mode === 'report') {
      setPendingReport(latlng)
      return
    }
    if (points.length >= 2) {
      requestId.current++
      setLoading(false)
      setPoints([latlng])
      setRoute(null)
      return
    }
    const next = [...points, latlng]
    setPoints(next)
  }

  return (
    <div className="app">
      <header className="bar">
        <strong>Rampa</strong>
        <select value={profile} onChange={(e) => setProfile(e.target.value)} aria-label="Mobility profile">
          {Object.entries(PROFILES).map(([key, p]) => (
            <option key={key} value={key}>
              {p.label}
            </option>
          ))}
        </select>
        <div className="modes">
          {['route', 'report'].map((m) => (
            <button
              key={m}
              className={mode === m ? 'active' : ''}
              onClick={() => {
                setMode(m)
                setPendingReport(null)
              }}
            >
              {m === 'route' ? 'Route' : 'Report'}
            </button>
          ))}
        </div>
        <span>
          {mode === 'report' && 'Tap the map where the obstacle is'}
          {mode === 'route' && points.length === 0 && 'Tap the map to set the start'}
          {mode === 'route' && points.length === 1 && 'Tap the map to set the destination'}
          {mode === 'route' && points.length === 2 && loading && 'Finding accessible route...'}
          {route && ` ${(route.distance / 1000).toFixed(2)} km, ${Math.round(route.duration / 60)} min`}
          {route && reports.length > 0 && ` (avoiding ${reports.length} reported obstacles)`}
        </span>
        {error && <span className="error">{error}</span>}
        <a className="bar-link" href="#/city">
          City dashboard
        </a>
      </header>
      <MapContainer center={KRAKOW} zoom={15} className="map">
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onPick={handlePick} />
        {points.map((p, i) => (
          <Marker key={i} position={p} />
        ))}
        {route && <Polyline positions={route.coords} color="#0b6bcb" weight={6} />}
        {reports.map((r) => (
          <CircleMarker
            key={r.id}
            center={[r.lat, r.lng]}
            radius={10}
            pathOptions={{ color: '#fff', weight: 2, fillColor: REPORT_TYPES[r.type].color, fillOpacity: 0.95 }}
          >
            <Popup>
              <strong>{REPORT_TYPES[r.type].label}</strong>
              <br />
              {new Date(r.created_at).toLocaleString()}
              {r.is_demo && <><br /><em>Demo data</em></>}
              {r.photo_url && <img src={r.photo_url} alt="Report" className="popup-photo" />}
              <button
                className="fix-btn"
                onClick={() => markFixed(r.id).catch((err) => setError(err.message))}
              >
                Mark as fixed
              </button>
            </Popup>
          </CircleMarker>
        ))}
        {pendingReport && <Marker position={pendingReport} />}
      </MapContainer>
      {pendingReport && (
        <ReportForm
          position={pendingReport}
          onDone={() => {
            setPendingReport(null)
            setMode('route')
          }}
          onCancel={() => setPendingReport(null)}
        />
      )}
    </div>
  )
}
