import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined
export const authConfigured = Boolean(url && key)
// A valid inert URL keeps the configuration error renderable in local checkouts.
export const supabase = createClient(url || 'https://unconfigured.supabase.co', key || 'unconfigured', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})

export type Row = { id: string; workspace_id?: string; [key: string]: unknown }
export const entities = ['companies', 'contacts', 'campaigns', 'leads', 'evidence', 'outreach', 'suppression', 'activities', 'research_runs', 'members'] as const
export type Entity = typeof entities[number]
export type Snapshot = Record<Entity, Row[]> & { scores: Row[] }
export const emptySnapshot = (): Snapshot => ({ companies:[],contacts:[],campaigns:[],leads:[],evidence:[],outreach:[],suppression:[],activities:[],research_runs:[],members:[],scores:[] })
export const str = (row: Row | undefined, key: string): string => row?.[key] == null ? '' : String(row[key])

export async function rows(entity: Entity | 'scores', workspace: string, signal?: AbortSignal): Promise<Row[]> {
  const result: Row[] = []
  for (let offset = 0; ; offset += 500) {
    let query = supabase.from(`bpo_${entity}`).select('*').eq('workspace_id', workspace)
      .order(entity === 'scores' ? 'company_id' : 'id').range(offset, offset + 499)
    if (signal) query = query.abortSignal(signal)
    const { data, error } = await query
    if (error) throw error
    result.push(...(data || []) as Row[])
    if (!data || data.length < 500) return result
  }
}

export async function loadSnapshot(workspace: string, signal?: AbortSignal): Promise<Snapshot> {
  const names = [...entities, 'scores'] as const
  const values = await Promise.all(names.map(name => rows(name, workspace, signal)))
  return Object.fromEntries(names.map((name, i) => [name, values[i]])) as Snapshot
}

export async function saveRow(entity: Entity, workspace: string, values: Record<string, unknown>, id?: string): Promise<void> {
  const query = id ? supabase.from(`bpo_${entity}`).update(values).eq('id', id).eq('workspace_id', workspace)
    : supabase.from(`bpo_${entity}`).insert({ ...values, workspace_id: workspace })
  const { error, data } = await query.select('id')
  if (error) throw error
  if (!data?.length) throw new Error('The record was not saved. Refresh and check your workspace access.')
}

export async function removeRow(entity: Entity, workspace: string, id: string): Promise<void> {
  const { error, data } = await supabase.from(`bpo_${entity}`).delete().eq('id', id).eq('workspace_id', workspace).select('id')
  if (error) throw error
  if (!data?.length) throw new Error('The record could not be deleted.')
}

export async function apiAction(path: string, body: unknown = {}): Promise<Record<string, unknown>> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Sign in to continue.')
  const base = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '')
  const response = await fetch(`${base}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(body), signal: AbortSignal.timeout(60000),
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(typeof result.detail === 'string' ? result.detail : `Request failed (${response.status}).`)
  return result
}

export function message(error: unknown): string {
  const value = error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Something went wrong. Try again.'
  if (/duplicate key/.test(value)) return 'A record with this website domain or email already exists in this workspace.'
  if (/foreign key/.test(value)) return 'This record is linked to other records. Remove those links first.'
  return value
}

export function download(name: string, value: string, type: string) {
  const url = URL.createObjectURL(new Blob([value], { type }))
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function csvCell(value: unknown): string {
  let text = Array.isArray(value) ? value.join('; ') : typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value ?? '')
  if (/^[\s]*[=+\-@\t\r]/.test(text)) text = `'${text}`
  return `"${text.replaceAll('"', '""')}"`
}

export function exportCsv(name: string, records: Row[]) {
  const headers = [...new Set(records.flatMap(row => Object.keys(row)))]
  download(`${name}.csv`, '\uFEFF' + [headers.map(csvCell).join(','), ...records.map(row => headers.map(key => csvCell(row[key])).join(','))].join('\r\n'), 'text/csv;charset=utf-8')
}

export function parseCsv(text: string): Record<string, string>[] {
  const result: string[][] = []; let row: string[] = []; let cell = ''; let quoted = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++ } else quoted = !quoted
    } else if (char === ',' && !quoted) { row.push(cell); cell = '' }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i++
      row.push(cell); if (row.some(Boolean)) result.push(row); row = []; cell = ''
    } else cell += char
  }
  if (quoted) throw new Error('The CSV has an unclosed quoted field.')
  row.push(cell); if (row.some(Boolean)) result.push(row)
  const header = result.shift()?.map(value => value.replace(/^\uFEFF/, '').trim().toLowerCase()) || []
  if (!header.length || new Set(header).size !== header.length) throw new Error('CSV headers are missing or duplicated.')
  return result.map((values, index) => {
    if (values.length !== header.length) throw new Error(`CSV row ${index + 2} has the wrong number of columns.`)
    return Object.fromEntries(header.map((key, i) => [key, values[i].trim()]))
  })
}

