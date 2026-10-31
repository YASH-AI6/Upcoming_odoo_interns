import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import type { Invoice, Payment, Subscription } from '../../types';
import { Badge } from '../common/Badge';
import confetti from 'canvas-confetti';
import { 
  UserCheck, 
  Layers, 
  FileText, 
  CreditCard, 
  Download, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  LogIn,
  Pause,
  Play,
  XCircle,
  Clock
} from 'lucide-react';

interface CustomerPortalViewProps {
  onOpenAuth: () => void;
}

export const CustomerPortalView: React.FC<CustomerPortalViewProps> = ({ onOpenAuth }) => {
  const { user, isAuthenticated, switchDemoRole } = useAuth();

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'subs' | 'invoices' | 'payments'>('subs');

  // Customer Pay Modal
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payLoading, setPayLoading] = useState(false);
  const [paySuccess, setPaySuccess] = useState<string | null>(null);

  const isCustomer = user?.role === 'CUSTOMER';

  const loadPortalData = async () => {
    if (!isAuthenticated || !isCustomer) return;
    setLoading(true);
    setError(null);
    try {
      const [subs, invs, pays] = await Promise.all([
        api.getPortalSubscriptions(),
        api.getPortalInvoices(),
        api.getPortalPayments()
      ]);
      setSubscriptions(subs);
      setInvoices(invs);
      setPayments(pays);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortalData();
  }, [isAuthenticated, user?.role]);

  const handlePayInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingInvoice) return;
    setPayLoading(true);
    setError(null);
    try {
      const amount = parseFloat(payAmount);
      const res = await api.createPayment(payingInvoice.id, {
        amount,
        method: 'CUSTOMER_PORTAL_CARD',
        note: 'Customer instant portal settlement'
      });

      if (res.invoiceStatus === 'PAID') {
        confetti({ particleCount: 90, spread: 65, origin: { y: 0.6 } });
        setPaySuccess(`Invoice ${payingInvoice.number} settled in full! Thank you!`);
      } else {
        setPaySuccess(`Partial payment of ₹${amount} received.`);
      }

      setPayingInvoice(null);
      await loadPortalData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPayLoading(false);
    }
  };

  const handleSubPause = async (id: string) => {
    try {
      await api.pauseSubscription(id);
      await loadPortalData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSubResume = async (id: string) => {
    try {
      await api.resumeSubscription(id);
      await loadPortalData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!isAuthenticated || !isCustomer) {
    return (
      <div className="portal-unauth glass-panel">
        <div className="unauth-icon-box">
          <UserCheck size={36} />
        </div>
        <h2 className="unauth-title">Customer Self-Service Portal</h2>
        <p className="unauth-desc">
          Server-side scoped access: View only your personal subscriptions, invoices, and payment receipts.
        </p>
        <div className="unauth-actions">
          <button className="btn btn-primary btn-lg" onClick={() => switchDemoRole('CUSTOMER')}>
            <span>Switch to Customer Demo (customer1@business.org)</span>
          </button>
          <button className="btn btn-secondary btn-lg" onClick={onOpenAuth}>
            <LogIn size={16} />
            <span>Sign In with Custom Account</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-page">
      {/* Portal Customer Banner */}
      <div className="portal-banner glass-panel">
        <div className="banner-user">
          <div className="avatar-circle">
            {user.name.charAt(0)}
          </div>
          <div>
            <h2 className="banner-name">{user.name}</h2>
            <div className="banner-sub">
              <span>{user.email}</span> &bull; <span className="mono text-active">Verified Customer Account</span>
            </div>
          </div>
        </div>
        <div className="banner-stats">
          <div className="b-stat">
            <span className="b-label">My Subscriptions</span>
            <span className="b-val mono">{subscriptions.length}</span>
          </div>
          <div className="b-stat">
            <span className="b-label">Total Invoices</span>
            <span className="b-val mono">{invoices.length}</span>
          </div>
          <div className="b-stat">
            <span className="b-label">Payments Made</span>
            <span className="b-val mono">{payments.length}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-error glass-panel">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {paySuccess && (
        <div className="alert alert-success glass-panel">
          <CheckCircle size={18} />
          <span>{paySuccess}</span>
        </div>
      )}

      {/* Portal Tabs */}
      <div className="portal-tab-bar">
        <button
          className={`portal-tab ${activeTab === 'subs' ? 'active' : ''}`}
          onClick={() => setActiveTab('subs')}
        >
          <Layers size={16} />
          <span>My Subscriptions ({subscriptions.length})</span>
        </button>
        <button
          className={`portal-tab ${activeTab === 'invoices' ? 'active' : ''}`}
          onClick={() => setActiveTab('invoices')}
        >
          <FileText size={16} />
          <span>Invoices &amp; Billing ({invoices.length})</span>
        </button>
        <button
          className={`portal-tab ${activeTab === 'payments' ? 'active' : ''}`}
          onClick={() => setActiveTab('payments')}
        >
          <CreditCard size={16} />
          <span>Payment History ({payments.length})</span>
        </button>
      </div>

      {/* Subscriptions Tab */}
      {activeTab === 'subs' && (
        <div className="table-container glass-panel">
          <table className="data-table">
            <thead>
              <tr>
                <th>Subscription #</th>
                <th>Plan Tier</th>
                <th>Period</th>
                <th>Next Billing Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Controls</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No subscriptions registered for your account.
                  </td>
                </tr>
              ) : (
                subscriptions.map((s) => (
                  <tr key={s.id}>
                    <td className="mono font-bold text-accent">{s.number}</td>
                    <td className="font-semibold">{s.plan?.name}</td>
                    <td>
                      <span className="badge badge-draft">{s.plan?.billingPeriod}</span>
                    </td>
                    <td className="mono text-secondary">
                      {s.nextBillingDate ? new Date(s.nextBillingDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td>
                      <Badge status={s.status} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="action-button-group">
                        {s.status === 'ACTIVE' && s.plan?.pausable && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleSubPause(s.id)}
                          >
                            <Pause size={13} />
                            <span>Pause</span>
                          </button>
                        )}
                        {s.status === 'PAUSED' && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleSubResume(s.id)}
                          >
                            <Play size={13} />
                            <span>Resume</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <div className="table-container glass-panel">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Billing Period</th>
                <th>Due Date</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No invoices generated yet.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const balanceDue = Number(inv.total) - Number(inv.amountPaid);
                  return (
                    <tr key={inv.id}>
                      <td className="mono font-bold text-accent">{inv.number}</td>
                      <td className="mono text-secondary">
                        {new Date(inv.billingPeriodStart).toLocaleDateString()} &rarr; {new Date(inv.billingPeriodEnd).toLocaleDateString()}
                      </td>
                      <td className="mono">{new Date(inv.dueDate).toLocaleDateString()}</td>
                      <td className="mono font-bold">₹{Number(inv.total).toFixed(2)}</td>
                      <td className="mono text-active font-semibold">₹{Number(inv.amountPaid).toFixed(2)}</td>
                      <td>
                        <Badge status={inv.status} />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="action-button-group">
                          <a
                            href={api.getInvoicePdfUrl(inv.id)}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-icon"
                            title="Download Official PDF Receipt"
                          >
                            <Download size={14} />
                          </a>

                          {inv.status === 'CONFIRMED' && balanceDue > 0 && (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => {
                                setPayingInvoice(inv);
                                setPayAmount(balanceDue.toFixed(2));
                              }}
                            >
                              <CreditCard size={13} />
                              <span>Pay ₹{balanceDue.toFixed(2)}</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Payments History Tab */}
      {activeTab === 'payments' && (
        <div className="table-container glass-panel">
          <table className="data-table">
            <thead>
              <tr>
                <th>Payment Date</th>
                <th>Method</th>
                <th>Note</th>
                <th style={{ textAlign: 'right' }}>Amount Paid</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    No payments found in history.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id}>
                    <td className="mono">{new Date(p.date).toLocaleString()}</td>
                    <td>
                      <span className="badge badge-paid">{p.method}</span>
                    </td>
                    <td className="text-secondary">{p.note || 'Settlement'}</td>
                    <td className="mono font-bold text-active" style={{ textAlign: 'right' }}>
                      ₹{Number(p.amount).toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Customer Quick Pay Modal */}
      {payingInvoice && (
        <div className="modal-overlay" onClick={() => setPayingInvoice(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Pay Invoice {payingInvoice.number}</h3>
            <p className="modal-subtitle">Instant online checkout simulation.</p>

            <form onSubmit={handlePayInvoice} className="modal-form">
              <div className="form-group">
                <label className="form-label">Payment Amount (INR)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  className="form-input mono"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setPayingInvoice(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={payLoading}>
                  {payLoading ? 'Processing...' : 'Pay with Simulated Card &rarr;'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .portal-page {
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
        }

        .portal-unauth {
          padding: 64px 32px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-4);
          max-width: 680px;
          margin: 40px auto;
          border-radius: var(--radius-xl);
        }

        .unauth-icon-box {
          width: 72px;
          height: 72px;
          border-radius: var(--radius-xl);
          background: rgba(99, 102, 241, 0.15);
          color: #818cf8;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: var(--space-2);
        }

        .unauth-title {
          font-size: 1.85rem;
          color: #ffffff;
        }

        .unauth-desc {
          font-size: 1rem;
          color: var(--text-secondary);
          max-width: 480px;
        }

        .unauth-actions {
          display: flex;
          align-items: center;
          gap: var(--space-4);
          margin-top: var(--space-4);
          flex-wrap: wrap;
          justify-content: center;
        }

        .portal-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-6) var(--space-8);
          border-radius: var(--radius-xl);
          flex-wrap: wrap;
          gap: var(--space-4);
        }

        .banner-user {
          display: flex;
          align-items: center;
          gap: var(--space-4);
        }

        .avatar-circle {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: var(--gradient-brand);
          color: #ffffff;
          font-size: 1.4rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .banner-name {
          font-size: 1.5rem;
          color: #ffffff;
          margin-bottom: 2px;
        }

        .banner-sub {
          font-size: 0.85rem;
          color: var(--text-muted);
        }

        .banner-stats {
          display: flex;
          align-items: center;
          gap: var(--space-6);
        }

        .b-stat {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }

        .b-label {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .b-val {
          font-size: 1.4rem;
          font-weight: 800;
          color: #ffffff;
        }

        .portal-tab-bar {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          border-bottom: 1px solid var(--border-subtle);
          padding-bottom: var(--space-2);
        }

        .portal-tab {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: transparent;
          border: none;
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          font-size: 0.9rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .portal-tab:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.04);
        }

        .portal-tab.active {
          color: #ffffff;
          background: rgba(99, 102, 241, 0.18);
          border: 1px solid rgba(99, 102, 241, 0.35);
        }
      `}</style>
    </div>
  );
};
