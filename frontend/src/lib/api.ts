export type LiveHealth = { status: 'ok'; service: string; version: string }
export type ReadyHealth = {
  status: 'ready' | 'not_ready'
  database: 'connected' | 'not_configured' | 'unavailable'
}

const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '')

async function healthRequest(path: string): Promise<unknown> {
  const response = await fetch(`${baseUrl}/health/${path}`, {
    signal: AbortSignal.timeout(8000), headers: { Accept: 'application/json' },
  })
  if (!response.ok && !(path === 'ready' && response.status === 503)) {
    throw new Error(`Health request failed (${response.status}).`)
  }
  return response.json()
}

export async function getLiveHealth(): Promise<LiveHealth> {
  const data = await healthRequest('live') as Partial<LiveHealth> | null
  if (!data || data.status !== 'ok' || typeof data.version !== 'string') {
    throw new Error('The API returned an unexpected liveness response.')
  }
  return data as LiveHealth
}

export async function getReadyHealth(): Promise<ReadyHealth> {
  const data = await healthRequest('ready') as Partial<ReadyHealth> | null
  if (!data || !['ready', 'not_ready'].includes(data.status || '') ||
      !['connected', 'not_configured', 'unavailable'].includes(data.database || '')) {
    throw new Error('The API returned an unexpected readiness response.')
  }
  return data as ReadyHealth
}
