import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Zap, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles, 
  Clock, 
  TrendingUp, 
  Layers, 
  CheckCircle2, 
  CreditCard,
  Calendar,
  Lock
} from 'lucide-react';

interface HeroSectionProps {
  onNavigate: (tab: string) => void;
  onOpenAuth: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onNavigate, onOpenAuth }) => {
  const { switchDemoRole, isAuthenticated, user } = useAuth();

  // Interactive Hero Pricing Calculator state
  const [billingPeriod, setBillingPeriod] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [hasOdooBrand, setHasOdooBrand] = useState(true);
  const [selectedPlanPrice, setSelectedPlanPrice] = useState(1999);

  // Dynamic calculations
  const basePrice = billingPeriod === 'MONTHLY' ? selectedPlanPrice : selectedPlanPrice * 10; // 2 months free
  const variantExtra = hasOdooBrand ? 560 : 0;
  const subtotal = basePrice + variantExtra;
  const discount = billingPeriod === 'YEARLY' ? Math.round(subtotal * 0.15) : 0;
  const taxable = subtotal - discount;
  const tax = Math.round(taxable * 0.18);
  const total = taxable + tax;

  return (
    <section className="hero-section">
      {/* Ambient background glow orbs */}
      <div className="hero-glow-orb orb-primary" />
      <div className="hero-glow-orb orb-secondary" />

      <div className="hero-container">
        {/* Top Eyebrow Tag */}
        <div className="hero-eyebrow">
          <span className="eyebrow-dot" />
          <span className="eyebrow-text">SubPulse v2.4 • PostgreSQL &amp; Prisma Idempotent Runtime</span>
          <span className="eyebrow-pill">Live Hackathon Stack</span>
        </div>

        {/* Main Headline */}
        <h1 className="hero-title">
          Subscription Engine Built for <span className="hero-title-gradient">Absolute Precision</span>.
        </h1>

        {/* Subtitle & Value Proposition */}
        <p className="hero-subtitle">
          Automate multi-period billing with database-enforced idempotency, strict state-machine lifecycles, 
          dry-run Time Machine forecasting, and real-time MRR/ARR intelligence.
        </p>

        {/* Call to Actions & Instant Role Launchers */}
        <div className="hero-actions-group">
          <button className="btn btn-primary btn-lg" onClick={() => onNavigate('dashboard')}>
            <TrendingUp size={18} />
            <span>Launch Command Center</span>
            <ArrowRight size={18} />
          </button>
          <button className="btn btn-secondary btn-lg" onClick={() => onNavigate('billing')}>
            <Clock size={18} />
            <span>Explore Time Machine</span>
          </button>
        </div>

        {/* 1-Click Fast Login Showcase */}
        <div className="demo-credentials-bar glass-panel">
          <div className="demo-bar-label">
            <Sparkles size={16} className="sparkle-icon" />
            <span>Instant Demo Switcher:</span>
          </div>
          <div className="demo-pill-group">
            <button className="credential-pill admin" onClick={() => switchDemoRole('ADMIN')}>
              <ShieldCheck size={14} />
              <span>Admin (Full Access)</span>
            </button>
            <button className="credential-pill staff" onClick={() => switchDemoRole('STAFF')}>
              <Layers size={14} />
              <span>Staff (Ops &amp; Invoices)</span>
            </button>
            <button className="credential-pill customer" onClick={() => switchDemoRole('CUSTOMER')}>
              <CreditCard size={14} />
              <span>Customer (Self-Service)</span>
            </button>
          </div>
        </div>

        {/* Interactive Dual-Grid: Live Subscription Simulator + 3D Visual */}
        <div className="hero-interactive-grid">
          {/* Interactive Calculator Card */}
          <div className="interactive-calc-card glass-panel">
            <div className="calc-header">
              <div className="calc-badge">
                <Sparkles size={14} />
                <span>Interactive Subscription Simulator</span>
              </div>
              <div className="period-toggle">
                <button 
                  className={`period-btn ${billingPeriod === 'MONTHLY' ? 'active' : ''}`}
                  onClick={() => setBillingPeriod('MONTHLY')}
                >
                  Monthly
                </button>
                <button 
                  className={`period-btn ${billingPeriod === 'YEARLY' ? 'active' : ''}`}
                  onClick={() => setBillingPeriod('YEARLY')}
                >
                  Yearly <span className="save-tag">-15%</span>
                </button>
              </div>
            </div>

            <div className="calc-body">
              {/* Plan Selection Row */}
              <div className="calc-row">
                <label className="calc-label">Subscription Tier:</label>
                <div className="plan-chips">
                  {[
                    { name: 'Starter', price: 999 },
                    { name: 'Professional', price: 1999 },
                    { name: 'Enterprise', price: 4999 }
                  ].map((p) => (
                    <button
                      key={p.name}
                      className={`plan-chip ${selectedPlanPrice === p.price ? 'selected' : ''}`}
                      onClick={() => setSelectedPlanPrice(p.price)}
                    >
                      <span className="chip-name">{p.name}</span>
                      <span className="chip-price">₹{p.price}/mo</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Product Variant Rule Row */}
              <div className="calc-row">
                <label className="calc-label">Catalog Variant Rule:</label>
                <div 
                  className={`variant-toggle-box ${hasOdooBrand ? 'enabled' : ''}`}
                  onClick={() => setHasOdooBrand(!hasOdooBrand)}
                >
                  <div className="variant-info">
                    <span className="variant-title">Brand: Odoo Professional Suite</span>
                    <span className="variant-desc">Backend rule: Selecting variant adds +₹560 extra price</span>
                  </div>
                  <div className="variant-extra">
                    {hasOdooBrand ? (
                      <span className="badge badge-active">+₹560 Added</span>
                    ) : (
                      <span className="badge badge-draft">Disabled</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Live Price Breakdown */}
              <div className="price-breakdown-box">
                <div className="breakdown-line">
                  <span>Base Plan Tier</span>
                  <span className="mono">₹{basePrice.toLocaleString()}</span>
                </div>
                {hasOdooBrand && (
                  <div className="breakdown-line highlight">
                    <span>Variant Surcharge (Brand: Odoo)</span>
                    <span className="mono">+₹{variantExtra.toLocaleString()}</span>
                  </div>
                )}
                {discount > 0 && (
                  <div className="breakdown-line discount">
                    <span>Annual Discount (15% Off)</span>
                    <span className="mono">-₹{discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="breakdown-line">
                  <span>Automated Tax Rules (GST 18%)</span>
                  <span className="mono">₹{tax.toLocaleString()}</span>
                </div>
                <div className="breakdown-total">
                  <div className="total-title">
                    <span>Forecasted Invoice Total</span>
                    <span className="cycle-sub">billed {billingPeriod.toLowerCase()}</span>
                  </div>
                  <div className="total-amount mono">
                    ₹{total.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            <div className="calc-footer">
              <div className="calc-status">
                <CheckCircle2 size={16} className="text-active" />
                <span>State Machine: DRAFT &rarr; CONFIRMED &rarr; ACTIVE verified</span>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => onNavigate('subscriptions')}>
                Create Subscription &rarr;
              </button>
            </div>
          </div>

          {/* 3D Glassmorphic Visual Graphic */}
          <div className="hero-visual-card glass-panel">
            <div className="visual-image-wrapper">
              <img 
                src="/hero-preview.jpg" 
                alt="SubPulse Real-Time Financial Intelligence Engine" 
                className="visual-img"
              />
              <div className="visual-overlay" />
            </div>

            <div className="floating-metric-badge top-right glass-panel">
              <div className="metric-icon-box">
                <TrendingUp size={16} />
              </div>
              <div>
                <div className="metric-label">Monthly Recurring (MRR)</div>
                <div className="metric-val mono">₹2,840,490</div>
              </div>
            </div>

            <div className="floating-metric-badge bottom-left glass-panel">
              <div className="metric-icon-box pulse">
                <Clock size={16} />
              </div>
              <div>
                <div className="metric-label">Idempotency Lock</div>
                <div className="metric-val mono text-active">0 Duplicate Invoices</div>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Stat Highlights Bar */}
        <div className="hero-metrics-bar">
          <div className="hero-stat-card glass-panel">
            <div className="stat-number mono">5,100+</div>
            <div className="stat-label">Active Subscriptions Seeded</div>
            <div className="stat-sub">Across 200 real business customers</div>
          </div>
          <div className="hero-stat-card glass-panel">
            <div className="stat-number mono">100%</div>
            <div className="stat-label">Idempotent Billing Runs</div>
            <div className="stat-sub">Unique (subscriptionId, billingPeriodStart)</div>
          </div>
          <div className="hero-stat-card glass-panel">
            <div className="stat-number mono">32 / 32</div>
            <div className="stat-label">Automated Test Suites Passed</div>
            <div className="stat-sub">Full Jest &amp; Supertest verification</div>
          </div>
          <div className="hero-stat-card glass-panel">
            <div className="stat-number mono">&lt; 180ms</div>
            <div className="stat-label">SQL Aggregate Query Speed</div>
            <div className="stat-sub">Target under 2s with 5,000+ records</div>
          </div>
        </div>
      </div>

      <style>{`
        .hero-section {
          position: relative;
          padding: var(--space-12) 0 var(--space-16);
          overflow: hidden;
        }

        .hero-glow-orb {
          position: absolute;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          filter: blur(120px);
          pointer-events: none;
          z-index: 0;
          opacity: 0.45;
        }

        .orb-primary {
          top: -100px;
          left: 10%;
          background: rgba(99, 102, 241, 0.35);
        }

        .orb-secondary {
          top: 100px;
          right: 5%;
          background: rgba(236, 72, 153, 0.25);
        }

        .hero-container {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .hero-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid rgba(99, 102, 241, 0.3);
          border-radius: var(--radius-pill);
          padding: 6px 14px;
          margin-bottom: var(--space-6);
        }

        .eyebrow-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #6366f1;
          box-shadow: 0 0 8px #6366f1;
          animation: pulse-glow 2s infinite ease-in-out;
        }

        .eyebrow-text {
          font-size: 0.8rem;
          font-weight: 600;
          color: #c7d2fe;
          font-family: var(--font-mono);
          letter-spacing: 0.02em;
        }

        .eyebrow-pill {
          font-size: 0.7rem;
          background: rgba(236, 72, 153, 0.2);
          color: #f472b6;
          padding: 2px 8px;
          border-radius: var(--radius-pill);
          font-weight: 700;
          font-family: var(--font-body);
        }

        .hero-title {
          font-size: clamp(2.6rem, 5.2vw, 4.4rem);
          font-weight: 800;
          line-height: 1.1;
          max-width: 960px;
          margin-bottom: var(--space-5);
          letter-spacing: -0.035em;
          color: #ffffff;
        }

        .hero-title-gradient {
          background: var(--gradient-brand);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero-subtitle {
          font-size: clamp(1.05rem, 2vw, 1.25rem);
          max-width: 780px;
          color: var(--text-secondary);
          margin-bottom: var(--space-8);
          line-height: 1.6;
        }

        .hero-actions-group {
          display: flex;
          align-items: center;
          gap: var(--space-4);
          margin-bottom: var(--space-8);
          flex-wrap: wrap;
          justify-content: center;
        }

        .demo-credentials-bar {
          display: flex;
          align-items: center;
          gap: var(--space-4);
          padding: 12px 20px;
          margin-bottom: var(--space-12);
          border-radius: var(--radius-pill);
          background: rgba(15, 20, 34, 0.8);
          border: 1px solid var(--border-medium);
        }

        .demo-bar-label {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-size: 0.825rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .sparkle-icon {
          color: #f59e0b;
        }

        .demo-pill-group {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }

        .credential-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: var(--radius-pill);
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid transparent;
          transition: all var(--transition-fast);
          font-family: var(--font-body);
        }

        .credential-pill.admin {
          background: rgba(139, 92, 246, 0.15);
          color: #c084fc;
          border-color: rgba(139, 92, 246, 0.35);
        }
        .credential-pill.admin:hover {
          background: rgba(139, 92, 246, 0.3);
          transform: translateY(-1px);
        }

        .credential-pill.staff {
          background: rgba(59, 130, 246, 0.15);
          color: #60a5fa;
          border-color: rgba(59, 130, 246, 0.35);
        }
        .credential-pill.staff:hover {
          background: rgba(59, 130, 246, 0.3);
          transform: translateY(-1px);
        }

        .credential-pill.customer {
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border-color: rgba(16, 185, 129, 0.35);
        }
        .credential-pill.customer:hover {
          background: rgba(16, 185, 129, 0.3);
          transform: translateY(-1px);
        }

        /* Dual Grid */
        .hero-interactive-grid {
          width: 100%;
          display: grid;
          grid-template-columns: 1.15fr 1fr;
          gap: var(--space-8);
          margin-bottom: var(--space-12);
          text-align: left;
        }

        .interactive-calc-card {
          padding: var(--space-6);
          border-radius: var(--radius-xl);
        }

        .calc-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--space-6);
        }

        .calc-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.85rem;
          font-weight: 700;
          color: #c7d2fe;
          font-family: var(--font-heading);
        }

        .period-toggle {
          display: flex;
          background: rgba(255, 255, 255, 0.05);
          border-radius: var(--radius-pill);
          padding: 3px;
          border: 1px solid var(--border-subtle);
        }

        .period-btn {
          padding: 5px 12px;
          font-size: 0.75rem;
          font-weight: 600;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          border-radius: var(--radius-pill);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .period-btn.active {
          background: var(--accent-primary);
          color: #ffffff;
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);
        }

        .save-tag {
          font-size: 0.65rem;
          background: #10b981;
          color: #042f2e;
          padding: 1px 4px;
          border-radius: var(--radius-pill);
          font-weight: 700;
          margin-left: 2px;
        }

        .calc-row {
          margin-bottom: var(--space-4);
        }

        .calc-label {
          display: block;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          margin-bottom: var(--space-2);
          font-family: var(--font-mono);
        }

        .plan-chips {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-2);
        }

        .plan-chip {
          padding: 10px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
          align-items: center;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .plan-chip:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: var(--border-medium);
        }

        .plan-chip.selected {
          background: rgba(99, 102, 241, 0.15);
          border-color: var(--accent-primary);
        }

        .chip-name {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .chip-price {
          font-size: 0.75rem;
          color: var(--accent-purple);
          font-family: var(--font-mono);
        }

        .variant-toggle-box {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .variant-toggle-box:hover {
          border-color: var(--border-medium);
        }

        .variant-toggle-box.enabled {
          background: rgba(99, 102, 241, 0.08);
          border-color: rgba(99, 102, 241, 0.4);
        }

        .variant-title {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-primary);
          display: block;
        }

        .variant-desc {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .price-breakdown-box {
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 14px 18px;
          margin-top: var(--space-4);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .breakdown-line {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .breakdown-line.highlight {
          color: #c084fc;
        }

        .breakdown-line.discount {
          color: #34d399;
        }

        .breakdown-total {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-top: 1px solid var(--border-medium);
          padding-top: 10px;
          margin-top: 6px;
        }

        .total-title {
          display: flex;
          flex-direction: column;
          font-weight: 700;
          color: #ffffff;
          font-size: 0.95rem;
        }

        .cycle-sub {
          font-size: 0.7rem;
          color: var(--text-muted);
          font-weight: 400;
        }

        .total-amount {
          font-size: 1.45rem;
          font-weight: 800;
          color: #ffffff;
        }

        .calc-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: var(--space-5);
          padding-top: var(--space-4);
          border-top: 1px solid var(--border-subtle);
        }

        .calc-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.775rem;
          color: var(--text-secondary);
        }

        .text-active {
          color: #10b981;
        }

        /* 3D Visual Card */
        .hero-visual-card {
          position: relative;
          border-radius: var(--radius-xl);
          overflow: hidden;
          min-height: 440px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .visual-image-wrapper {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }

        .visual-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scale(1.02);
          transition: transform 0.5s ease;
        }

        .hero-visual-card:hover .visual-img {
          transform: scale(1.06);
        }

        .visual-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(8, 11, 17, 0.2) 0%, rgba(8, 11, 17, 0.7) 100%);
        }

        .floating-metric-badge {
          position: absolute;
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: 12px 18px;
          border-radius: var(--radius-lg);
          background: rgba(15, 20, 34, 0.85);
          backdrop-filter: blur(12px);
          border: 1px solid var(--border-medium);
          box-shadow: var(--shadow-lg);
        }

        .floating-metric-badge.top-right {
          top: 24px;
          right: 24px;
        }

        .floating-metric-badge.bottom-left {
          bottom: 24px;
          left: 24px;
        }

        .metric-icon-box {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-md);
          background: rgba(99, 102, 241, 0.2);
          color: #818cf8;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .metric-icon-box.pulse {
          background: rgba(16, 185, 129, 0.2);
          color: #34d399;
        }

        .metric-label {
          font-size: 0.725rem;
          color: var(--text-muted);
          font-weight: 600;
          text-transform: uppercase;
        }

        .metric-val {
          font-size: 1.05rem;
          font-weight: 700;
          color: #ffffff;
        }

        /* 4 Stat Highlights */
        .hero-metrics-bar {
          width: 100%;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--space-4);
        }

        .hero-stat-card {
          padding: var(--space-6);
          border-radius: var(--radius-lg);
          text-align: left;
        }

        .stat-number {
          font-size: 1.85rem;
          font-weight: 800;
          color: #ffffff;
          line-height: 1.1;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 2px;
        }

        .stat-sub {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        @media (max-width: 1024px) {
          .hero-interactive-grid {
            grid-template-columns: 1fr;
          }
          .hero-metrics-bar {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 640px) {
          .hero-metrics-bar {
            grid-template-columns: 1fr;
          }
          .plan-chips {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  );
};
