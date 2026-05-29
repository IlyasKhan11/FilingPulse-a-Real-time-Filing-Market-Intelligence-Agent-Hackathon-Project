import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

interface Company {
  id: string;
  ticker: string;
  name: string;
  irUrl?: string;
  filingsUrl?: string;
  createdAt: string;
  _count?: {
    snapshots: number;
    alerts: number;
  };
}

interface Alert {
  id: string;
  companyId: string;
  company: Company;
  title: string;
  summary: string;
  whatChanged: string;
  whyItMatters: string;
  confidence: number;
  severity: string;
  sourceLink: string;
  createdAt: string;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

const sevClass = (s: string) => `sev sev-${(s || 'info').toLowerCase()}`;

export default function App() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activeTab, setActiveTab] = useState<'alerts' | 'watchlist'>('alerts');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

  // Scanning & Form States
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingCompany, setAddingCompany] = useState(false);
  const [formData, setFormData] = useState({ name: '', ticker: '', irUrl: '', filingsUrl: '' });
  const [newlyAddedAlertId, setNewlyAddedAlertId] = useState<string | null>(null);

  // Fetch initial data
  const fetchData = async () => {
    try {
      const companiesRes = await fetch(`${BACKEND_URL}/api/companies`);
      const companiesData = await companiesRes.json();
      setCompanies(Array.isArray(companiesData) ? companiesData : []);

      const alertsRes = await fetch(`${BACKEND_URL}/api/alerts?limit=30`);
      const alertsData = await alertsRes.json();
      setAlerts(Array.isArray(alertsData) ? alertsData : []);
    } catch (err) {
      console.error('Failed to connect to backend api:', err);
    }
  };

  useEffect(() => {
    fetchData();

    // Real-time socket connection
    const socket: Socket = io(BACKEND_URL);

    socket.on('connect', () => {
      console.log('Connected to real-time alert gateway.');
    });

    socket.on('alert', (newAlert: Alert) => {
      console.log('Incoming real-time alert:', newAlert);
      setAlerts((prev) => [newAlert, ...prev]);

      setCompanies((prev) =>
        prev.map((c) =>
          c.id === newAlert.companyId
            ? { ...c, _count: { ...c._count!, alerts: (c._count?.alerts || 0) + 1 } }
            : c,
        ),
      );

      setNewlyAddedAlertId(newAlert.id);
      setTimeout(() => setNewlyAddedAlertId(null), 6000);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Trigger a real scrape + change-detection scan
  const handleScan = async (companyId: string) => {
    setScanningId(companyId);
    try {
      const res = await fetch(`${BACKEND_URL}/api/companies/${companyId}/scan`, { method: 'POST' });
      console.log('Scan response:', await res.json());
      await fetchData();
    } catch (err) {
      console.error('Scan execution failed:', err);
    } finally {
      setScanningId(null);
    }
  };

  // Add a company to the watchlist
  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.ticker) return;

    setAddingCompany(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errData = await res.json();
        alert(errData.message || 'Failed to add company.');
        return;
      }

      setFormData({ name: '', ticker: '', irUrl: '', filingsUrl: '' });
      setShowAddModal(false);
      await fetchData();
    } catch (err) {
      console.error('Failed to submit company:', err);
    } finally {
      setAddingCompany(false);
    }
  };

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return (
      d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
      ' · ' +
      d.toLocaleDateString([], { month: 'short', day: 'numeric' })
    );
  };

  const renderDiff = (text: string) => {
    if (!text) return null;
    const isDiff = text.startsWith('+') || text.startsWith('-') || text.includes('\n+') || text.includes('\n-');
    if (!isDiff) {
      return (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', whiteSpace: 'pre-wrap' }}>{text}</p>
      );
    }
    return (
      <div className="diff">
        {text.split('\n').map((line, i) => {
          const cls = line.startsWith('+') ? 'add' : line.startsWith('-') ? 'del' : '';
          return (
            <span key={i} className={`diff-line ${cls}`}>
              {line || ' '}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="app">
      {/* ---------- masthead ---------- */}
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            Filing<span className="pulse">Pulse</span>
          </div>
          <div className="brand-sub">Real-time Filing Intelligence</div>
        </div>

        <div className="topbar-right">
          <div className="status">
            <span className="dot" />
            <span>Pipeline Live</span>
          </div>
          <div className="tabs">
            <button className={`tab ${activeTab === 'alerts' ? 'active' : ''}`} onClick={() => setActiveTab('alerts')}>
              Feed
            </button>
            <button
              className={`tab ${activeTab === 'watchlist' ? 'active' : ''}`}
              onClick={() => setActiveTab('watchlist')}
            >
              Watchlist
            </button>
          </div>
          <button className="btn" onClick={() => setShowAddModal(true)}>
            + Add Company
          </button>
        </div>
      </header>

      {/* ---------- main layout ---------- */}
      <main className="layout">
        {/* left column */}
        <section className="col-feed">
          {activeTab === 'alerts' ? (
            <>
              <div className="panel-head">
                <h2 className="panel-title">Alert Feed</h2>
                <span className="panel-note">{alerts.length} records</span>
              </div>
              <div className="feed-list">
                {alerts.length === 0 ? (
                  <div className="empty">
                    <h3>No alerts yet</h3>
                    <p>Add a company and run a scan, or use Simulate Change to see the pipeline fire.</p>
                  </div>
                ) : (
                  alerts.map((a) => (
                    <button
                      key={a.id}
                      className={`alert-row ${selectedAlert?.id === a.id ? 'active' : ''} ${
                        newlyAddedAlertId === a.id ? 'flash' : ''
                      }`}
                      onClick={() => setSelectedAlert(a)}
                    >
                      <div className="alert-top">
                        <span className="ticker">{a.company?.ticker || '—'}</span>
                        <span className="co-name">{a.company?.name}</span>
                        <span className="time">{formatTime(a.createdAt)}</span>
                      </div>
                      <div className="alert-title">{a.title}</div>
                      <div className="alert-summary">{a.summary}</div>
                      <div className="alert-foot">
                        <span className={sevClass(a.severity)}>{a.severity}</span>
                        <span className="conf">
                          <span className="conf-bar">
                            <span style={{ width: `${Math.round((a.confidence || 0) * 100)}%` }} />
                          </span>
                          {Math.round((a.confidence || 0) * 100)}%
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              <div className="panel-head">
                <h2 className="panel-title">Watchlist</h2>
                <span className="panel-note">{companies.length} companies</span>
              </div>
              <div className="watch-grid">
                {companies.length === 0 ? (
                  <div className="empty">
                    <h3>Watchlist is empty</h3>
                    <p>Add a company to begin monitoring its filing &amp; IR pages.</p>
                  </div>
                ) : (
                  companies.map((c) => {
                    const scanning = scanningId === c.id;
                    return (
                      <div className="watch-card" key={c.id}>
                        <div className="watch-head">
                          <div className="watch-id">
                            <span className="tk">{c.ticker}</span>
                            <span className="name">{c.name}</span>
                          </div>
                          <div className="counts">
                            <span className="count">{c._count?.snapshots || 0} snap</span>
                            <span className="count">{c._count?.alerts || 0} alert</span>
                          </div>
                        </div>
                        <div className="watch-urls">
                          <span>
                            <b>IR</b> {c.irUrl || '—'}
                          </span>
                          <span>
                            <b>SEC</b> {c.filingsUrl || '—'}
                          </span>
                        </div>
                        <div className="watch-actions">
                          <button className="btn btn-ghost" disabled={scanning} onClick={() => handleScan(c.id)}>
                            {scanning ? (
                              <>
                                <span className="spin" />
                                Scanning
                              </>
                            ) : (
                              'Scan Now'
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </section>

        {/* right column — inspector */}
        <aside className={`col-inspector ${selectedAlert ? 'open' : ''}`}>
          {selectedAlert ? (
            <div className="inspector">
              <div className="insp-scroll">
                <div className="insp-top">
                  <span className={sevClass(selectedAlert.severity)}>{selectedAlert.severity}</span>
                  <button className="btn btn-ghost insp-close" onClick={() => setSelectedAlert(null)}>
                    Close
                  </button>
                </div>
                <h2 className="insp-title">{selectedAlert.title}</h2>
                <div className="insp-meta">
                  <span>
                    <b>{selectedAlert.company?.ticker}</b> {selectedAlert.company?.name}
                  </span>
                  <span>Confidence <b>{Math.round((selectedAlert.confidence || 0) * 100)}%</b></span>
                  <span>{formatTime(selectedAlert.createdAt)}</span>
                </div>

                <div className="insp-section">
                  <div className="insp-label">Summary</div>
                  <p>{selectedAlert.summary}</p>
                </div>

                <div className="insp-section">
                  <div className="insp-label">Why it matters — AI rationale</div>
                  <p className="rationale">{selectedAlert.whyItMatters}</p>
                </div>

                <div className="insp-section" style={{ borderBottom: 'none' }}>
                  <div className="insp-label">What changed</div>
                  {renderDiff(selectedAlert.whatChanged)}
                </div>
              </div>
              <div className="insp-foot">
                <a className="btn source-btn" href={selectedAlert.sourceLink} target="_blank" rel="noreferrer">
                  Verify at source ↗
                </a>
              </div>
            </div>
          ) : (
            <div className="insp-empty">
              <div className="mark">¶</div>
              <h3>Alert Inspector</h3>
              <p>Select an alert from the feed to read the change diff, the AI rationale, and the source.</p>
            </div>
          )}
        </aside>
      </main>

      {/* ---------- add company modal ---------- */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add to Watchlist</h3>
            <p className="lead">
              Enter a ticker and name. Leave the URLs blank to let Bright Data SERP discover the investor &amp;
              filing pages automatically.
            </p>
            <form onSubmit={handleAddCompany}>
              <div className="field">
                <label>Ticker</label>
                <input
                  className="mono"
                  type="text"
                  placeholder="AAPL"
                  value={formData.ticker}
                  onChange={(e) => setFormData({ ...formData, ticker: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label>Company name</label>
                <input
                  type="text"
                  placeholder="Apple Inc."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label>Investor relations URL (optional)</label>
                <input
                  className="mono"
                  type="url"
                  placeholder="https://investor.apple.com"
                  value={formData.irUrl}
                  onChange={(e) => setFormData({ ...formData, irUrl: e.target.value })}
                />
              </div>
              <div className="field">
                <label>SEC filings URL (optional)</label>
                <input
                  className="mono"
                  type="url"
                  placeholder="https://www.sec.gov/cgi-bin/..."
                  value={formData.filingsUrl}
                  onChange={(e) => setFormData({ ...formData, filingsUrl: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn" disabled={addingCompany}>
                  {addingCompany ? (
                    <>
                      <span className="spin" />
                      Discovering
                    </>
                  ) : (
                    'Add Company'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
