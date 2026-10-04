import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)

export const REPORT_TYPES = {
  construction: { label: 'Construction', color: '#e67e22' },
  broken_elevator: { label: 'Broken elevator', color: '#8e44ad' },
  blocked_sidewalk: { label: 'Blocked sidewalk', color: '#c0392b' },
  high_curb: { label: 'High curb', color: '#2c3e50' },
}

export async function fetchActiveReports() {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

async function uploadPhoto(file) {
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('report-photos').upload(path, file)
  if (error) throw error
  return supabase.storage.from('report-photos').getPublicUrl(path).data.publicUrl
}

export async function addReport({ lat, lng, type, photo }) {
  const photo_url = photo ? await uploadPhoto(photo) : null
  const { data, error } = await supabase
    .from('reports')
    .insert({ lat, lng, type, photo_url })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function markFixed(id) {
  const { error } = await supabase.from('reports').update({ status: 'fixed' }).eq('id', id)
  if (error) throw error
}

export async function markManyFixed(ids) {
  const { error } = await supabase.from('reports').update({ status: 'fixed' }).in('id', ids)
  if (error) throw error
}

// Calls onChange whenever any report is inserted or updated. Returns an unsubscribe function.
export function subscribeToReports(onChange) {
  const channel = supabase
    .channel('reports-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, onChange)
    .subscribe()
  return () => supabase.removeChannel(channel)
}
