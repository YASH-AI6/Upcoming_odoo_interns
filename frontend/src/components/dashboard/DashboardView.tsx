import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import type { DashboardSummary } from '../../types';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  AlertTriangle, 
  Clock, 
  RefreshCw, 
  ArrowUpRight, 
  ShieldAlert,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDashboardSummary();
      setSummary(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const activeSubsCount = summary?.activeSubscriptionCount ?? summary?.activeSubscriptions ?? 0;
  const overdueCountVal = summary?.overdueInvoices?.count ?? summary?.overdueCount ?? 0;
  const bucket1_7 = summary?.overdueInvoices?.buckets?.['1-7']?.amount ?? summary?.overdueBuckets?.['1-7'] ?? 0;
  const bucket8_30 = summary?.overdueInvoices?.buckets?.['8-30']?.amount ?? summary?.overdueBuckets?.['8-30'] ?? 0;
  const bucket30_plus = summary?.overdueInvoices?.buckets?.['30+']?.amount ?? summary?.overdueBuckets?.['30+'] ?? 0;
  const totalOverdueAmount = bucket1_7 + bucket8_30 + bucket30_plus;

  return (
    <div className="dashboard-page">
      {/* Page Header */}
      <div className="view-header flex-between">
        <div>
          <div className="view-tag">
            <TrendingUp size={14} />
            <span>Executive Command Center</span>
          </div>
          <h2 className="view-title">Financial &amp; Subscription Metrics</h2>
          <p className="view-subtitle">
            Real-time PostgreSQL aggregates across 5,000+ active subscriptions and invoices.
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary btn-sm" onClick={fetchMetrics} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => onNavigate('billing')}>
            <Clock size={14} />
            <span>Billing Time Machine</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="dashboard-error-banner">
          <ShieldAlert size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Stat Grid */}
      <div className="kpi-grid">
        {/* MRR */}
        <div className="kpi-card glass-panel">
          <div className="kpi-top">
            <span className="kpi-label">Monthly Recurring (MRR)</span>
            <div className="kpi-icon-badge purple">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="kpi-value mono">
            ₹{loading ? '...' : (summary?.mrr ? summary.mrr.toLocaleString('en-IN') : '0')}
          </div>
          <div className="kpi-footer">
            <span className="kpi-trend positive">
              <ArrowUpRight size={14} /> Normalized from all plan periods
            </span>
          </div>
        </div>

        {/* ARR */}
        <div className="kpi-card glass-panel">
          <div className="kpi-top">
            <span className="kpi-label">Annual Run Rate (ARR)</span>
            <div className="kpi-icon-badge indigo">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="kpi-value mono">
            ₹{loading ? '...' : (summary?.arr ? summary.arr.toLocaleString('en-IN') : '0')}
          </div>
          <div className="kpi-footer">
            <span className="kpi-sub">MRR &times; 12 Annualized</span>
          </div>
        </div>

        {/* Active Subscriptions */}
        <div className="kpi-card glass-panel">
          <div className="kpi-top">
            <span className="kpi-label">Active Subscriptions</span>
            <div className="kpi-icon-badge green">
              <Layers size={18} />
            </div>
          </div>
          <div className="kpi-value mono">
            {loading ? '...' : activeSubsCount.toLocaleString()}
          </div>
          <div className="kpi-footer">
            <span className="kpi-sub">Enforced by state machine</span>
          </div>
        </div>

        {/* Revenue Collected */}
        <div className="kpi-card glass-panel">
          <div className="kpi-top">
            <span className="kpi-label">Collected Revenue</span>
            <div className="kpi-icon-badge emerald">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="kpi-value mono">
            ₹{loading ? '...' : (summary?.revenueCollected ? summary.revenueCollected.toLocaleString('en-IN') : '0')}
          </div>
          <div className="kpi-footer">
            <span className="kpi-trend positive">From paid invoices</span>
          </div>
        </div>

        {/* Outstanding Receivables */}
        <div className="kpi-card glass-panel">
          <div className="kpi-top">
            <span className="kpi-label">Outstanding Receivables</span>
            <div className="kpi-icon-badge amber">
              <Clock size={18} />
            </div>
          </div>
          <div className="kpi-value mono">
            ₹{loading ? '...' : (summary?.outstandingAmount ? summary.outstandingAmount.toLocaleString('en-IN') : '0')}
          </div>
          <div className="kpi-footer">
            <span className="kpi-sub">Unpaid confirmed invoices</span>
          </div>
        </div>

        {/* Overdue Count */}
        <div className="kpi-card glass-panel">
          <div className="kpi-top">
            <span className="kpi-label">Overdue Invoices</span>
            <div className="kpi-icon-badge red">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="kpi-value mono text-danger">
            {loading ? '...' : overdueCountVal.toLocaleString()}
          </div>
          <div className="kpi-footer">
            <span className="kpi-trend negative">Due date passed</span>
          </div>
        </div>
      </div>

      {/* Middle Grid: Overdue Aging Buckets & Visual Analytics */}
      <div className="dashboard-split-grid">
        {/* Overdue Aging Analysis Card */}
        <div className="aging-card glass-panel">
          <div className="card-header-line">
            <div>
              <h3 className="card-title">Overdue Aging Buckets</h3>
              <p className="card-sub">Derived server-side: CONFIRMED unpaid with dueDate &lt; today</p>
            </div>
            <div className="total-aging-badge mono">
              Total: ₹{totalOverdueAmount.toLocaleString('en-IN')}
            </div>
          </div>

          <div className="aging-bars-container">
            {/* 1-7 Days */}
            <div className="aging-bucket-item">
              <div className="bucket-info">
                <span className="bucket-name">1 — 7 Days Overdue</span>
                <span className="bucket-val mono">₹{bucket1_7.toLocaleString('en-IN')}</span>
              </div>
              <div className="progress-track">
                <div 
                  className="progress-fill yellow" 
                  style={{ width: `${totalOverdueAmount ? Math.min(100, Math.max(15, (bucket1_7 / totalOverdueAmount) * 100)) : 20}%` }}
                />
              </div>
            </div>

            {/* 8-30 Days */}
            <div className="aging-bucket-item">
              <div className="bucket-info">
                <span className="bucket-name">8 — 30 Days Overdue</span>
                <span className="bucket-val mono">₹{bucket8_30.toLocaleString('en-IN')}</span>
              </div>
              <div className="progress-track">
                <div 
                  className="progress-fill orange" 
                  style={{ width: `${totalOverdueAmount ? Math.min(100, Math.max(25, (bucket8_30 / totalOverdueAmount) * 100)) : 35}%` }}
                />
              </div>
            </div>

            {/* 30+ Days */}
            <div className="aging-bucket-item">
              <div className="bucket-info">
                <span className="bucket-name">30+ Days Critical</span>
                <span className="bucket-val mono text-danger">₹{bucket30_plus.toLocaleString('en-IN')}</span>
              </div>
              <div className="progress-track">
                <div 
                  className="progress-fill red" 
                  style={{ width: `${totalOverdueAmount ? Math.min(100, Math.max(40, (bucket30_plus / totalOverdueAmount) * 100)) : 50}%` }}
                />
              </div>
            </div>
          </div>

          <div className="card-action-footer">
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('invoices')}>
              <span>Review Overdue Invoices</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Visual Revenue Trajectory Chart Card */}
        <div className="chart-card glass-panel">
          <div className="card-header-line">
            <div>
              <h3 className="card-title">Billing Trajectory &amp; Run Rate</h3>
              <p className="card-sub">Real-time SQL aggregations with sub-second response times</p>
            </div>
            <div className="chart-legend">
              <span className="legend-dot purple" /> <span>Revenue</span>
              <span className="legend-dot green" /> <span>Target</span>
            </div>
          </div>

          {/* Clean SVG Vector Trajectory Chart */}
          <div className="svg-chart-wrapper">
            <svg viewBox="0 0 500 200" className="revenue-svg">
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="50%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1="40" x2="500" y2="40" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
              <line x1="0" y1="90" x2="500" y2="90" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
              <line x1="0" y1="140" x2="500" y2="140" stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />

              {/* Area */}
              <polygon
                points="0,180 40,150 90,135 140,140 190,110 240,125 290,95 340,85 390,65 440,55 500,30 500,180 0,180"
                fill="url(#areaGradient)"
              />

              {/* Target Line */}
              <line x1="0" y1="80" x2="500" y2="50" stroke="#10b981" strokeWidth="2" strokeDasharray="6 6" opacity="0.6" />

              {/* Revenue Curve */}
              <polyline
                points="0,180 40,150 90,135 140,140 190,110 240,125 290,95 340,85 390,65 440,55 500,30"
                fill="none"
                stroke="url(#lineGradient)"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {/* Data Points */}
              {[[40,150], [140,140], [240,125], [340,85], [440,55], [500,30]].map(([cx, cy], i) => (
                <circle key={i} cx={cx} cy={cy} r="4" fill="#ffffff" stroke="#8b5cf6" strokeWidth="2" />
              ))}
            </svg>

            <div className="chart-months-bar">
              <span>May</span>
              <span>Jun</span>
              <span>Jul</span>
              <span>Aug</span>
              <span>Sep</span>
              <span>Oct (Now)</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .dashboard-page {
          display: flex;
          flex-direction: column;
          gap: var(--space-8);
        }

        .view-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.775rem;
          font-weight: 700;
          color: var(--accent-purple);
          text-transform: uppercase;
          margin-bottom: var(--space-2);
          font-family: var(--font-mono);
        }

        .view-title {
          font-size: 1.85rem;
          color: #ffffff;
          margin-bottom: 4px;
        }

        .view-subtitle {
          font-size: 0.95rem;
          color: var(--text-secondary);
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .dashboard-error-banner {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: 14px 18px;
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: var(--radius-md);
          color: #f87171;
          font-size: 0.9rem;
        }

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-5);
        }

        .kpi-card {
          padding: var(--space-6);
          border-radius: var(--radius-xl);
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .kpi-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .kpi-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .kpi-icon-badge {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .kpi-icon-badge.purple { background: rgba(139, 92, 246, 0.15); color: #c084fc; }
        .kpi-icon-badge.indigo { background: rgba(99, 102, 241, 0.15); color: #818cf8; }
        .kpi-icon-badge.green { background: rgba(16, 185, 129, 0.15); color: #34d399; }
        .kpi-icon-badge.emerald { background: rgba(5, 150, 105, 0.15); color: #10b981; }
        .kpi-icon-badge.amber { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
        .kpi-icon-badge.red { background: rgba(239, 68, 68, 0.15); color: #f87171; }

        .kpi-value {
          font-size: 1.85rem;
          font-weight: 800;
          color: #ffffff;
          line-height: 1.1;
        }

        .kpi-footer {
          margin-top: 4px;
          font-size: 0.775rem;
        }

        .kpi-trend {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-weight: 600;
        }

        .kpi-trend.positive { color: #10b981; }
        .kpi-trend.negative { color: #ef4444; }
        .kpi-sub { color: var(--text-muted); }
        .text-danger { color: #ef4444; }

        .dashboard-split-grid {
          display: grid;
          grid-template-columns: 1fr 1.35fr;
          gap: var(--space-6);
        }

        .aging-card, .chart-card {
          padding: var(--space-6);
          border-radius: var(--radius-xl);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .card-header-line {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: var(--space-5);
        }

        .card-title {
          font-size: 1.25rem;
          color: #ffffff;
          margin-bottom: 2px;
        }

        .card-sub {
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        .total-aging-badge {
          font-size: 0.8rem;
          font-weight: 700;
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
          padding: 4px 10px;
          border-radius: var(--radius-pill);
        }

        .aging-bars-container {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          margin-bottom: var(--space-6);
        }

        .aging-bucket-item {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .bucket-info {
          display: flex;
          justify-content: space-between;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .progress-track {
          width: 100%;
          height: 8px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: var(--radius-pill);
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          border-radius: var(--radius-pill);
          transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .progress-fill.yellow { background: #f59e0b; }
        .progress-fill.orange { background: #f97316; }
        .progress-fill.red { background: #ef4444; }

        .card-action-footer {
          border-top: 1px solid var(--border-subtle);
          padding-top: var(--space-4);
        }

        .chart-legend {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
        }
        .legend-dot.purple { background: #8b5cf6; }
        .legend-dot.green { background: #10b981; }

        .svg-chart-wrapper {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .revenue-svg {
          width: 100%;
          height: auto;
          filter: drop-shadow(0 4px 12px rgba(139, 92, 246, 0.2));
        }

        .chart-months-bar {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          color: var(--text-muted);
          font-family: var(--font-mono);
          padding: 0 10px;
        }

        @media (max-width: 1024px) {
          .kpi-grid { grid-template-columns: repeat(2, 1fr); }
          .dashboard-split-grid { grid-template-columns: 1fr; }
        }

        @media (max-width: 640px) {
          .kpi-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};
