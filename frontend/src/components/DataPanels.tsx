import { useMemo, useState } from 'react'
import { ArrowDownToLine, ArrowRight, Building2, FileText, Pencil, Plus, Search, ShieldCheck, Trash2 } from 'lucide-react'
import { fieldLabel, stages, type Module } from '../lib/modules'
import { exportCsv, saveRow, str, type Row, type Snapshot } from '../lib/supabase'

export const safeUrl = (url: string) => /^https?:\/\//i.test(url) ? url : undefined
export const dateLabel = (value: string) => value ? new Date(value.length === 10 ? `${value}T12:00:00` : value).toLocaleDateString('en-GB') : 'â€”'
export function Score({ score }: { score: number }) { return <span title="Verified evidence coverage, not a prediction of outsourcing intent" className={`score-badge ${score >= 60 ? 'high' : score >= 25 ? 'medium' : ''}`}>{score}<small>/100</small></span> }
export const companyScore = (data: Snapshot, companyId: string) => Number(data.scores.find(row => row.company_id === companyId)?.score || 0)
export const companyName = (data: Snapshot, id: string) => str(data.companies.find(row => row.id === id),'name') || 'Unknown company'

export function RecordTable({ module, data, onEdit, onOpen, onDelete, onAdd, onResearch, onDraft, onLead, onEvidence }: {
  module: Module; data: Snapshot; onEdit: (row: Row) => void; onDelete: (row: Row) => void; onAdd: () => void
  onOpen?: (row: Row) => void; onResearch: (row: Row) => void; onDraft: (row: Row) => void; onLead: (row: Row) => void; onEvidence: (row: Row) => void
}) {
  const [search, setSearch] = useState(''); const [status, setStatus] = useState(''); const [page, setPage] = useState(0)
  const records = useMemo(() => [...data[module.entity]].sort((a,b) => str(b,'created_at').localeCompare(str(a,'created_at'))), [data,module.entity])
  const statusKey = module.entity === 'contacts' ? 'verification' : module.entity === 'leads' ? 'stage' : 'status'
  const options = [...new Set(records.map(row => str(row,statusKey)).filter(Boolean))]
  const filtered = records.filter(row => (!status || str(row,statusKey) === status) &&
    [Object.values(row).join(' '),companyName(data,str(row,'company_id'))].join(' ').toLowerCase().includes(search.toLowerCase()))
  const pages = Math.max(1,Math.ceil(filtered.length/20)); const current = Math.min(page,pages-1)
  function cell(row: Row, key: string) {
    if (key === 'company_id') return companyName(data,str(row,key))
    if (key === 'contact_id') return str(data.contacts.find(c => c.id === row.contact_id),'name') || 'Not selected'
    if (key === 'score') return <Score score={companyScore(data,module.entity === 'companies' ? row.id : str(row,'company_id'))} />
    if (key === 'verified') return <span className={`pill ${row.verified ? 'good' : 'warning'}`}>{row.verified ? 'Verified' : 'Needs review'}</span>
    if (key === 'created_at' || key === 'occurred_on' || key === 'due_date') return dateLabel(str(row,key))
    if (key === 'value') return `${str(row,'currency')} ${Number(row.value || 0).toLocaleString()}`
    if (['status','stage','verification'].includes(key)) return <span className="pill">{str(row,key)}</span>
    if (key === 'email') return <span>{str(row,key) || 'Unknown'}{data.suppression.some(s => str(s,'email') === str(row,key).toLowerCase()) && <span className="pill danger">Suppressed</span>}</span>
    return str(row,key) || 'â€”'
  }
  return <section className="panel records-panel"><div className="records-toolbar"><label className="search-input"><Search size={16}/><input aria-label={`Search ${module.label}`} value={search} onChange={e => {setSearch(e.target.value);setPage(0)}} placeholder={`Search ${module.label.toLowerCase()}â€¦`}/></label>
    {options.length > 0 && <select aria-label="Filter status" value={status} onChange={e => {setStatus(e.target.value);setPage(0)}}><option value="">All statuses</option>{options.map(s => <option key={s}>{s}</option>)}</select>}
    <button className="secondary-button" disabled={!filtered.length} onClick={() => exportCsv(module.entity,filtered)}><ArrowDownToLine size={15}/>Export CSV</button><button className="primary-button" onClick={onAdd}><Plus size={15}/>Add {module.singular}</button></div>
    {!filtered.length ? <div className="empty-state"><Building2 size={34}/><h3>{search || status ? 'No matching records' : `Your ${module.label.toLowerCase()} will appear here`}</h3><p>{search || status ? 'Try another search or clear your filters.' : 'Add your first record or import real data to get started.'}</p><button className="primary-button" onClick={onAdd}>Add {module.singular}</button></div> : <div className="market-table-wrap"><table className="crm-table"><thead><tr>{module.columns.map(key => <th key={key}>{fieldLabel(key)}</th>)}<th>Actions</th></tr></thead><tbody>{filtered.slice(current*20,current*20+20).map(row => <tr key={row.id}>{module.columns.map((key,index) => <td key={key}>{index === 0 ? <button className="record-name" onClick={() => (onOpen || onEdit)(row)}>{cell(row,key)}</button> : cell(row,key)}</td>)}<td><div className="row-actions">
      {module.entity === 'companies' && <><button title="Add to pipeline" aria-label="Add to pipeline" onClick={() => onLead(row)}><Plus size={15}/></button><button title="Add evidence" aria-label="Add evidence" onClick={() => onEvidence(row)}><ShieldCheck size={15}/></button><button title="Create draft" aria-label="Create draft" onClick={() => onDraft(row)}><FileText size={15}/></button></>}
      {module.entity === 'campaigns' && <button title="Research this campaign" aria-label="Research this campaign" onClick={() => onResearch(row)}><Search size={15}/></button>}
      {module.entity === 'evidence' && safeUrl(str(row,'source_url')) && <a href={str(row,'source_url')} target="_blank" rel="noreferrer" title="Open source" aria-label="Open source"><ArrowRight size={15}/></a>}
      <button onClick={() => onEdit(row)} aria-label="Edit record" title="Edit"><Pencil size={15}/></button><button onClick={() => onDelete(row)} aria-label="Delete record" title="Delete"><Trash2 size={15}/></button>
    </div></td></tr>)}</tbody></table></div>}
    <div className="table-footer"><span>{filtered.length} records{filtered.length !== records.length && ` of ${records.length}`}</span><div className="pagination"><button disabled={current === 0} onClick={() => setPage(current-1)}>Previous</button><span>{current+1} / {pages}</span><button disabled={current+1>=pages} onClick={() => setPage(current+1)}>Next</button></div></div>
  </section>
}

