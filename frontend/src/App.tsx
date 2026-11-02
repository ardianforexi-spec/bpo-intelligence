const navigation = [
  "Overview",
  "AI Research Agents",
  "Market Research",
  "Companies",
  "Leads",
  "Contacts",
  "Hiring Signals",
  "Outreach Campaigns",
  "CRM Pipeline",
  "Analytics",
  "Settings",
];

export default function App() {
  return (
    <main className="shell">
      <aside>
        <div className="brand"><span>BI</span> BPO Intelligence</div>
        <nav aria-label="Main navigation">
          {navigation.map((item, index) => <button className={index === 0 ? "active" : ""} key={item}>{item}</button>)}
        </nav>
      </aside>
      <section className="content">
        <header><div><p className="eyebrow">Business intelligence platform</p><h1>Ready to discover your next client.</h1></div><span className="status">Foundation online</span></header>
        <div className="hero"><p>Phase 1 dashboard shell</p><h2>Research campaigns and qualified leads will appear here.</h2><span>The API health endpoint and application configuration are ready. CRM, research agents, and analytics follow in later phases.</span></div>
        <div className="cards">
          <article><p>Companies discovered</p><strong>—</strong><span>Available after Phase 2</span></article>
          <article><p>Qualified leads</p><strong>—</strong><span>Available after Phase 2</span></article>
          <article><p>Hiring signals</p><strong>—</strong><span>Available after Phase 3</span></article>
        </div>
      </section>
    </main>
  );
}
