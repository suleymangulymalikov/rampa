import { useState } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import './App.css'
import { fetchRoute, PROFILES } from './routing'

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

  async function loadRoute(from, to, profileKey) {
    setError('')
    setLoading(true)
    try {
      setRoute(await fetchRoute(from, to, profileKey))
    } catch (err) {
      setRoute(null)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleProfile(profileKey) {
    setProfile(profileKey)
    if (points.length === 2) loadRoute(points[0], points[1], profileKey)
  }

  async function handlePick(latlng) {
    setError('')
    if (points.length >= 2) {
      setPoints([latlng])
      setRoute(null)
      return
    }
    const next = [...points, latlng]
    setPoints(next)
    if (next.length === 2) loadRoute(next[0], next[1], profile)
  }

  return (
    <div className="app">
      <header className="bar">
        <strong>Rampa</strong>
        <select value={profile} onChange={(e) => handleProfile(e.target.value)} aria-label="Mobility profile">
          {Object.entries(PROFILES).map(([key, p]) => (
            <option key={key} value={key}>
              {p.label}
            </option>
          ))}
        </select>
        <span>
          {points.length === 0 && 'Tap the map to set the start'}
          {points.length === 1 && 'Tap the map to set the destination'}
          {points.length === 2 && loading && 'Finding accessible route...'}
          {route && ` ${(route.distance / 1000).toFixed(2)} km, ${Math.round(route.duration / 60)} min`}
        </span>
        {error && <span className="error">{error}</span>}
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
      </MapContainer>
    </div>
  )
}
