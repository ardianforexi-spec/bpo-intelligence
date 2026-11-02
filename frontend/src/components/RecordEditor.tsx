import { useEffect, useRef, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { modules, services, type Module } from '../lib/modules'
import { message, saveRow, str, type Row, type Snapshot } from '../lib/supabase'

export function RecordEditor({ module, record, initial, data, workspace, onClose, onSaved }: {
  module: Module; record?: Row; initial?: Record<string, unknown>; data: Snapshot; workspace: string; onClose: () => void; onSaved: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [values, setValues] = useState<Record<string, unknown>>(() => Object.fromEntries(module.fields.map(field => [field.key,
    record?.[field.key] ?? initial?.[field.key] ?? (field.type === 'checkbox' ? false : field.type === 'services' ? [] : field.type === 'select' && field.options && !field.entity && field.key !== 'country' ? field.options[0] : ''),
  ])))
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  useEffect(() => { const node = dialog.current; node?.showModal(); return () => node?.close() }, [])
  function set(key: string, value: unknown) { setValues(old => ({ ...old, [key]: value })) }
  async function save(event: FormEvent) {
    event.preventDefault(); if (busy) return; setBusy(true); setError('')
    try {
      const payload: Record<string, unknown> = {}
      for (const field of module.fields) {
        const value = values[field.key]
        payload[field.key] = field.type === 'number' ? value === '' ? null : Number(value)
          : field.type === 'checkbox' ? Boolean(value) : field.type === 'services' ? value
          : field.entity || field.type === 'date' ? value || null : String(value ?? '').trim()
      }
      if (module.entity === 'leads' && payload.value === null) payload.value = 0
      if (module.entity === 'suppression') payload.email = String(payload.email).toLowerCase()
      if (module.entity === 'contacts' && payload.verification === 'Verified' && (!payload.email || !payload.source_url)) throw new Error('Add a business email and its source before marking the contact verified.')
      await saveRow(module.entity, workspace, payload, record?.id); onSaved(); onClose()
    } catch (error) { setError(message(error)) } finally { setBusy(false) }
  }
  return <dialog ref={dialog} className="record-dialog" onCancel={event => { event.preventDefault(); if (!busy) onClose() }} aria-labelledby="editor-title">
    <form onSubmit={save}><div className="dialog-header"><div><span className="eyebrow">{module.label}</span><h2 id="editor-title">{record ? 'Edit' : 'Add'} {module.singular}</h2></div><button type="button" className="icon-button" onClick={onClose} disabled={busy} aria-label="Close"><X size={20} /></button></div>
      <div className="editor-grid">{module.fields.map(field => {
        const value = values[field.key]
        const inputId = `field-${field.key}`
        if (field.type === 'checkbox') return <label key={field.key} className="checkbox-label full"><input id={inputId} type="checkbox" checked={Boolean(value)} onChange={e => set(field.key, e.target.checked)} />{field.label}</label>
        if (field.type === 'services') return <fieldset key={field.key} className="full"><legend>{field.label}</legend><div className="checkbox-options">{services.map(service => <label key={service}><input type="checkbox" checked={Array.isArray(value) && value.includes(service)} onChange={e => set(field.key, e.target.checked ? [...(Array.isArray(value) ? value : []),service] : (Array.isArray(value) ? value : []).filter(s => s !== service))} />{service}</label>)}</div></fieldset>
        let choices = field.entity ? data[field.entity] : []
        if (field.entity === 'contacts') choices = choices.filter(row => row.company_id === values.company_id && !data.suppression.some(s => str(s,'email') === str(row,'email').toLowerCase()))
        return <label key={field.key} className={field.type === 'textarea' ? 'full' : ''} htmlFor={inputId}>{field.label}{field.required && <span className="required"> *</span>}
          {field.type === 'textarea' ? <textarea id={inputId} value={String(value ?? '')} required={field.required} maxLength={field.max || 10000} rows={field.key === 'body' ? 9 : 4} onChange={e => set(field.key, e.target.value)} />
          : field.type === 'select' ? <select id={inputId} value={String(value ?? '')} required={field.required} onChange={e => { set(field.key,e.target.value); if (field.key === 'company_id') set('contact_id','') }}>
            {(field.entity || field.key === 'country') && <option value="">{field.entity ? `Select ${field.entity === 'companies' ? 'company' : field.entity === 'contacts' ? 'contact' : 'campaign'}` : 'Not specified'}</option>}
            {field.entity ? choices.map(row => <option key={row.id} value={row.id}>{str(row,'name') || str(row,'email')}</option>) : field.options?.map(option => <option key={option}>{option}</option>)}
          </select> : <input id={inputId} type={field.type || 'text'} value={String(value ?? '')} required={field.required} maxLength={field.max || 500} min={field.type === 'number' ? 0 : undefined} step={field.type === 'number' ? 'any' : undefined} onChange={e => set(field.key, e.target.value)} />}
          {field.hint && <small>{field.hint}</small>}
        </label>
      })}</div>{error && <div className="error-banner" role="alert">{error}</div>}
      <div className="dialog-actions"><button type="button" className="secondary-button" disabled={busy} onClick={onClose}>Cancel</button><button className="primary-button" disabled={busy}>{busy ? 'Savingâ€¦' : 'Save record'}</button></div>
    </form>
  </dialog>
}

export function DeleteDialog({ label, onConfirm, onClose }: { label: string; onConfirm: () => Promise<void>; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState('')
  useEffect(() => { const node = dialog.current; node?.showModal(); return () => node?.close() }, [])
  return <dialog ref={dialog} className="record-dialog small-dialog" aria-labelledby="delete-title" onCancel={e => { e.preventDefault(); if (!busy) onClose() }}><h2 id="delete-title">Delete {label}?</h2><p>Company deletion also removes its contacts, evidence, leads and drafts. This cannot be undone.</p>{error && <div role="alert" className="error-banner">{error}</div>}<div className="dialog-actions"><button className="secondary-button" disabled={busy} onClick={onClose}>Keep record</button><button className="danger-button" disabled={busy} onClick={async () => { setBusy(true); try { await onConfirm(); onClose() } catch (error) { setError(message(error)) } finally { setBusy(false) } }}>{busy ? 'Deletingâ€¦' : 'Delete record'}</button></div></dialog>
}

export function draftTemplate(company: Row, language: string, service = 'Customer Support') {
  const name = str(company,'name')
  return language === 'German' ? { company_id: company.id,language,subject:`Austausch zu ${service} bei ${name}`,
    body:`Guten Tag,\n\nich mÃ¶chte mich kurz vorstellen. Unser Team in Kosovo bietet ${service} auf Englisch und Deutsch an. Wir kÃ¶nnen Projekte mit einem Team von 10â€“20 Mitarbeitenden unterstÃ¼tzen.\n\nWÃ¤re ein kurzes GesprÃ¤ch sinnvoll, um zu prÃ¼fen, ob wir bei ${name} unterstÃ¼tzen kÃ¶nnen?\n\nFalls Sie keine weiteren Nachrichten wÃ¼nschen, geben Sie uns bitte kurz Bescheid.\n\nMit freundlichen GrÃ¼ÃŸen\n[Ihr Name]`,status:'Draft' }
    : { company_id: company.id,language:'English',subject:`A conversation about ${service} at ${name}`,
      body:`Hello,\n\nI wanted to introduce our Kosovo-based team. We offer ${service} in English and German, with a delivery team of 10â€“20 agents.\n\nWould a brief conversation help determine whether we could support ${name}?\n\nIf you would prefer not to hear from us, please let us know.\n\nKind regards,\n[Your name]`,status:'Draft' }
}

export const draftModule = modules.Outreach

