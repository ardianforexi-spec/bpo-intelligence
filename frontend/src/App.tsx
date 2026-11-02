import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Activity, ArrowDownToLine, ArrowRight, Bot, Building2, ChartNoAxesCombined,
  Check, ChevronRight, CircleHelp, Database, FileText, Globe2, Layers3,
  LayoutDashboard, ListFilter, Mail, Menu, Network, Radar, RefreshCw,
  Search, Settings, ShieldCheck, Sparkles, Target, Users, Workflow, X,
} from 'lucide-react'
import { StatusCard } from './components/StatusCard'
import { getLiveHealth, getReadyHealth, type LiveHealth, type ReadyHealth } from './lib/api'

const navigation = [
  { label: 'Overview', icon: LayoutDashboard, phase: 1 },
  { label: 'AI Research Agents', icon: Bot, phase: 4 },
  { label: 'Market Research', icon: Radar, phase: 3 },
  { label: 'Companies', icon: Building2, phase: 2 },
  { label: 'Leads', icon: Target, phase: 2 },
  { label: 'Contacts', icon: Users, phase: 2 },
  { label: 'Hiring Signals', icon: Activity, phase: 3 },
  { label: 'Outreach Campaigns', icon: Mail, phase: 5 },
  { label: 'CRM Pipeline', icon: Workflow, phase: 2 },
  { label: 'Analytics', icon: ChartNoAxesCombined, phase: 6 },
  { label: 'Settings', icon: Settings, phase: 1 },
]
const markets = [
  ['US', 'United States', 'English'], ['CA', 'Canada', 'English'],
  ['UK', 'United Kingdom', 'English'], ['AU', 'Australia', 'English'],
  ['DE', 'Germany', 'German'], ['AT', 'Austria', 'German'], ['CH', 'Switzerland', 'German'],
]
const services = ['Customer Support', 'Sales & Appointment Setting', 'Data Entry & Processing',
  'Data Analytics', 'Technical Support', 'Back Office Operations', 'Virtual Assistants']

