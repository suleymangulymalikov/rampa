import { useEffect, useState } from 'react'
import App from './App'
import Dashboard from './Dashboard'

// Tiny hash router: "#/city" shows the dashboard, anything else shows the map.
export default function Root() {
  const [hash, setHash] = useState(window.location.hash)
  useEffect(() => {
    const onChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash === '#/city' ? <Dashboard /> : <App />
}
