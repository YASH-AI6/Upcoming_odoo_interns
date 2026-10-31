import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import type { Invoice } from '../../types';
import { Badge } from '../common/Badge';
import confetti from 'canvas-confetti';
import { 
  FileText, 
  Search, 
  RefreshCw, 
  Download, 
  Send, 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';

export const InvoicesView: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Payment Modal State
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CREDIT_CARD');
  const [paymentNote, setPaymentNote] = useState('Payment via portal');
  const [paymentLoading, setPaymentLoading] = useState(false);

  const loadInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getInvoices({ status: statusFilter, limit: 50 });
      setInvoices(res.invoices);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [statusFilter]);

  const handleConfirm = async (id: string) => {
    try {
      await api.confirmInvoice(id);
      setSuccessMsg('Invoice confirmed successfully.');
      await loadInvoices();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await api.cancelInvoice(id);
      setSuccessMsg('Invoice cancelled.');
      await loadInvoices();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSendEmail = async (id: string) => {
    try {
      const res = await api.sendInvoice(id);
      setSuccessMsg(res.message || 'Invoice PDF dispatched via email to customer.');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openPaymentModal = (inv: Invoice) => {
    setSelectedInvoice(inv);
    const balanceDue = Number(inv.total) - Number(inv.amountPaid);
    setPaymentAmount(balanceDue > 0 ? balanceDue.toFixed(2) : '0');
  };

  const submitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    setPaymentLoading(true);
    setError(null);
    try {
      const amount = parseFloat(paymentAmount);
      const res = await api.createPayment(selectedInvoice.id, {
        amount,
        method: paymentMethod,
        note: paymentNote
      });

      if (res.invoiceStatus === 'PAID') {
        // Trigger celebratory confetti blast
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
        setSuccessMsg(`Payment of ₹${amount} recorded! Invoice is now fully PAID!`);
      } else {
        setSuccessMsg(`Partial payment of ₹${amount} recorded.`);
      }

      setSelectedInvoice(null);
      await loadInvoices();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <div className="invoices-page">
      {/* Header */}
      <div className="view-header flex-between">
        <div>
          <div className="view-tag">
            <FileText size={14} />
            <span>Accounts Receivable</span>
          </div>
          <h2 className="view-title">Invoices, Taxes, and Payments</h2>
          <p className="view-subtitle">
            PDFKit printable invoices, partial payment reconciliation, and automated PAID status transitions.
          </p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary btn-sm" onClick={loadInvoices} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error glass-panel">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="alert alert-success glass-panel">
          <CheckCircle size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter Chips */}
      <div className="filter-chips-bar glass-panel">
        <div className="status-chips">
          {['ALL', 'CONFIRMED', 'PAID', 'DRAFT', 'CANCELLED'].map((st) => (
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

      {/* Invoices Table */}
      <div className="table-container glass-panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Customer</th>
              <th>Due Date</th>
              <th>Subtotal</th>
              <th>Tax (GST)</th>
              <th>Discount</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '32px' }}>
                  <RefreshCw size={24} className="spin" style={{ margin: '0 auto 8px', color: '#818cf8' }} />
                  <div>Loading invoices...</div>
                </td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                  No invoices found matching criteria.
                </td>
              </tr>
            ) : (
              invoices.map((inv) => {
                const balanceDue = Number(inv.total) - Number(inv.amountPaid);
                const isOverdue = inv.isOverdue || (inv.status === 'CONFIRMED' && balanceDue > 0 && new Date(inv.dueDate) < new Date());

                return (
                  <tr key={inv.id}>
                    <td className="mono font-bold text-accent">{inv.number}</td>
                    <td>
                      <div className="customer-cell">
                        <span className="font-semibold">{inv.customer?.name}</span>
                        <span className="customer-email">{inv.customer?.email}</span>
                      </div>
                    </td>
                    <td className="mono text-secondary">
                      {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="mono">₹{Number(inv.subtotal).toFixed(2)}</td>
                    <td className="mono">₹{Number(inv.taxTotal).toFixed(2)}</td>
                    <td className="mono text-active">
                      {inv.discountTotal > 0 ? `-₹${Number(inv.discountTotal).toFixed(2)}` : '₹0.00'}
                    </td>
                    <td className="mono font-bold">₹{Number(inv.total).toFixed(2)}</td>
                    <td className="mono text-active font-semibold">₹{Number(inv.amountPaid).toFixed(2)}</td>
                    <td>
                      {isOverdue ? <Badge status="OVERDUE" /> : <Badge status={inv.status} />}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="action-button-group">
                        {/* Printable PDF */}
                        <a
                          href={api.getInvoicePdfUrl(inv.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-icon"
                          title="Stream / Download Printable PDF"
                        >
                          <Download size={14} />
                        </a>

                        {/* Send Email with PDF */}
                        <button
                          className="btn-icon"
                          onClick={() => handleSendEmail(inv.id)}
                          title="Dispatch Invoice PDF via Email"
                        >
                          <Send size={14} />
                        </button>

                        {/* Confirm Draft */}
                        {inv.status === 'DRAFT' && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleConfirm(inv.id)}
                          >
                            <CheckCircle size={13} />
                            <span>Confirm</span>
                          </button>
                        )}

                        {/* Cancel Invoice */}
                        {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleCancel(inv.id)}
                            title="Cancel Invoice (Forbidden if PAID)"
                          >
                            <XCircle size={13} />
                            <span>Cancel</span>
                          </button>
                        )}

                        {/* Pay Invoice */}
                        {inv.status === 'CONFIRMED' && balanceDue > 0 && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => openPaymentModal(inv)}
                          >
                            <CreditCard size={13} />
                            <span>Record Payment</span>
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

      {/* Payment Modal */}
      {selectedInvoice && (
        <div className="modal-overlay" onClick={() => setSelectedInvoice(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-icon text-active">
              <CreditCard size={28} />
            </div>
            <h3 className="modal-title">Record Invoice Payment</h3>
            <p className="modal-subtitle">
              Invoice <strong>{selectedInvoice.number}</strong> for {selectedInvoice.customer?.name}.
              Supports full or partial payments; transitions to PAID automatically when balance is cleared.
            </p>

            <form onSubmit={submitPayment} className="modal-form">
              <div className="invoice-summary-box glass-panel">
                <div className="summary-row">
                  <span>Total Invoice Amount:</span>
                  <span className="mono font-bold">₹{Number(selectedInvoice.total).toFixed(2)}</span>
                </div>
                <div className="summary-row">
                  <span>Already Paid:</span>
                  <span className="mono text-active">₹{Number(selectedInvoice.amountPaid).toFixed(2)}</span>
                </div>
                <div className="summary-row highlight">
                  <span>Remaining Balance Due:</span>
                  <span className="mono font-bold text-danger">
                    ₹{(Number(selectedInvoice.total) - Number(selectedInvoice.amountPaid)).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Payment Amount (INR)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  max={Number(selectedInvoice.total) - Number(selectedInvoice.amountPaid)}
                  className="form-input mono"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select
                  className="form-select"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="CREDIT_CARD">Credit Card / UPI</option>
                  <option value="BANK_TRANSFER">Direct Bank Transfer</option>
                  <option value="CHECK">Corporate Check</option>
                  <option value="CASH">Cash / Counter</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Internal Note</label>
                <input
                  type="text"
                  className="form-input"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedInvoice(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={paymentLoading}
                >
                  {paymentLoading ? 'Recording Payment...' : 'Confirm Payment &rarr;'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .invoices-page {
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
        }

        .alert {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: 12px 18px;
          border-radius: var(--radius-md);
          font-size: 0.875rem;
        }

        .alert-error {
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.35);
          color: #f87171;
        }

        .alert-success {
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.35);
          color: #34d399;
        }

        .filter-chips-bar {
          padding: 10px 18px;
          border-radius: var(--radius-lg);
        }

        .modal-header-icon {
          width: 52px;
          height: 52px;
          border-radius: var(--radius-lg);
          background: rgba(16, 185, 129, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: var(--space-4);
        }

        .invoice-summary-box {
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 12px 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: var(--space-3);
        }

        .summary-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .summary-row.highlight {
          border-top: 1px solid var(--border-subtle);
          padding-top: 6px;
          margin-top: 2px;
          color: #ffffff;
        }
      `}</style>
    </div>
  );
};
