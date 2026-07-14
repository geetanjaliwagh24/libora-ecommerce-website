import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ShieldCheck, ShieldAlert, CheckCircle, AlertOctagon, RefreshCw, Scale, UserCheck, AlertTriangle } from 'lucide-react';
import { LineChart, BarChart } from '../components/CustomCharts';
import { API_URL } from '../config';

export const AdminDashboard = () => {
  const { token } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [sellers, setSellers] = useState([]);
  const [fraudQueue, setFraudQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('fraud'); // fraud, sellers, analytics
  const [kycModalOpen, setKycModalOpen] = useState(false);
  const [kycSeller, setKycSeller] = useState(null);
  const [kycRejectReason, setKycRejectReason] = useState("");
  
  // Platform revenue calculations
  const platformRevenue = stats?.platform_revenue || 0;

  useEffect(() => {
    if (token) {
      fetchAdminData();
    }
  }, [token]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      
      // Fetch stats
      const statsRes = await fetch(`${API_URL}/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // Fetch sellers
      const sellersRes = await fetch(`${API_URL}/admin/sellers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (sellersRes.ok) {
        const sellersData = await sellersRes.json();
        setSellers(sellersData);
      }

      // Fetch fraud queue
      const fraudRes = await fetch(`${API_URL}/admin/fraud-queue?status=Pending`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (fraudRes.ok) {
        const fraudData = await fraudRes.json();
        setFraudQueue(fraudData);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySeller = async (sellerId, approve) => {
    try {
      const res = await fetch(`${API_URL}/admin/sellers/${sellerId}/verify`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ approve, rejection_reason: kycRejectReason })
      });

      if (res.ok) {
        setKycModalOpen(false);
        setKycSeller(null);
        setKycRejectReason("");
        fetchAdminData();
      } else {
        alert('Failed to update seller verification status');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFraudAction = async (logId, status) => {
    try {
      const res = await fetch(`${API_URL}/admin/fraud-queue/${logId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (res.ok) {
        fetchAdminData();
      } else {
        alert('Failed to update fraud queue case');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading && !stats) {
    return (
      <div style={styles.centerContainer}>
        <div style={styles.loader}></div>
        <p style={{ marginTop: '12px', color: 'var(--text-secondary)' }}>Loading Admin Control Panel...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header with refresh button */}
      <div style={styles.header}>
        <h1 style={styles.pageTitle}>
          Admin Control Center
          <span style={{ color: 'var(--secondary)', marginLeft: '6px' }}><Scale size={24} style={{ display: 'inline' }} /></span>
        </h1>
        <button onClick={fetchAdminData} className="btn-secondary" style={styles.refreshBtn}>
          <RefreshCw size={16} />
          Sync Data
        </button>
      </div>

      {/* Stats Summary row */}
      {stats && (
        <div style={styles.statsRow}>
          <div style={styles.statsCard} className="glass-panel">
            <span style={styles.statsLabel}>Marketplace Revenue</span>
            <h3 style={styles.statsVal}>₹{stats.total_revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</h3>
          </div>
          <div style={styles.statsCard} className="glass-panel">
            <span style={styles.statsLabel}>Total Orders</span>
            <h3 style={styles.statsVal}>{stats.total_orders}</h3>
          </div>
          <div style={styles.statsCard} className="glass-panel">
            <span style={styles.statsLabel}>Flagged Transactions</span>
            <h3 style={{ ...styles.statsVal, color: stats.flagged_orders > 0 ? 'var(--warning)' : 'var(--text-primary)' }}>
              {stats.flagged_orders}
            </h3>
          </div>
          <div style={styles.statsCard} className="glass-panel">
            <span style={styles.statsLabel}>Platform Fraud Ratio</span>
            <h3 style={{ ...styles.statsVal, color: stats.fraud_ratio > 10 ? 'var(--danger)' : stats.fraud_ratio > 0 ? 'var(--warning)' : 'var(--success)' }}>
              {stats.fraud_ratio?.toFixed(1) || 0}%
            </h3>
          </div>
          <div style={styles.statsCard} className="glass-panel">
            <span style={styles.statsLabel}>Platform Earnings (Fees + Coins)</span>
            <h3 style={{ ...styles.statsVal, color: 'var(--success)' }}>
              ₹{platformRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </h3>
          </div>
        </div>
      )}

      {/* Tabs selector */}
      <div style={styles.tabBar}>
        <button
          onClick={() => setActiveTab('fraud')}
          style={{
            ...styles.tabBtn,
            ...(activeTab === 'fraud' ? styles.tabBtnActive : {})
          }}
        >
          <ShieldAlert size={18} />
          Fraud Audit Queue ({fraudQueue.length})
        </button>
        <button
          onClick={() => setActiveTab('sellers')}
          style={{
            ...styles.tabBtn,
            ...(activeTab === 'sellers' ? styles.tabBtnActive : {})
          }}
        >
          <UserCheck size={18} />
          Seller KYC Approvals ({sellers.filter(s => !s.is_kyc_verified).length})
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          style={{
            ...styles.tabBtn,
            ...(activeTab === 'analytics' ? styles.tabBtnActive : {})
          }}
        >
          <Scale size={18} />
          Marketplace Analytics
        </button>
      </div>

      {/* TAB CONTENT: FRAUD QUEUE */}
      {activeTab === 'fraud' && (
        <div style={styles.tabContentPanel}>
          <div style={styles.secHeader}>
            <h2 style={styles.secTitle}>Risk Analysis & Case Management Queue</h2>
            <p style={styles.secSubtitle}>
              Human-in-the-loop review queue of transactions flagged by baseline safety rules. Confirming fraud cancels/refunds the order automatically.
            </p>
          </div>

          {fraudQueue.length > 0 ? (
            <div style={styles.fraudList}>
              {fraudQueue.map((caseLog) => (
                <div key={caseLog.id} style={styles.caseCard} className="glass-panel">
                  {/* Left part: Details */}
                  <div style={styles.caseDetails}>
                    <div style={styles.caseHeaderRow}>
                      <span style={{
                        ...styles.riskBadge,
                        backgroundColor: caseLog.risk_score > 75 ? 'var(--danger-bg)' : 'var(--warning-bg)',
                        color: caseLog.risk_score > 75 ? 'var(--danger)' : 'var(--warning)',
                        border: caseLog.risk_score > 75 ? '1px solid rgba(255, 23, 68, 0.2)' : '1px solid rgba(255, 179, 0, 0.2)'
                      }}>
                        Risk Level: {caseLog.risk_score.toFixed(0)}/100
                      </span>
                      <h3 style={styles.caseTitle}>Order #{caseLog.order_id || 'N/A'} — Flagged by: <u>{caseLog.rule_triggered}</u></h3>
                    </div>

                    <div style={styles.caseMetaRow}>
                      <span>👤 <b>Buyer:</b> {caseLog.user_email} (ID #{caseLog.user_id})</span>
                      {caseLog.seller_business_name && (
                        <span style={{ marginLeft: '20px' }}>🏬 <b>Seller:</b> {caseLog.seller_business_name} (ID #{caseLog.seller_id})</span>
                      )}
                    </div>

                    <div style={styles.reasonBox}>
                      <div style={styles.reasonHeader}>
                        <AlertTriangle size={14} color="var(--warning)" style={{ marginRight: '6px' }} />
                        Model Explanation / Rule Indicator:
                      </div>
                      <p style={styles.reasonText}>{caseLog.details}</p>
                    </div>

                    <span style={styles.caseDate}>Triggered: {new Date(caseLog.created_at).toLocaleString()}</span>
                  </div>

                  {/* Right part: Actions */}
                  <div style={styles.caseActions}>
                    <button
                      onClick={() => handleFraudAction(caseLog.id, 'Dismissed')}
                      className="btn-secondary"
                      style={styles.actionBtnDismiss}
                    >
                      <CheckCircle size={16} />
                      Dismiss Flag (Legit)
                    </button>
                    <button
                      onClick={() => handleFraudAction(caseLog.id, 'Approved')}
                      className="btn-danger"
                      style={styles.actionBtnBlock}
                    >
                      <AlertOctagon size={16} />
                      Confirm Fraud (Refund)
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={styles.emptyQueue} className="glass-panel">
              <ShieldCheck size={48} color="var(--success)" style={{ marginBottom: '16px' }} />
              <h3>All clear! No pending risk cases.</h3>
              <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
                Incoming orders will be evaluated in real-time. Safe transactions pass directly to sellers.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: SELLER KYC */}
      {activeTab === 'sellers' && (
        <div style={styles.tabContentPanel}>
          <div style={styles.secHeader}>
            <h2 style={styles.secTitle}>Seller KYC Moderation</h2>
            <p style={styles.secSubtitle}>
              Review uploads, tax identities, and business records to approve merchant status.
            </p>
          </div>

          {sellers.length > 0 ? (
            <div style={styles.sellersTableContainer} className="glass-panel table-responsive">
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tr}>
                    <th style={styles.th}>ID</th>
                    <th style={styles.th}>Business Name</th>
                    <th style={styles.th}>Email</th>
                    <th style={styles.th}>GSTIN</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>KYC Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sellers.map((s) => (
                    <tr key={s.id} style={styles.tr}>
                      <td style={styles.td}>#{s.id}</td>
                      <td style={styles.td}><b>{s.business_name}</b></td>
                      <td style={styles.td}>{s.email}</td>
                      <td style={styles.td}><code>{s.gstin || 'NOT PROVIDED'}</code></td>
                      <td style={styles.td}>
                        {s.is_kyc_verified ? (
                          <span className="badge badge-success">Verified</span>
                        ) : (
                          <span className="badge badge-warning">Pending KYC Approval</span>
                        )}
                      </td>
                      <td style={styles.td}>
                        {s.is_kyc_verified ? (
                          <button
                            onClick={() => handleVerifySeller(s.id, false)}
                            className="btn-danger"
                            style={styles.tableBtn}
                          >
                            Revoke
                          </button>
                        ) : (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => {
                                setKycSeller(s);
                                setKycModalOpen(true);
                              }}
                              className="btn-primary"
                              style={{ ...styles.tableBtn, background: 'var(--grad-primary)' }}
                            >
                              Review Documents
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={styles.emptyQueue} className="glass-panel">
              <h3>No merchants registered on platform.</h3>
            </div>
          )}
        </div>
      )}

      {activeTab === 'analytics' && stats && (
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              {/* Daily Revenue Timeline */}
              <div style={styles.chartCard} className="glass-panel">
                <h3 style={styles.chartTitle}>📅 Platform Daily Revenue</h3>
                <div style={{ marginTop: '16px' }}>
                  <LineChart 
                    labels={stats.sales_trend?.map(t => t.date) || []} 
                    values={stats.sales_trend?.map(t => t.amount) || []} 
                  />
                </div>
              </div>

              {/* Category Volume Breakdown */}
              <div style={styles.chartCard} className="glass-panel">
                <h3 style={styles.chartTitle}>🗂️ Sales Volume by Category</h3>
                <div style={{ marginTop: '16px' }}>
                  <BarChart 
                    data={stats.category_breakdown?.map(cat => ({ label: cat.name, value: cat.revenue })) || []} 
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KYC REVIEW MODAL */}
      {kycModalOpen && kycSeller && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent} className="glass-panel">
            <h2 style={{ marginBottom: '20px' }}>Review KYC Documents</h2>
            
            <div style={{ marginBottom: '16px' }}>
              <strong>Business Name:</strong>
              <div style={styles.documentField}>{kycSeller.business_name}</div>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <strong>GSTIN (Tax ID):</strong>
              <div style={styles.documentField}>{kycSeller.gstin || 'Not Provided'}</div>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <strong>Bank Details:</strong>
              <div style={styles.documentField}>{kycSeller.bank_details || 'Not Provided'}</div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <strong>Rejection Reason (Optional):</strong>
              <textarea 
                value={kycRejectReason}
                onChange={(e) => setKycRejectReason(e.target.value)}
                placeholder="If rejecting, please provide a reason for the seller..."
                style={{ ...styles.inputField, minHeight: '80px', marginTop: '8px' }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                className="btn-secondary" 
                onClick={() => { setKycModalOpen(false); setKycSeller(null); }}
              >
                Cancel
              </button>
              <button 
                className="btn-danger"
                onClick={() => handleVerifySeller(kycSeller.id, false)}
              >
                Reject KYC
              </button>
              <button 
                className="btn-primary"
                onClick={() => handleVerifySeller(kycSeller.id, true)}
                style={{ background: 'var(--success-bg)', color: 'var(--success)' }}
              >
                Approve Seller
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '40px auto',
    padding: '0 20px',
  },
  centerContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '60vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
  },
  pageTitle: {
    fontSize: '2rem',
    fontWeight: '800',
  },
  refreshBtn: {
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '0.85rem',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '20px',
    marginBottom: '40px',
  },
  statsCard: {
    padding: '20px 24px',
    background: 'rgba(92, 77, 177, 0.05)',
    border: '1px solid rgba(92, 77, 177, 0.12)',
    borderRadius: '12px',
  },
  statsLabel: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    display: 'block',
    marginBottom: '6px',
  },
  statsVal: {
    fontSize: '1.6rem',
    fontWeight: '800',
    color: 'var(--text-primary)',
  },
  tabBar: {
    display: 'flex',
    gap: '12px',
    borderBottom: '1px solid var(--border-color)',
    marginBottom: '30px',
    paddingBottom: '1px',
  },
  tabBtn: {
  },
  reasonBox: {
    background: 'rgba(92, 77, 177, 0.05)',
    border: '1px solid rgba(255, 179, 0, 0.15)',
    borderRadius: '8px',
    padding: '12px 16px',
    marginTop: '6px',
  },
  reasonHeader: {
    fontSize: '0.8rem',
    color: 'var(--warning)',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    marginBottom: '4px',
  },
  reasonText: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
  },
  caseDate: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginTop: '6px',
  },
  caseActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    minWidth: '220px',
  },
  actionBtnDismiss: {
    width: '100%',
    padding: '10px',
    fontSize: '0.85rem',
    borderRadius: '6px',
    justifyContent: 'center',
  },
  actionBtnBlock: {
    width: '100%',
    padding: '10px',
    fontSize: '0.85rem',
    borderRadius: '6px',
    justifyContent: 'center',
  },
  emptyQueue: {
    textAlign: 'center',
    padding: '50px 30px',
  },
  sellersTableContainer: {
    padding: '20px 30px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.9rem',
    textAlign: 'left',
  },
  tr: {
    borderBottom: '1px solid var(--border-color)',
  },
  th: {
    padding: '12px',
    color: 'var(--text-secondary)',
    fontWeight: '600',
  },
  td: {
    padding: '12px',
  },
  tableBtn: {
    fontSize: '0.75rem',
    padding: '5px 12px',
    borderRadius: '4px',
  },
  loader: {
    border: '3px solid rgba(138, 43, 226, 0.1)',
    borderTop: '3px solid var(--secondary)',
    borderRadius: '50%',
    width: '32px',
    height: '32px',
    animation: 'spin 1s linear infinite',
  },
  chartCard: {
    padding: '24px',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
  },
  chartTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    marginBottom: '16px',
    color: 'var(--text-primary)',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(31, 26, 38, 0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  modalContent: {
    width: '500px',
    maxWidth: '90%',
    padding: '32px',
    background: 'var(--surface-elevated)',
    borderRadius: '12px',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)'
  },
  documentField: {
    padding: '12px',
    background: 'var(--bg-app)',
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
    fontFamily: 'monospace',
    marginTop: '8px'
  },
  inputField: {
    width: '100%',
    padding: '12px',
    background: 'var(--bg-app)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    color: 'var(--text-primary)',
    fontFamily: 'inherit'
  }
};

export default AdminDashboard;