export function Overview({ data, onNavigate, onAdd }: { data: Snapshot; onNavigate: (page: string) => void; onAdd: () => void }) {
  const qualified = data.leads.filter(row => !['Discovered','Researching','Lost'].includes(str(row,'stage'))).length
  const followups = data.leads.filter(row => row.due_date && !['Won','Lost'].includes(str(row,'stage'))).sort((a,b) => str(a,'due_date').localeCompare(str(b,'due_date')))
  const verified = data.evidence.filter(row => row.verified).length
  return <><section className="welcome-banner live-banner"><div className="banner-copy"><span className="banner-tag"><span/>YOUR TEAM'S OPPORTUNITY WORKSPACE</span><h2>Turn research into<br/>your next conversation.</h2><p>Build a pipeline grounded in real companies and verified evidence.</p><button className="banner-cta" onClick={onAdd}>Add your first prospect <ArrowRight size={16}/></button></div><div className="banner-stat"><ShieldCheck size={36}/><strong>{verified}</strong><span>verified findings</span></div></section>
    <div className="section-heading"><h2>Workspace at a glance</h2><span className="muted small-text">Live from your saved records</span></div><div className="status-grid">{[
      ['Companies',data.companies.length,'Company profiles in your workspace','Companies'],['Active leads',data.leads.filter(l => !['Won','Lost'].includes(str(l,'stage'))).length,`${qualified} qualified or beyond`,'Leads'],
      ['Contacts',data.contacts.length,`${data.contacts.filter(c => c.verification === 'Verified').length} independently verified`,'Contacts'],['Drafts to review',data.outreach.filter(d => d.status === 'Draft').length,'Human review before any outreach','Outreach'],
    ].map(([title,value,detail,page]) => <button className="status-card metric-card" key={String(title)} onClick={() => onNavigate(String(page))}><span className="card-heading">{title}<ArrowRight size={14}/></span><strong className="status-value">{value}</strong><p>{detail}</p></button>)}</div>
    <div className="content-grid"><section className="panel dashboard-panel"><div className="panel-heading"><h2>Pipeline overview</h2><button className="text-button" onClick={() => onNavigate('Pipeline')}>View pipeline <ArrowRight size={14}/></button></div><div className="pipeline-summary">{stages.map(stage => {
      const count=data.leads.filter(row => row.stage===stage).length
      return <div className="bar-row" key={stage}><span>{stage}</span><div className="bar-track"><div style={{width:`${data.leads.length ? count/data.leads.length*100 : 0}%`}}/></div><strong>{count}</strong></div>
    })}</div></section><section className="panel dashboard-panel"><div className="panel-heading"><h2>Next actions</h2><span className="count-badge">{followups.length}</span></div><div className="task-list">{followups.slice(0,6).map(row => <button key={row.id} onClick={() => onNavigate('Leads')}><span><strong>{companyName(data,str(row,'company_id'))}</strong><small>{str(row,'next_action') || 'Set your next action'}</small></span><time className={str(row,'due_date') < new Date().toLocaleDateString('en-CA') ? 'overdue' : ''}>{dateLabel(str(row,'due_date'))}</time></button>)}{!followups.length && <div className="inline-empty">Add a follow-up date to a lead to see it here.</div>}</div><div className="evidence-note"><ShieldCheck size={18}/><p><strong>Evidence before assumptions</strong>Hiring can suggest potential demand; it does not prove outsourcing intent.</p></div></section></div>
    <section className="panel dashboard-panel activity-panel"><div className="panel-heading"><h2>Recent activity</h2><button className="text-button" onClick={() => onNavigate('Activity')}>View history</button></div><ActivityList data={data} limit={6}/></section>
  </>
}

