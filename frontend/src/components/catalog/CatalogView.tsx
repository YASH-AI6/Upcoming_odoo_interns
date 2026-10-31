import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import type { Plan, Product } from '../../types';
import { Package, Layers, RefreshCw, Check, Sparkles, Tag } from 'lucide-react';

export const CatalogView: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'plans' | 'products'>('plans');

  // Selected variant map per product: { [productId]: variantId }
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, pls] = await Promise.all([api.getProducts(), api.getPlans()]);
      setProducts(prods);
      setPlans(pls);

      // Pre-select first variant if available
      const initMap: Record<string, string> = {};
      prods.forEach((p) => {
        if (p.variants && p.variants.length > 0) {
          initMap[p.id] = p.variants[0].id;
        }
      });
      setSelectedVariants(initMap);
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="catalog-page">
      {/* Header */}
      <div className="view-header flex-between">
        <div>
          <div className="view-tag">
            <Package size={14} />
            <span>Product Catalog &amp; Plans</span>
          </div>
          <h2 className="view-title">Subscription Plans &amp; Product Variants</h2>
          <p className="view-subtitle">
            Dynamic pricing rules: variants add extraPrice (e.g. brand Odoo = +₹560), multi-period plans, and lifecycle flags.
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary btn-sm" onClick={loadData} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="catalog-tabs">
        <button
          className={`catalog-tab-btn ${activeTab === 'plans' ? 'active' : ''}`}
          onClick={() => setActiveTab('plans')}
        >
          <Layers size={16} />
          <span>Subscription Plans ({plans.length})</span>
        </button>
        <button
          className={`catalog-tab-btn ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          <Package size={16} />
          <span>Products &amp; Dynamic Variants ({products.length})</span>
        </button>
      </div>

      {/* Plans Grid */}
      {activeTab === 'plans' && (
        <div className="plans-grid">
          {plans.map((plan) => (
            <div key={plan.id} className="plan-card glass-panel">
              <div className="plan-top">
                <span className="badge badge-active">{plan.billingPeriod}</span>
                <span className="min-qty-tag mono">Min Qty: {plan.minQuantity}</span>
              </div>

              <h3 className="plan-title">{plan.name}</h3>
              <div className="plan-price-line">
                <span className="plan-currency">₹</span>
                <span className="plan-amount mono">{Number(plan.price).toLocaleString()}</span>
                <span className="plan-period">/ {plan.billingPeriod.toLowerCase()}</span>
              </div>

              <div className="plan-rules-list">
                <div className={`rule-item ${plan.pausable ? 'allowed' : 'forbidden'}`}>
                  <Check size={14} />
                  <span>Pausable ({plan.pausable ? 'Enabled' : 'Disabled'})</span>
                </div>
                <div className={`rule-item ${plan.closable ? 'allowed' : 'forbidden'}`}>
                  <Check size={14} />
                  <span>Early Close ({plan.closable ? 'Enabled' : 'Disabled'})</span>
                </div>
                <div className={`rule-item ${plan.renewable ? 'allowed' : 'forbidden'}`}>
                  <Check size={14} />
                  <span>Renewable ({plan.renewable ? 'Enabled' : 'Disabled'})</span>
                </div>
                <div className={`rule-item ${plan.autoClose ? 'allowed' : 'forbidden'}`}>
                  <Check size={14} />
                  <span>Auto-Close on Expiry ({plan.autoClose ? 'Enabled' : 'Disabled'})</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Products & Dynamic Variants Grid */}
      {activeTab === 'products' && (
        <div className="products-grid">
          {products.map((prod) => {
            const selectedVarId = selectedVariants[prod.id];
            const activeVariant = prod.variants?.find((v) => v.id === selectedVarId);
            const extra = activeVariant ? Number(activeVariant.extraPrice) : 0;
            const effectivePrice = Number(prod.salesPrice) + extra;

            return (
              <div key={prod.id} className="product-card glass-panel">
                <div className="prod-badge-row">
                  <span className="badge badge-draft">{prod.type}</span>
                  <span className="mono text-muted text-xs">Cost: ₹{Number(prod.costPrice).toFixed(0)}</span>
                </div>

                <h3 className="product-title">{prod.name}</h3>
                <p className="product-desc">{prod.notes || 'Enterprise subscription service line.'}</p>

                {/* Variant Selector */}
                {prod.variants && prod.variants.length > 0 && (
                  <div className="variants-section">
                    <span className="variants-label">Select Variant (+Extra Price):</span>
                    <div className="variant-options">
                      <button
                        className={`var-btn ${!selectedVarId ? 'selected' : ''}`}
                        onClick={() => setSelectedVariants({ ...selectedVariants, [prod.id]: '' })}
                      >
                        Base (₹0)
                      </button>
                      {prod.variants.map((v) => (
                        <button
                          key={v.id}
                          className={`var-btn ${selectedVarId === v.id ? 'selected' : ''}`}
                          onClick={() => setSelectedVariants({ ...selectedVariants, [prod.id]: v.id })}
                        >
                          {v.attribute}: {v.value} (+₹{v.extraPrice})
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Price Display */}
                <div className="product-price-box">
                  <div className="price-label">Effective Unit Price:</div>
                  <div className="price-val mono font-bold">
                    ₹{effectivePrice.toLocaleString()}{' '}
                    {extra > 0 && <span className="extra-tag mono">+₹{extra} variant</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .catalog-page {
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
        }

        .catalog-tabs {
          display: flex;
          gap: var(--space-3);
          border-bottom: 1px solid var(--border-subtle);
          padding-bottom: var(--space-2);
        }

        .catalog-tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
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

        .catalog-tab-btn:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.04);
        }

        .catalog-tab-btn.active {
          color: #ffffff;
          background: rgba(99, 102, 241, 0.18);
          border: 1px solid rgba(99, 102, 241, 0.35);
        }

        .plans-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: var(--space-5);
        }

        .plan-card {
          padding: var(--space-6);
          border-radius: var(--radius-xl);
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }

        .plan-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .min-qty-tag {
          font-size: 0.725rem;
          color: var(--text-muted);
        }

        .plan-title {
          font-size: 1.35rem;
          color: #ffffff;
        }

        .plan-price-line {
          display: flex;
          align-items: baseline;
          gap: 2px;
        }

        .plan-currency {
          font-size: 1.1rem;
          color: var(--text-secondary);
        }

        .plan-amount {
          font-size: 2rem;
          font-weight: 800;
          color: #ffffff;
        }

        .plan-period {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin-left: 4px;
        }

        .plan-rules-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          border-top: 1px solid var(--border-subtle);
          padding-top: var(--space-4);
        }

        .rule-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8rem;
        }

        .rule-item.allowed { color: #10b981; }
        .rule-item.forbidden { color: var(--text-muted); opacity: 0.6; }

        .products-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: var(--space-5);
        }

        .product-card {
          padding: var(--space-6);
          border-radius: var(--radius-xl);
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .prod-badge-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .product-title {
          font-size: 1.25rem;
          color: #ffffff;
        }

        .product-desc {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .variants-section {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 4px;
        }

        .variants-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .variant-options {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }

        .var-btn {
          padding: 4px 10px;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          font-weight: 600;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .var-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
        }

        .var-btn.selected {
          background: rgba(99, 102, 241, 0.2);
          border-color: var(--accent-primary);
          color: #c7d2fe;
        }

        .product-price-box {
          border-top: 1px solid var(--border-subtle);
          padding-top: var(--space-3);
          margin-top: auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .price-label {
          font-size: 0.775rem;
          color: var(--text-muted);
        }

        .price-val {
          font-size: 1.2rem;
          color: #ffffff;
        }

        .extra-tag {
          font-size: 0.75rem;
          color: var(--accent-purple);
          margin-left: 4px;
        }
      `}</style>
    </div>
  );
};
