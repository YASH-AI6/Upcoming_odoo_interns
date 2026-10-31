import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import type { Customer, Plan, QuotationTemplate, Subscription } from '../../types';
import { Badge } from '../common/Badge';
import { 
  Layers, 
  Search, 
  Filter, 
  Plus, 
  RefreshCw, 
  CheckCircle, 
  Play, 
  Pause, 
  XCircle, 
  RotateCw, 
  ChevronDown, 
  ChevronUp, 
  AlertCircle,
  FileCheck,
  Calendar,
  Sparkles
} from 'lucide-react';

export const SubscriptionsView: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [templates, setTemplates] = useState<QuotationTemplate[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  const loadSubscriptions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getSubscriptions({ status: statusFilter, search, limit: 50 });
      setSubscriptions(res.subscriptions);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDropdownData = async () => {
    try {
      const [pl, tm, cs] = await Promise.all([
        api.getPlans(),
        api.getTemplates(),
        api.getCustomers()
      ]);
      setPlans(pl);
      setTemplates(tm);
      setCustomers(cs);
      if (cs.length > 0) setSelectedCustomerId(cs[0].id);
      if (pl.length > 0) setSelectedPlanId(pl[0].id);
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, [statusFilter]);

  useEffect(() => {
    loadDropdownData();
  }, []);

  const handleAction = async (id: string, action: 'confirm' | 'activate' | 'pause' | 'resume' | 'close' | 'renew') => {
    setActionLoading(`${id}-${action}`);
    setError(null);
    try {
      if (action === 'confirm') await api.confirmSubscription(id);
      else if (action === 'activate') await api.activateSubscription(id);
      else if (action === 'pause') await api.pauseSubscription(id);
      else if (action === 'resume') await api.resumeSubscription(id);
      else if (action === 'close') await api.closeSubscription(id);
      else if (action === 'renew') await api.renewSubscription(id);

      await loadSubscriptions();
    } catch (err: any) {
      setError(`State Machine: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (selectedTemplateId) {
        // Create from template
        await api.createSubscription({
          customerId: selectedCustomerId,
          templateId: selectedTemplateId,
          startDate
        });
      } else {
        // Create custom subscription
        await api.createSubscription({
          customerId: selectedCustomerId,
          planId: selectedPlanId,
          startDate,
          lines: [
            {
              productId: 'prod-0', // Default product will resolve or use template
              quantity: 1
            }
          ]
        });
      }
      setIsModalOpen(false);
      await loadSubscriptions();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="subscriptions-page">
      {/* View Header */}
      <div className="view-header flex-between">
        <div>
          <div className="view-tag">
            <Layers size={14} />
            <span>Lifecycle Management</span>
          </div>
          <h2 className="view-title">Subscription Registry &amp; State Machine</h2>
          <p className="view-subtitle">
            Sequential numbering (SUB-0001 style), plan flag enforcement, and strict state transitions.
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary btn-sm" onClick={loadSubscriptions} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setIsModalOpen(true)}>
            <Plus size={16} />
            <span>New Subscription</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="error-alert glass-panel">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="filter-search-bar glass-panel">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search by number (e.g. SUB-0001) or customer..."
            className="search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadSubscriptions()}
          />
        </div>

        <div className="status-chips">
          {['ALL', 'ACTIVE', 'CONFIRMED', 'PAUSED', 'DRAFT', 'QUOTATION', 'CLOSED'].map((st) => (
            <button
              key={st}
              className={`status-chip-btn ${statusFilter === st ? 'active' : ''}`}
              onClick={() => setStatusFilter(st)}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Subscriptions Data Table */}
      <div className="table-container glass-panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Subscription #</th>
              <th>Customer</th>
              <th>Plan Period</th>
              <th>Next Billing</th>
              <th>Status</th>
              <th>Lines</th>
              <th style={{ textAlign: 'right' }}>State Machine Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '32px' }}>
                  <RefreshCw size={24} className="spin" style={{ margin: '0 auto 8px', color: '#818cf8' }} />
                  <div>Querying subscription database...</div>
                </td>
              </tr>
            ) : subscriptions.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  No subscriptions found matching the filter.
                </td>
              </tr>
            ) : (
              subscriptions.map((sub) => {
                const isExpanded = expandedId === sub.id;
                return (
                  <React.Fragment key={sub.id}>
                    <tr>
                      <td className="mono font-bold text-accent">
                        <button 
                          className="expand-btn"
                          onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          <span>{sub.number}</span>
                        </button>
                      </td>
                      <td>
                        <div className="customer-cell">
                          <span className="customer-name">{sub.customer?.name || 'Customer'}</span>
                          <span className="customer-email">{sub.customer?.email}</span>
                        </div>
                      </td>
                      <td>
                        <div className="plan-cell">
                          <span className="plan-name">{sub.plan?.name}</span>
                          <span className="plan-period badge badge-draft">{sub.plan?.billingPeriod}</span>
                        </div>
                      </td>
                      <td className="mono text-secondary">
                        {sub.nextBillingDate ? new Date(sub.nextBillingDate).toLocaleDateString() : 'N/A'}
                      </td>
                      <td>
                        <Badge status={sub.status} />
                      </td>
                      <td className="text-muted mono">
                        {sub.lines?.length || 0} line(s)
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="action-button-group">
                          {/* DRAFT or QUOTATION -> CONFIRMED */}
                          {(sub.status === 'DRAFT' || sub.status === 'QUOTATION') && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleAction(sub.id, 'confirm')}
                              disabled={!!actionLoading}
                            >
                              <CheckCircle size={13} className="text-active" />
                              <span>Confirm</span>
                            </button>
                          )}

                          {/* CONFIRMED -> ACTIVE */}
                          {sub.status === 'CONFIRMED' && (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleAction(sub.id, 'activate')}
                              disabled={!!actionLoading}
                            >
                              <Play size={13} />
                              <span>Activate</span>
                            </button>
                          )}

                          {/* ACTIVE -> PAUSED (plan.pausable) */}
                          {sub.status === 'ACTIVE' && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleAction(sub.id, 'pause')}
                              disabled={!!actionLoading}
                              title={sub.plan?.pausable ? 'Pause Subscription' : 'Plan is not pausable'}
                            >
                              <Pause size={13} />
                              <span>Pause</span>
                            </button>
                          )}

                          {/* PAUSED -> ACTIVE */}
                          {sub.status === 'PAUSED' && (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleAction(sub.id, 'resume')}
                              disabled={!!actionLoading}
                            >
                              <Play size={13} />
                              <span>Resume</span>
                            </button>
                          )}

                          {/* ACTIVE / PAUSED -> CLOSED (plan.closable) */}
                          {(sub.status === 'ACTIVE' || sub.status === 'PAUSED') && (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleAction(sub.id, 'close')}
                              disabled={!!actionLoading}
                              title={sub.plan?.closable ? 'Close Subscription' : 'Plan is not closable'}
                            >
                              <XCircle size={13} />
                              <span>Close</span>
                            </button>
                          )}

                          {/* CLOSED -> RENEW (plan.renewable) */}
                          {sub.status === 'CLOSED' && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleAction(sub.id, 'renew')}
                              disabled={!!actionLoading}
                              title={sub.plan?.renewable ? 'Renew Subscription' : 'Plan is not renewable'}
                            >
                              <RotateCw size={13} />
                              <span>Renew</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Line Details */}
                    {isExpanded && (
                      <tr className="expanded-row">
                        <td colSpan={7}>
                          <div className="sub-lines-preview glass-panel">
                            <div className="lines-header">
                              <span className="lines-title">Subscription Products &amp; Variants</span>
                              <div className="plan-flags">
                                <span className={`flag-chip ${sub.plan?.pausable ? 'ok' : 'no'}`}>
                                  Pausable: {sub.plan?.pausable ? 'Yes' : 'No'}
                                </span>
                                <span className={`flag-chip ${sub.plan?.closable ? 'ok' : 'no'}`}>
                                  Closable: {sub.plan?.closable ? 'Yes' : 'No'}
                                </span>
                                <span className={`flag-chip ${sub.plan?.renewable ? 'ok' : 'no'}`}>
                                  Renewable: {sub.plan?.renewable ? 'Yes' : 'No'}
                                </span>
                                <span className={`flag-chip ${sub.plan?.autoClose ? 'ok' : 'no'}`}>
                                  Auto-Close: {sub.plan?.autoClose ? 'Yes' : 'No'}
                                </span>
                              </div>
                            </div>

                            <table className="lines-table">
                              <thead>
                                <tr>
                                  <th>Product</th>
                                  <th>Variant</th>
                                  <th>Quantity</th>
                                  <th>Unit Price</th>
                                  <th>Tax</th>
                                  <th>Total Amount</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sub.lines && sub.lines.length > 0 ? (
                                  sub.lines.map((l) => (
                                    <tr key={l.id}>
                                      <td className="font-semibold">{l.product?.name || 'Standard Product'}</td>
                                      <td>
                                        {l.variant ? (
                                          <span className="badge badge-confirmed">
                                            {l.variant.attribute}: {l.variant.value} (+₹{l.variant.extraPrice})
                                          </span>
                                        ) : (
                                          <span className="text-muted">Standard</span>
                                        )}
                                      </td>
                                      <td className="mono">{l.quantity}</td>
                                      <td className="mono">₹{Number(l.unitPrice).toFixed(2)}</td>
                                      <td className="mono">₹{Number(l.tax).toFixed(2)}</td>
                                      <td className="mono font-bold">₹{Number(l.amount).toFixed(2)}</td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td colSpan={6} className="text-muted">No line items in this subscription.</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* New Subscription Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Create New Subscription</h3>
            <p className="modal-subtitle">
              Prefill plan and lines from a Quotation Template, or configure custom subscription parameters.
            </p>

            <form onSubmit={handleCreate} className="modal-form">
              <div className="form-group">
                <label className="form-label">Customer</label>
                <select
                  className="form-select"
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  required
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Quotation Template (Recommended)</label>
                <select
                  className="form-select"
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                >
                  <option value="">None (Custom Configuration)</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (Plan: {t.plan?.name}, Validity: {t.validityDays} days)
                    </option>
                  ))}
                </select>
                <span className="form-hint">
                  Selecting a template automatically hydrates the Plan, Product lines, and Quotation validity.
                </span>
              </div>

              {!selectedTemplateId && (
                <div className="form-group">
                  <label className="form-label">Subscription Plan</label>
                  <select
                    className="form-select"
                    value={selectedPlanId}
                    onChange={(e) => setSelectedPlanId(e.target.value)}
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — ₹{p.price} / {p.billingPeriod}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Subscription &rarr;
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .subscriptions-page {
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
        }

        .error-alert {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: 12px 16px;
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.35);
          border-radius: var(--radius-md);
          color: #f87171;
          font-size: 0.9rem;
        }

        .filter-search-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 18px;
          border-radius: var(--radius-lg);
          gap: var(--space-4);
          flex-wrap: wrap;
        }

        .search-box {
          position: relative;
          display: flex;
          align-items: center;
          flex: 1;
          min-width: 280px;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          color: var(--text-muted);
        }

        .search-input {
          width: 100%;
          padding: 8px 12px 8px 36px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          color: #ffffff;
          font-size: 0.875rem;
          outline: none;
        }

        .search-input:focus {
          border-color: var(--accent-primary);
        }

        .status-chips {
          display: flex;
          align-items: center;
          gap: 6px;
          overflow-x: auto;
        }

        .status-chip-btn {
          padding: 6px 12px;
          border-radius: var(--radius-pill);
          border: 1px solid var(--border-subtle);
          background: transparent;
          color: var(--text-secondary);
          font-size: 0.775rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .status-chip-btn:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.05);
        }

        .status-chip-btn.active {
          background: rgba(99, 102, 241, 0.2);
          color: #c7d2fe;
          border-color: rgba(99, 102, 241, 0.4);
        }

        .expand-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: none;
          color: #818cf8;
          font-family: var(--font-mono);
          font-weight: 700;
          cursor: pointer;
        }

        .customer-cell, .plan-cell {
          display: flex;
          flex-direction: column;
        }

        .customer-name, .plan-name {
          font-weight: 600;
          color: #ffffff;
        }

        .customer-email {
          font-size: 0.775rem;
          color: var(--text-muted);
        }

        .plan-period {
          width: fit-content;
          margin-top: 3px;
        }

        .action-button-group {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .expanded-row td {
          background: rgba(0, 0, 0, 0.25);
          padding: var(--space-4);
        }

        .sub-lines-preview {
          padding: var(--space-4);
          border-radius: var(--radius-md);
        }

        .lines-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--space-3);
        }

        .lines-title {
          font-size: 0.85rem;
          font-weight: 700;
          color: #c7d2fe;
          text-transform: uppercase;
          font-family: var(--font-mono);
        }

        .plan-flags {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }

        .flag-chip {
          font-size: 0.7rem;
          padding: 2px 8px;
          border-radius: var(--radius-pill);
          font-family: var(--font-mono);
        }

        .flag-chip.ok { background: rgba(16, 185, 129, 0.15); color: #34d399; }
        .flag-chip.no { background: rgba(148, 163, 184, 0.1); color: #94a3b8; }

        .lines-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.825rem;
        }

        .lines-table th {
          text-align: left;
          padding: 8px 12px;
          color: var(--text-muted);
          border-bottom: 1px solid var(--border-subtle);
          font-size: 0.75rem;
          text-transform: uppercase;
        }

        .lines-table td {
          padding: 8px 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          color: var(--text-primary);
        }

        .modal-title {
          font-size: 1.4rem;
          color: #ffffff;
          margin-bottom: 4px;
        }

        .modal-subtitle {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin-bottom: var(--space-5);
        }

        .modal-form {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }

        .form-hint {
          font-size: 0.75rem;
          color: var(--accent-purple);
          margin-top: 4px;
        }

        .modal-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: var(--space-3);
          margin-top: var(--space-4);
          padding-top: var(--space-4);
          border-top: 1px solid var(--border-subtle);
        }
      `}</style>
    </div>
  );
};
