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

    // 1. Establish Real-time Socket Connection
    const socket: Socket = io(BACKEND_URL);

    socket.on('connect', () => {
      console.log('Successfully connected to real-time alert gateway.');
    });

    socket.on('alert', (newAlert: Alert) => {
      console.log('Incoming real-time alert:', newAlert);
      // Prepend to alerts list
      setAlerts(prev => [newAlert, ...prev]);
      
      // Update counts of the matching company
      setCompanies(prev =>
        prev.map(c =>
          c.id === newAlert.companyId
            ? { ...c, _count: { ...c._count!, alerts: (c._count?.alerts || 0) + 1 } }
            : c
        )
      );

      // Trigger beautiful highlight effect
      setNewlyAddedAlertId(newAlert.id);
      setTimeout(() => setNewlyAddedAlertId(null), 8000);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Handle Scanning trigger
  const handleScan = async (companyId: string) => {
    setScanningId(companyId);
    try {
      const res = await fetch(`${BACKEND_URL}/api/companies/${companyId}/scan`, {
        method: 'POST',
      });
      const data = await res.json();
      console.log('Scan response:', data);
      
      // Re-fetch database counts
      await fetchData();
    } catch (err) {
      console.error('Scan execution failed:', err);
    } finally {
      setScanningId(null);
    }
  };

  // Demo: push a material change through the full real pipeline (Team A -> Team B -> live feed)
  const handleSimulate = async (companyId: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/companies/${companyId}/simulate-change`, {
        method: 'POST',
      });
      console.log('Simulate response:', await res.json());
      // The resulting alert arrives over Socket.io; refresh counts shortly after.
      setTimeout(fetchData, 1500);
    } catch (err) {
      console.error('Simulate execution failed:', err);
    }
  };

  // Add Watchlist Company
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

  // Format timestamp helper
  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + d.toLocaleDateString();
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* 1. Header Bar */}
      <header className="glass-panel" style={{
        margin: '20px 24px',
        padding: '16px 28px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="glow-primary" style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#060913',
            fontWeight: 800,
            fontSize: '1.25rem',
            letterSpacing: '-0.05em'
          }}>
            FP
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
              Filing<span className="text-gradient">Pulse</span>
            </h1>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Real-time Ingestion & Change Detection Pipeline
            </p>
          </div>
        </div>

        {/* Tab Controls & System Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ display: 'flex', background: 'rgba(6, 9, 19, 0.5)', padding: '4px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
            <button 
              onClick={() => setActiveTab('alerts')}
              style={{
                background: activeTab === 'alerts' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                color: activeTab === 'alerts' ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600,
                transition: 'var(--transition-smooth)'
              }}
            >
              Live Feed
            </button>
            <button 
              onClick={() => setActiveTab('watchlist')}
              style={{
                background: activeTab === 'watchlist' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                color: activeTab === 'watchlist' ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 600,
                transition: 'var(--transition-smooth)'
              }}
            >
              Watchlist
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.03)', padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.04)' }}>
            <span className="pulse-dot"></span>
            <span>Pipeline: <strong style={{ color: 'var(--color-success)' }}>Active</strong></span>
          </div>

          <button 
            onClick={() => setShowAddModal(true)}
            className="glow-primary"
            style={{
              background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
              color: '#060913',
              border: 'none',
              padding: '10px 18px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'var(--transition-smooth)'
            }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"></path></svg>
            Add Company
          </button>
        </div>
      </header>

      {/* 2. Main Content Layout */}
      <main style={{ flex: 1, display: 'flex', padding: '0 24px 24px', gap: '20px', minHeight: 0 }}>
        
        {/* Left Column: Alerts Feed OR Watchlist */}
        <section style={{ flex: 1.4, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {activeTab === 'alerts' ? (
            <div className="glass-panel" style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Real-time Alerts Feed</h2>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Showing {alerts.length} historical records
                </span>
              </div>

              {/* Alerts Scrollable Container */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px', paddingRight: '4px' }}>
                {alerts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
                    <svg width="48" height="48" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ opacity: 0.3, marginBottom: '16px' }}><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    <p style={{ fontWeight: 600 }}>No alert items found yet.</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Add a company and click <strong>Scan Now</strong> to trigger scraping.
                    </p>
                  </div>
                ) : (
                  alerts.map(alert => (
                    <div 
                      key={alert.id}
                      onClick={() => setSelectedAlert(alert)}
                      className={`glass-panel glass-panel-interactive ${selectedAlert?.id === alert.id ? 'glow-primary' : ''}`}
                      style={{
                        padding: '18px 22px',
                        borderLeft: `4px solid ${
                          alert.severity === 'CRITICAL' ? 'var(--color-danger)' : 
                          alert.severity === 'HIGH' ? 'var(--color-warning)' : 
                          alert.severity === 'MEDIUM' ? 'var(--color-secondary)' : 
                          'var(--color-success)'
                        }`,
                        animation: newlyAddedAlertId === alert.id ? 'alertPulse 2s infinite' : undefined,
                        background: newlyAddedAlertId === alert.id ? 'rgba(0, 242, 254, 0.08)' : undefined,
                      }}
                    >
                      <style>{`
                        @keyframes alertPulse {
                          0% { box-shadow: 0 0 0 0 rgba(0, 242, 254, 0.4); }
                          70% { box-shadow: 0 0 0 10px rgba(0, 242, 254, 0); }
                          100% { box-shadow: 0 0 0 0 rgba(0, 242, 254, 0); }
                        }
                      `}</style>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                            <span style={{ 
                              background: 'rgba(255,255,255,0.06)', 
                              padding: '2px 8px', 
                              borderRadius: '4px', 
                              fontSize: '0.75rem', 
                              fontWeight: 800, 
                              color: 'var(--color-primary)',
                              border: '1px solid rgba(255,255,255,0.05)'
                            }}>
                              {alert.company?.ticker || 'TICK'}
                            </span>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                              {alert.company?.name}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>•</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {formatTime(alert.createdAt)}
                            </span>
                          </div>
                          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '4px 0 8px' }}>{alert.title}</h3>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineBreak: 'anywhere' }}>{alert.summary}</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                          <span className={`badge badge-${alert.severity.toLowerCase()}`}>
                            {alert.severity}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Confidence: <strong>{(alert.confidence * 100).toFixed(0)}%</strong>
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* Watchlist View */
            <div className="glass-panel" style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Watchlist Monitor</h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Trigger real-time scrapes and inspect historical change detection snapshots.
                  </p>
                </div>
                <span style={{ fontSize: '0.85rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                  {companies.length} Active Targets
                </span>
              </div>

              {/* Company Grid */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignContent: 'start', paddingRight: '4px' }}>
                {companies.length === 0 ? (
                  <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
                    <p style={{ fontWeight: 600 }}>Watchlist is empty.</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Click <strong>Add Company</strong> to define your target tickers and IR URLs.
                    </p>
                  </div>
                ) : (
                  companies.map(company => {
                    const isScanning = scanningId === company.id;
                    return (
                      <div 
                        key={company.id}
                        className={`glass-panel shimmer`}
                        style={{
                          padding: '20px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          border: isScanning ? '1px solid var(--panel-border-focus)' : undefined
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-primary)' }}>{company.ticker}</span>
                              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>|</span>
                              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{company.name}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <span className="badge badge-info" style={{ textTransform: 'none' }}>
                                Snapshots: {company._count?.snapshots || 0}
                              </span>
                              <span className="badge badge-high" style={{ textTransform: 'none' }}>
                                Alerts: {company._count?.alerts || 0}
                              </span>
                            </div>
                          </div>

                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '6px', margin: '14px 0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <strong style={{ color: 'var(--text-secondary)' }}>IR URL:</strong>
                              <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '220px' }}>
                                {company.irUrl || 'Not configured'}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <strong style={{ color: 'var(--text-secondary)' }}>Filings:</strong>
                              <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '220px' }}>
                                {company.filingsUrl || 'Not configured'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                          <button 
                            disabled={isScanning || !!scanningId}
                            onClick={() => handleScan(company.id)}
                            style={{
                              flex: 1,
                              background: isScanning ? 'rgba(255,255,255,0.05)' : 'rgba(0, 242, 254, 0.1)',
                              color: isScanning ? 'var(--text-muted)' : 'var(--color-primary)',
                              border: `1px solid ${isScanning ? 'rgba(255,255,255,0.05)' : 'rgba(0, 242, 254, 0.3)'}`,
                              padding: '10px',
                              borderRadius: '8px',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              cursor: isScanning || !!scanningId ? 'not-allowed' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              transition: 'var(--transition-smooth)'
                            }}
                          >
                            {isScanning ? (
                              <>
                                <span style={{ width: '12px', height: '12px', border: '2px solid var(--text-muted)', borderTop: '2px solid transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }}></span>
                                <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
                                Scanning...
                              </>
                            ) : (
                              <>
                                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18"></path></svg>
                                Scan Now
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleSimulate(company.id)}
                            title="Demo: push a material change through the full pipeline"
                            style={{
                              background: 'rgba(179, 136, 255, 0.12)',
                              color: 'var(--color-info)',
                              border: '1px solid rgba(179, 136, 255, 0.3)',
                              padding: '10px 14px',
                              borderRadius: '8px',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              whiteSpace: 'nowrap',
                              transition: 'var(--transition-smooth)'
                            }}
                          >
                            Simulate Change
                          </button>

                          <a
                            href={company.irUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid rgba(255,255,255,0.06)',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--text-secondary)'
                            }}
                          >
                            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                          </a>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </section>

        {/* Right Column: Detailed Alert Inspector */}
        <section style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div className="glass-panel" style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {selectedAlert ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                {/* Meta details */}
                <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '16px', marginBottom: '18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span className={`badge badge-${selectedAlert.severity.toLowerCase()}`}>
                      {selectedAlert.severity} Severity
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {formatTime(selectedAlert.createdAt)}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '8px 0' }}>{selectedAlert.title}</h3>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    <strong>{selectedAlert.company?.name}</strong>
                    <span>({selectedAlert.company?.ticker})</span>
                    <span>•</span>
                    <span>Confidence Score: <strong style={{ color: 'var(--color-primary)' }}>{(selectedAlert.confidence * 100).toFixed(0)}%</strong></span>
                  </div>
                </div>

                {/* Body Content */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px', paddingRight: '4px' }}>
                  <div>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Summary</h4>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>{selectedAlert.summary}</p>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Why it Matters (AI Rationale)</h4>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, padding: '12px 16px', background: 'rgba(0, 242, 254, 0.03)', borderRadius: '10px', borderLeft: '3px solid var(--color-primary)' }}>
                      {selectedAlert.whyItMatters}
                    </p>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>What Changed (Unified Diff)</h4>
                    {selectedAlert.whatChanged && (selectedAlert.whatChanged.startsWith('+') || selectedAlert.whatChanged.startsWith('-')) ? (
                      <div className="diff-view">
                        {selectedAlert.whatChanged.split('\n').map((line, idx) => {
                          const isAdd = line.startsWith('+');
                          const isRemove = line.startsWith('-');
                          return (
                            <span 
                              key={idx} 
                              className={`diff-line ${isAdd ? 'diff-line-added' : isRemove ? 'diff-line-removed' : ''}`}
                            >
                              {line}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', background: 'rgba(6,9,19,0.5)', padding: '14px', borderRadius: '8px', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)' }}>{selectedAlert.whatChanged}</p>
                    )}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px', marginTop: '16px', display: 'flex', gap: '10px' }}>
                  <a 
                    href={selectedAlert.sourceLink} 
                    target="_blank" 
                    rel="noreferrer"
                    className="glow-primary"
                    style={{
                      flex: 1,
                      background: 'rgba(0, 242, 254, 0.1)',
                      color: 'var(--color-primary)',
                      border: '1px solid rgba(0, 242, 254, 0.3)',
                      padding: '12px',
                      borderRadius: '10px',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      textDecoration: 'none'
                    }}
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                    Verify Source on Live Portal
                  </a>
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.02)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                  border: '1px solid rgba(255,255,255,0.04)'
                }}>
                  <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ opacity: 0.5 }}><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                </div>
                <h3 style={{ fontWeight: 800, fontSize: '1.05rem', margin: '4px 0' }}>Alert Inspector Panel</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '280px', marginTop: '4px', lineHeight: 1.5 }}>
                  Select any structured alert from the live feed list to analyze the unified code diffs, materiality weights, and source references.
                </p>
              </div>
            )}
          </div>
        </section>

      </main>

      {/* 3. Add Company Modal overlay */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(4, 6, 14, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '520px',
            padding: '32px',
            position: 'relative',
            border: '1px solid rgba(0, 242, 254, 0.15)'
          }}>
            <button 
              onClick={() => setShowAddModal(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>

            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '6px' }}>Add Target to Watchlist</h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
              Define ticker and name. If URLs are left empty, FilingPulse triggers <strong>Bright Data SERP API</strong> to discover investor portals autonomously.
            </p>

            <form onSubmit={handleAddCompany} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>Ticker Symbol (Required)</label>
                <input 
                  type="text" 
                  placeholder="e.g. AAPL" 
                  value={formData.ticker}
                  onChange={e => setFormData({ ...formData, ticker: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'rgba(6, 9, 19, 0.6)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    color: '#fff',
                    fontSize: '0.88rem',
                    outline: 'none',
                    fontFamily: 'var(--font-mono)'
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>Company Name (Required)</label>
                <input 
                  type="text" 
                  placeholder="e.g. Apple Inc." 
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'rgba(6, 9, 19, 0.6)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    color: '#fff',
                    fontSize: '0.88rem',
                    outline: 'none'
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>Investor Relations URL (Optional)</label>
                <input 
                  type="url" 
                  placeholder="https://investor.apple.com..." 
                  value={formData.irUrl}
                  onChange={e => setFormData({ ...formData, irUrl: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'rgba(6, 9, 19, 0.6)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    color: '#fff',
                    fontSize: '0.88rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>SEC Filings URL (Optional)</label>
                <input 
                  type="url" 
                  placeholder="https://www.sec.gov/cgi-bin..." 
                  value={formData.filingsUrl}
                  onChange={e => setFormData({ ...formData, filingsUrl: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'rgba(6, 9, 19, 0.6)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    color: '#fff',
                    fontSize: '0.88rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button 
                  type="button"
                  disabled={addingCompany}
                  onClick={() => setShowAddModal(false)}
                  style={{
                    flex: 1,
                    background: 'rgba(255,255,255,0.04)',
                    color: 'var(--text-secondary)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    padding: '12px',
                    borderRadius: '10px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={addingCompany}
                  className="glow-primary"
                  style={{
                    flex: 1,
                    background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)',
                    color: '#060913',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '10px',
                    fontWeight: 700,
                    cursor: addingCompany ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {addingCompany ? (
                    <>
                      <span style={{ width: '12px', height: '12px', border: '2px solid #060913', borderTop: '2px solid transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }}></span>
                      Discovering with SERP...
                    </>
                  ) : (
                    'Add target'
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