export default function App() {
  const [page, setPage] = useState('Overview')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [live, setLive] = useState<LiveHealth | null>(null)
  const [ready, setReady] = useState<ReadyHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [checkedAt, setCheckedAt] = useState('')
  const [marketQuery, setMarketQuery] = useState('')
  const [language, setLanguage] = useState('All languages')
  const mounted = useRef(false)
  const running = useRef(false)
  const selected = navigation.find(item => item.label === page)!

  const refresh = useCallback(async () => {
    if (running.current) return
    running.current = true
    setLoading(true)
    setError('')
    const [apiResult, dbResult] = await Promise.allSettled([getLiveHealth(), getReadyHealth()])
    running.current = false
    if (!mounted.current) return
    setLive(apiResult.status === 'fulfilled' ? apiResult.value : null)
    setReady(dbResult.status === 'fulfilled' ? dbResult.value : null)
    if (apiResult.status === 'rejected' || dbResult.status === 'rejected') {
      setError('Could not complete the health check. Confirm the API is available, then retry.')
    }
    setCheckedAt(new Date().toLocaleTimeString())
    setLoading(false)
  }, [])

  useEffect(() => {
    mounted.current = true
    void refresh()
    return () => { mounted.current = false }
  }, [refresh])

  function exportStatus() {
    const content = JSON.stringify({ checkedAt, live, ready, phase: 1 }, null, 2)
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'bpo-system-status.json'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const visibleMarkets = markets.filter(([, name, lang]) =>
    name.toLowerCase().includes(marketQuery.toLowerCase()) &&
    (language === 'All languages' || language === lang))

  return <div className="app-shell">
    {mobileOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
    <aside className={`sidebar ${mobileOpen ? 'is-open' : ''}`}>
      <a className="brand" href="#overview" onClick={() => { setPage('Overview'); setMobileOpen(false) }}>
        <span className="brand-mark"><Network size={24} /></span>
        <span>BPO<span className="brand-subtitle">INTELLIGENCE</span></span>
      </a>
      <div className="workspace-switch"><span className="workspace-avatar">B</span><span>BPO Workspace<small>Kosovo · International markets</small></span><ChevronRight size={14} /></div>
      <p className="nav-label">WORKSPACE</p>
      <nav aria-label="Main navigation">
        {navigation.map(({ label, icon: Icon, phase }) => <button key={label}
          className={`nav-item ${page === label ? 'active' : ''}`} aria-current={page === label ? 'page' : undefined}
          onClick={() => { setPage(label); setMobileOpen(false) }}>
          <Icon size={18} /><span>{label}</span>{phase > 1 && <span className="nav-phase">P{phase}</span>}
        </button>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="foundation-note"><Sparkles size={19} /><strong>Built for your next chapter</strong><p>From first discovery to a sustainable sales pipeline.</p><span>Foundation · Phase 1</span></div>
        <div className="profile"><span className="profile-avatar">BW</span><div>BPO Workspace<small>{import.meta.env.DEV ? 'Local development' : 'Hosted foundation'}</small></div><ShieldCheck size={17} /></div>
      </div>
    </aside>

    <div className="main-shell">
      <header className="topbar">
        <div className="breadcrumbs"><button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={20} /></button><span>Workspace</span><ChevronRight size={14} /><strong>{page}</strong></div>
        <div className="topbar-right"><span className="environment"><span />{import.meta.env.DEV ? 'Development' : 'Hosted'}</span><a className="help-link" href="https://fastapi.tiangolo.com/" target="_blank" rel="noreferrer" aria-label="FastAPI documentation"><CircleHelp size={19} /></a><span className="top-avatar">BW</span></div>
      </header>

      <main>
        <div className="page-heading"><div><div className="eyebrow">YOUR OUTSOURCING GROWTH WORKSPACE</div><h1>{page === 'Overview' ? 'Opportunity starts with intelligence.' : page}</h1><p>{page === 'Overview' ? 'A clearer view of your markets. A stronger foundation for your pipeline.' : 'BPO Intelligence · evidence-led business development'}</p></div><span className="phase-badge"><Layers3 size={14} /> Phase 1 / 7</span></div>

        {selected.phase > 1 ? <section className="panel planned-panel"><span className="empty-icon"><selected.icon size={30} /></span><span className="eyebrow">DEVELOPMENT ROADMAP</span><h2>{page} arrives in Phase {selected.phase}</h2><p>The foundation is being verified before this module is implemented. No research has been run and no business records have been created.</p><button className="primary-button" onClick={() => setPage('Overview')}>Return to overview <ArrowRight size={16} /></button></section> : <>
          <section className="welcome-banner"><div className="banner-grid" /><div className="banner-copy"><span className="banner-tag"><span /> FOUNDATION WORKSPACE</span><h2>Your next international client<br />starts with the right signal.</h2><p>Discover demand. Understand the business. Build the relationship.</p><a href="#system-status" className="banner-link">Check your system setup <ArrowRight size={16} /></a></div><div className="signal-art" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><span className="art-node node-a"><Building2 /></span><span className="art-node node-b"><Users /></span><span className="art-node node-c"><Activity /></span><span className="art-center"><Globe2 size={55} /></span><span className="art-caption"><span /> 7 target markets · 2 languages</span></div></section>

          <div className="section-heading" id="system-status"><div><h2>System readiness <span className="subtle-badge">LIVE</span></h2><p>{checkedAt ? `Last checked at ${checkedAt}` : 'Checking your local environment…'}</p></div><button className="secondary-button" onClick={() => void refresh()} disabled={loading}><RefreshCw size={15} className={loading ? 'spin' : ''} />{loading ? 'Checking…' : 'Refresh status'}</button></div>
          {error && <div className="error-banner" role="alert"><span>{error}</span><button className="icon-button" onClick={() => setError('')} aria-label="Dismiss error"><X size={16} /></button></div>}
          <div className="status-grid" aria-live="polite" aria-busy={loading}>
            <StatusCard icon={<Activity size={19} />} label="Backend API" value={loading ? 'Checking…' : live ? 'Operational' : 'Unreachable'} tone={loading ? 'neutral' : live ? 'good' : 'warning'} description={live ? `FastAPI · v${live.version}` : 'Live process health check'} />
            <StatusCard icon={<Database size={19} />} label="PostgreSQL" value={loading ? 'Checking…' : ready?.database === 'connected' ? 'Connected' : ready?.database === 'not_configured' ? 'Setup required' : 'Unavailable'} tone={ready?.database === 'connected' ? 'good' : 'warning'} description="Live database readiness check" />
            <StatusCard icon={<Bot size={19} />} label="Research engine" value="Planned" description="Search integration begins in Phase 3" />
            <StatusCard icon={<ShieldCheck size={19} />} label="Workspace mode" value="Foundation" description="No live company data collected" />
          </div>

          {page === 'Settings' && <section className="panel setup-panel"><h2>Local configuration</h2><p>Configure <code>backend/.env</code> with your PostgreSQL connection URL and restart the backend. The frontend uses <code>frontend/.env</code> for its API proxy. Credentials stay on the server.</p><p>Authentication, provider settings, and account management are scheduled for later phases. This foundation runs on loopback for local use.</p><button className="secondary-button" onClick={exportStatus}><ArrowDownToLine size={15} />Download current status</button></section>}

          <div className="content-grid"><section className="panel markets-panel"><div className="panel-heading"><div><span className="eyebrow">WHERE WE'RE FOCUSED</span><h2>Target markets <span className="count-badge">7</span></h2></div><Globe2 size={20} className="muted" /></div><p className="panel-description">Your initial international research coverage. Research is not active yet.</p><div className="market-controls"><label className="search-input"><Search size={16} /><input aria-label="Search target markets" placeholder="Find a market…" value={marketQuery} onChange={event => setMarketQuery(event.target.value)} /></label><label className="language-filter"><ListFilter size={15} /><select aria-label="Filter by language" value={language} onChange={event => setLanguage(event.target.value)}><option>All languages</option><option>English</option><option>German</option></select></label></div><div className="market-table-wrap"><table><thead><tr><th>MARKET</th><th>LANGUAGE</th><th>RESEARCH STATUS</th></tr></thead><tbody>{visibleMarkets.map(([code, name, lang]) => <tr key={code}><td><span className={`country-code country-${code.toLowerCase()}`}>{code}</span><strong>{name}</strong></td><td>{lang}</td><td><span className="pending-status"><span />Not started</span></td></tr>)}</tbody></table>{!visibleMarkets.length && <div className="no-results">No markets match your filters.</div>}</div><div className="table-footer">{visibleMarkets.length} of 7 markets<span>Configured target markets, not research results</span></div></section>

          <section className="panel roadmap-panel"><div className="panel-heading"><div><span className="eyebrow">BUILDING WITH PURPOSE</span><h2>The path to your pipeline</h2></div><Workflow size={20} className="muted" /></div><div className="roadmap-list">{[
            ['01', 'Platform foundation', 'API, frontend & database connection', 'Current phase'],
            ['02', 'CRM & company records', 'Companies, contacts & lead pipeline', 'Next'],
            ['03', 'Evidence-led research', 'Discovery & hiring signal detection', 'Planned'],
            ['04–05', 'Intelligence & outreach', 'Qualification, matching & draft messages', 'Planned'],
            ['06–07', 'Insights & deployment', 'Analytics, exports & production review', 'Planned'],
          ].map(([number, title, detail, status], index) => <div className={`roadmap-step ${index === 0 ? 'current' : ''}`} key={number}><span className="step-number">{index === 0 ? <Check size={17} /> : number}</span><div><h3>{title}</h3><p>{detail}</p><span className="step-status">{status}</span></div></div>)}</div><div className="evidence-note"><FileText size={19} /><p><strong>Evidence before assumptions.</strong>Every future research finding will need a source. Hiring signals indicate potential demand.</p></div></section></div>

          <section className="panel services-panel"><div><span className="eyebrow">WHAT YOUR TEAM CAN DELIVER</span><h2>Seven services. One focused pipeline.</h2><p>Designed around an initial team of 10–20 agents in Kosovo.</p></div><div className="service-tags">{services.map(service => <span key={service}>{service}</span>)}</div></section>
          <footer className="page-footer"><span><ShieldCheck size={14} />Source-led research · Human-reviewed outreach</span><button onClick={exportStatus}><ArrowDownToLine size={14} />Export system status</button></footer>
        </>}
      </main>
    </div>
  </div>
}