export function Pipeline({ data, workspace, onSaved, onEdit, onError }: { data: Snapshot; workspace: string; onSaved: () => void; onEdit: (row: Row) => void; onError: (error: unknown) => void }) {
  const [busy,setBusy]=useState('')
  return <div className="pipeline-board">{stages.map(stage => { const leads=data.leads.filter(row => row.stage===stage); const totals = leads.reduce<Record<string,number>>((acc,row) => {const currency=str(row,'currency');acc[currency]=(acc[currency] || 0)+Number(row.value || 0);return acc},{})
    return <section className="pipeline-column" key={stage}><header><h2>{stage}</h2><span>{leads.length}</span></header><p className="stage-total">{Object.entries(totals).map(([currency,total]) => `${currency} ${total.toLocaleString()}`).join(' Â· ') || 'No deals yet'}</p>{leads.map(row => <article key={row.id} className="deal-card"><button className="record-name" onClick={() => onEdit(row)}>{companyName(data,str(row,'company_id'))}</button><Score score={companyScore(data,str(row,'company_id'))}/><p>{str(row,'owner_name') || 'Unassigned'}</p><strong>{str(row,'currency')} {Number(row.value || 0).toLocaleString()}</strong>{row.next_action ? <p>{str(row,'next_action')}</p> : null}{row.due_date ? <small>Follow-up {dateLabel(str(row,'due_date'))}</small> : null}<label className="sr-only" htmlFor={`stage-${row.id}`}>Move {companyName(data,str(row,'company_id'))} to stage</label><select id={`stage-${row.id}`} disabled={busy===row.id} value={str(row,'stage')} onChange={async e => {setBusy(row.id);try {await saveRow('leads',workspace,{stage:e.target.value},row.id);onSaved()}catch(error){onError(error)}finally{setBusy('')}}}>{stages.map(s => <option key={s}>{s}</option>)}</select></article>)}</section>
  })}</div>
}

export function ActivityList({ data, limit=100 }: {data: Snapshot; limit?: number}) {
  const records=[...data.activities].sort((a,b) => str(b,'created_at').localeCompare(str(a,'created_at'))).slice(0,limit)
  return <div className="activity-list">{records.map(row => <div key={row.id}><span className="activity-dot"/><span><strong>{str(row,'action').toLowerCase()} Â· {str(row,'entity').replace('bpo_','')}</strong><p>{str(row,'description') || 'Record updated'}</p></span><time>{new Date(str(row,'created_at')).toLocaleString('en-GB')}</time></div>)}{!records.length && <div className="inline-empty">Your team's changes will appear here.</div>}</div>
}

export function Analytics({ data }: {data:Snapshot}) {
  const won=data.leads.filter(l => l.stage==='Won');const closed=data.leads.filter(l => ['Won','Lost'].includes(str(l,'stage')))
  const currencies=[...new Set(data.leads.map(row => str(row,'currency')))]
  return <><div className="status-grid">{[['Total leads',data.leads.length],['Won deals',won.length],['Win rate',closed.length ? `${Math.round(won.length/closed.length*100)}%` : 'â€”'],['Verified evidence',data.evidence.filter(e => e.verified).length]].map(([label,value]) => <div className="status-card" key={label}><span className="card-heading">{label}</span><strong className="status-value">{value}</strong></div>)}</div><div className="content-grid"><section className="panel dashboard-panel"><div className="panel-heading"><h2>Value by currency</h2></div><div className="analysis-list">{currencies.map(currency => <div key={currency}><strong>{currency}</strong><span>Open {data.leads.filter(l => l.currency===currency && !['Won','Lost'].includes(str(l,'stage'))).reduce((sum,l) => sum+Number(l.value || 0),0).toLocaleString()}</span><span>Won {won.filter(l => l.currency===currency).reduce((sum,l) => sum+Number(l.value || 0),0).toLocaleString()}</span></div>)}{!currencies.length && <div className="inline-empty">Add deal values to your leads to see totals.</div>}</div></section><section className="panel dashboard-panel"><div className="panel-heading"><h2>Markets</h2></div><div className="analysis-list">{[...new Set(data.companies.map(c => str(c,'country') || 'Unknown'))].map(country => <div key={country}><strong>{country}</strong><span>{data.companies.filter(c => (str(c,'country') || 'Unknown')===country).length} companies</span></div>)}{!data.companies.length && <div className="inline-empty">Your company markets will appear here.</div>}</div></section></div></>
}


