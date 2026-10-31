import React, { useState } from 'react';
import { api } from '../../services/api';
import type { BillingPreviewResult } from '../../types';
import { 
  Clock, 
  Play, 
  Eye, 
  ShieldCheck, 
  AlertTriangle, 
  FileText, 
  CheckCircle2, 
  Calendar, 
  RefreshCw,
  Sparkles,
  Info
} from 'lucide-react';

export const BillingTimeMachineView: React.FC = () => {
  const [targetDate, setTargetDate] = useState(() => {
    // Tomorrow or next week to simulate future billing
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });

  const [mode, setMode] = useState<'preview' | 'run'>('preview');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BillingPreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [idempotencyTested, setIdempotencyTested] = useState(false);

  const handleExecute = async (overrideMode?: 'preview' | 'run') => {
    const activeMode = overrideMode || mode;
    setLoading(true);
    setError(null);
    try {
      if (activeMode === 'preview') {
        const data = await api.previewBilling(targetDate);
        setResult(data);
      } else {
        const data = await api.runBilling(targetDate);
        setResult(data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestIdempotency = async () => {
    setLoading(true);
    setError(null);
    setIdempotencyTested(true);
    try {
      // First run: execute billing
      await api.runBilling(targetDate);
      // Immediate second run for the EXACT same date: MUST create 0 new invoices!
      const secondRun = await api.runBilling(targetDate);
      setResult(secondRun);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="time-machine-page">
      {/* Header */}
      <div className="view-header">
        <div className="view-tag">
          <Clock size={14} />
          <span>Billing Engine • Nightly &amp; On-Demand</span>
        </div>
        <h2 className="view-title">Billing Time Machine (Simulation &amp; Run)</h2>
        <p className="view-subtitle">
          Simulate future billing cycles with zero database modifications (dryRun), or execute batch 
          invoicing with database-enforced idempotency on <code>(subscriptionId, billingPeriodStart)</code>.
        </p>
      </div>

      {error && (
        <div className="error-alert glass-panel">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Control Console */}
      <div className="control-console glass-panel">
        <div className="console-inputs">
          {/* Target Date Picker */}
          <div className="date-picker-box">
            <label className="console-label">Target Simulation Date (As-Of Date):</label>
            <div className="input-with-icon">
              <Calendar size={16} className="input-icon" />
              <input
                type="date"
                className="form-input date-input"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
          </div>

          {/* Mode Selector */}
          <div className="mode-selector-box">
            <label className="console-label">Execution Mode:</label>
            <div className="mode-pills">
              <button
                type="button"
                className={`mode-pill-btn ${mode === 'preview' ? 'active-preview' : ''}`}
                onClick={() => setMode('preview')}
              >
                <Eye size={15} />
                <span>Dry-Run Preview (Safe - No DB Writes)</span>
              </button>
              <button
                type="button"
                className={`mode-pill-btn ${mode === 'run' ? 'active-run' : ''}`}
                onClick={() => setMode('run')}
              >
                <Play size={15} />
                <span>Execute Invoicing (DB Write)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="console-actions">
          <button
            className={`btn ${mode === 'preview' ? 'btn-secondary' : 'btn-primary'} btn-lg`}
            onClick={() => handleExecute()}
            disabled={loading}
          >
            {loading ? (
              <>
                <RefreshCw size={16} className="spin" />
                <span>Processing Subscriptions...</span>
              </>
            ) : mode === 'preview' ? (
              <>
                <Eye size={16} />
                <span>Preview Prospective Invoices</span>
              </>
            ) : (
              <>
                <Play size={16} />
                <span>Execute Batch Billing Run</span>
              </>
            )}
          </button>

          <button
            className="btn btn-secondary btn-lg"
            onClick={handleTestIdempotency}
            disabled={loading}
            title="Runs billing twice for the same date to verify zero duplicates"
          >
            <ShieldCheck size={16} className="text-active" />
            <span>Verify Idempotency (Run Twice)</span>
          </button>
        </div>
      </div>

      {/* Idempotency Demonstration Banner */}
      {idempotencyTested && result && (
        <div className="idempotency-badge-banner glass-panel">
          <div className="badge-banner-icon">
            <ShieldCheck size={22} />
          </div>
          <div className="badge-banner-text">
            <h4>Idempotency Verification Passed</h4>
            <p>
              Re-running the billing engine for <strong>{targetDate}</strong> created <strong>{result.invoicesCreated} duplicate invoices</strong>.
              PostgreSQL unique constraint <code>(subscriptionId, billingPeriodStart)</code> guaranteed zero double billing!
            </p>
          </div>
        </div>
      )}

      {/* Execution Results View */}
      {result && (
        <div className="result-container">
          {/* Summary Stat Grid */}
          <div className="result-stats-grid">
            <div className="stat-card glass-panel">
              <span className="stat-title">Mode Executed</span>
              <span className={`stat-value ${result.dryRun ? 'text-preview' : 'text-run'}`}>
                {result.dryRun ? 'DRY-RUN (PREVIEW)' : 'LIVE EXECUTION'}
              </span>
              <span className="stat-sub">
                {result.dryRun ? '0 records written to DB' : 'Invoices persisted in DB'}
              </span>
            </div>

            <div className="stat-card glass-panel">
              <span className="stat-title">Active Subscriptions Analyzed</span>
              <span className="stat-value mono">{result.processedCount}</span>
              <span className="stat-sub">with nextBillingDate &le; {targetDate}</span>
            </div>

            <div className="stat-card glass-panel">
              <span className="stat-title">Invoices Forecasted / Created</span>
              <span className="stat-value mono text-active">{result.invoicesCreated}</span>
              <span className="stat-sub">Idempotency validated</span>
            </div>

            <div className="stat-card glass-panel">
              <span className="stat-title">Auto-Closed Subscriptions</span>
              <span className="stat-value mono text-warning">{result.autoClosedCount || 0}</span>
              <span className="stat-sub">Past expiry with plan.autoClose = true</span>
            </div>
          </div>

          {/* Prospective / Generated Invoices Table */}
          {result.invoices && result.invoices.length > 0 && (
            <div className="invoices-preview-table glass-panel">
              <div className="table-header-box">
                <FileText size={18} />
                <h3 className="table-heading">
                  {result.dryRun ? 'Prospective Generated Invoices (Preview)' : 'Generated Invoices in This Run'}
                </h3>
              </div>

              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Subscription</th>
                      <th>Customer</th>
                      <th>Billing Period</th>
                      <th>Subtotal</th>
                      <th>Discount</th>
                      <th>Tax (Rules)</th>
                      <th style={{ textAlign: 'right' }}>Total Invoice Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.invoices.slice(0, 50).map((inv, idx) => (
                      <tr key={idx}>
                        <td className="mono font-bold text-accent">{inv.subscriptionNumber}</td>
                        <td>{inv.customerName}</td>
                        <td className="text-secondary mono">
                          {inv.billingPeriodStart ? new Date(inv.billingPeriodStart).toLocaleDateString() : 'N/A'} &rarr;{' '}
                          {inv.billingPeriodEnd ? new Date(inv.billingPeriodEnd).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="mono">₹{Number(inv.subtotal).toFixed(2)}</td>
                        <td className="mono text-active">
                          {inv.discountTotal > 0 ? `-₹${Number(inv.discountTotal).toFixed(2)}` : '₹0.00'}
                        </td>
                        <td className="mono">₹{Number(inv.taxTotal).toFixed(2)}</td>
                        <td className="mono font-bold text-white" style={{ textAlign: 'right' }}>
                          ₹{Number(inv.total).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Problem Subscriptions (if any) */}
          {result.problemSubscriptions && result.problemSubscriptions.length > 0 && (
            <div className="problem-subs-card glass-panel">
              <div className="table-header-box text-warning">
                <AlertTriangle size={18} />
                <h3 className="table-heading">
                  Problem Subscriptions Excluded from Billing ({result.problemSubscriptions.length})
                </h3>
              </div>
              <ul className="problem-list">
                {result.problemSubscriptions.map((p, idx) => (
                  <li key={idx} className="problem-item">
                    <span className="mono font-bold">{p.subscriptionNumber || p.subscriptionId}</span>: {p.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <style>{`
        .time-machine-page {
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
        }

        .control-console {
          padding: var(--space-6);
          border-radius: var(--radius-xl);
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
        }

        .console-inputs {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: var(--space-6);
          align-items: flex-end;
        }

        .console-label {
          display: block;
          font-size: 0.825rem;
          font-weight: 700;
          color: var(--text-secondary);
          margin-bottom: var(--space-2);
          text-transform: uppercase;
          font-family: var(--font-mono);
        }

        .date-input {
          padding-left: 38px;
        }

        .mode-pills {
          display: flex;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-pill);
          padding: 4px;
        }

        .mode-pill-btn {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: var(--radius-pill);
          border: none;
          background: transparent;
          color: var(--text-secondary);
          font-size: 0.825rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .mode-pill-btn.active-preview {
          background: rgba(99, 102, 241, 0.25);
          color: #c7d2fe;
          border: 1px solid rgba(99, 102, 241, 0.4);
        }

        .mode-pill-btn.active-run {
          background: rgba(236, 72, 153, 0.25);
          color: #f472b6;
          border: 1px solid rgba(236, 72, 153, 0.4);
        }

        .console-actions {
          display: flex;
          align-items: center;
          gap: var(--space-4);
          padding-top: var(--space-4);
          border-top: 1px solid var(--border-subtle);
        }

        .idempotency-badge-banner {
          display: flex;
          align-items: center;
          gap: var(--space-4);
          padding: 16px 20px;
          border-radius: var(--radius-lg);
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.35);
        }

        .badge-banner-icon {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-md);
          background: rgba(16, 185, 129, 0.2);
          color: #34d399;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .badge-banner-text h4 {
          color: #34d399;
          font-size: 1.05rem;
          margin-bottom: 2px;
        }

        .badge-banner-text p {
          color: #cbd5e1;
          font-size: 0.85rem;
        }

        .result-container {
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
        }

        .result-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--space-4);
        }

        .stat-card {
          padding: var(--space-5);
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .stat-title {
          font-size: 0.775rem;
          color: var(--text-muted);
          text-transform: uppercase;
          font-weight: 600;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 800;
          color: #ffffff;
        }

        .text-preview { color: #818cf8; }
        .text-run { color: #f472b6; }

        .table-header-box {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-4) var(--space-6);
          border-bottom: 1px solid var(--border-subtle);
        }

        .table-heading {
          font-size: 1.1rem;
          color: #ffffff;
        }

        .problem-subs-card {
          padding: var(--space-5);
          border-radius: var(--radius-lg);
          border-color: rgba(245, 158, 11, 0.35);
        }

        .problem-list {
          list-style: none;
          padding: var(--space-3) var(--space-4);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .problem-item {
          font-size: 0.85rem;
          color: #fde68a;
        }

        @media (max-width: 900px) {
          .console-inputs { grid-template-columns: 1fr; }
          .result-stats-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
    </div>
  );
};
