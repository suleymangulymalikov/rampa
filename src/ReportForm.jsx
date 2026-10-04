import { useState } from 'react'
import { REPORT_TYPES, addReport } from './reports'

export default function ReportForm({ position, onDone, onCancel }) {
  const [type, setType] = useState('construction')
  const [photo, setPhoto] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await addReport({ lat: position[0], lng: position[1], type, photo })
      onDone()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <form className="report-form" onSubmit={handleSubmit}>
      <strong>Report an obstacle</strong>
      <label>
        Type
        <select value={type} onChange={(e) => setType(e.target.value)}>
          {Object.entries(REPORT_TYPES).map(([key, t]) => (
            <option key={key} value={key}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Photo (optional)
        <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files[0] || null)} />
      </label>
      {error && <span className="error-dark">{error}</span>}
      <div className="row">
        <button type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save report'}
        </button>
        <button type="button" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </form>
  )
}
