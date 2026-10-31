import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { 
  X, 
  Lock, 
  Mail, 
  User, 
  Check, 
  AlertCircle, 
  ShieldCheck, 
  KeyRound, 
  Phone, 
  MapPin,
  Sparkles
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'signup' | 'forgot';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, defaultMode = 'login' }) => {
  const { login, signup, switchDemoRole } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(defaultMode);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Real-time password validation rules:
  // Rule: MORE than 8 characters, at least 1 uppercase, 1 lowercase, 1 special char
  const isMoreThan8 = password.length > 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const isPasswordValid = isMoreThan8 && hasUpper && hasLower && hasSpecial;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
        onClose();
      } else if (mode === 'signup') {
        if (!isPasswordValid) {
          throw new Error('Password must satisfy all complexity requirements');
        }
        await signup({ name, email, password, phone, address });
        onClose();
      } else if (mode === 'forgot') {
        const res = await api.forgotPassword(email);
        setSuccessMsg(res.message || 'If that email exists in our system, a 30-minute password reset link has been dispatched.');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = async (role: 'ADMIN' | 'STAFF' | 'CUSTOMER') => {
    setError(null);
    setLoading(true);
    try {
      await switchDemoRole(role);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content auth-modal-box" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="auth-header">
          <div className="auth-icon-badge">
            <Lock size={20} />
          </div>
          <h3 className="auth-title">
            {mode === 'login' && 'Sign In to SubPulse'}
            {mode === 'signup' && 'Create Customer Account'}
            {mode === 'forgot' && 'Reset Password'}
          </h3>
          <p className="auth-desc">
            {mode === 'login' && 'Enter your credentials to access the billing dashboard.'}
            {mode === 'signup' && 'Register a new customer account with instant billing setup.'}
            {mode === 'forgot' && 'Single-use 30-minute security token generation.'}
          </p>
        </div>

        {/* Quick Demo Logins for Judges & Evaluators */}
        {mode === 'login' && (
          <div className="demo-fill-card">
            <div className="demo-fill-title">
              <Sparkles size={14} />
              <span>One-Click Role Authentication:</span>
            </div>
            <div className="demo-fill-buttons">
              <button type="button" className="demo-quick-btn admin" onClick={() => fillDemo('ADMIN')}>
                Admin
              </button>
              <button type="button" className="demo-quick-btn staff" onClick={() => fillDemo('STAFF')}>
                Staff
              </button>
              <button type="button" className="demo-quick-btn customer" onClick={() => fillDemo('CUSTOMER')}>
                Customer
              </button>
            </div>
          </div>
        )}

        {/* Mode Switcher Tabs */}
        <div className="auth-tabs">
          <button 
            type="button" 
            className={`auth-tab-btn ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); setError(null); setSuccessMsg(null); }}
          >
            Sign In
          </button>
          <button 
            type="button" 
            className={`auth-tab-btn ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => { setMode('signup'); setError(null); setSuccessMsg(null); }}
          >
            Create Account
          </button>
          <button 
            type="button" 
            className={`auth-tab-btn ${mode === 'forgot' ? 'active' : ''}`}
            onClick={() => { setMode('forgot'); setError(null); setSuccessMsg(null); }}
          >
            Forgot Password
          </button>
        </div>

        {error && (
          <div className="auth-error-banner">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="auth-success-banner">
            <Check size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'signup' && (
            <div className="form-group">
              <label className="form-label">Full Name / Business Name</label>
              <div className="input-with-icon">
                <User size={16} className="input-icon" />
                <input
                  type="text"
                  required
                  placeholder="Apex Cloud Corp"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="input-with-icon">
              <Mail size={16} className="input-icon" />
              <input
                type="email"
                required
                placeholder="name@company.com"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-with-icon">
                <KeyRound size={16} className="input-icon" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {/* Password Complexity Checklist for Sign Up */}
              {mode === 'signup' && (
                <div className="password-rules-box">
                  <div className="rules-heading">Security Requirements:</div>
                  <div className={`rule-item ${isMoreThan8 ? 'valid' : ''}`}>
                    <Check size={12} />
                    <span>More than 8 characters ({password.length} chars)</span>
                  </div>
                  <div className={`rule-item ${hasUpper ? 'valid' : ''}`}>
                    <Check size={12} />
                    <span>At least 1 uppercase letter (A-Z)</span>
                  </div>
                  <div className={`rule-item ${hasLower ? 'valid' : ''}`}>
                    <Check size={12} />
                    <span>At least 1 lowercase letter (a-z)</span>
                  </div>
                  <div className={`rule-item ${hasSpecial ? 'valid' : ''}`}>
                    <Check size={12} />
                    <span>At least 1 special character (!@#$%^&amp;*)</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {mode === 'signup' && (
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Phone (Optional)</label>
                <div className="input-with-icon">
                  <Phone size={16} className="input-icon" />
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    className="form-input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Billing Address</label>
                <div className="input-with-icon">
                  <MapPin size={16} className="input-icon" />
                  <input
                    type="text"
                    placeholder="Tech Park, Bangalore"
                    className="form-input"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: 'var(--space-2)' }}
            disabled={loading || (mode === 'signup' && !isPasswordValid)}
          >
            {loading ? 'Processing...' : (
              mode === 'login' ? 'Sign In &rarr;' :
              mode === 'signup' ? 'Create Customer Account &rarr;' :
              'Send 30-Min Reset Token &rarr;'
            )}
          </button>
        </form>
      </div>

      <style>{`
        .auth-modal-box {
          max-width: 480px;
        }

        .modal-close-btn {
          position: absolute;
          top: 20px;
          right: 20px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-subtle);
          color: var(--text-secondary);
          width: 32px;
          height: 32px;
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .modal-close-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
        }

        .auth-header {
          text-align: center;
          margin-bottom: var(--space-6);
        }

        .auth-icon-badge {
          width: 48px;
          height: 48px;
          border-radius: var(--radius-md);
          background: rgba(99, 102, 241, 0.15);
          border: 1px solid rgba(99, 102, 241, 0.35);
          color: #818cf8;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto var(--space-4);
        }

        .auth-title {
          font-size: 1.5rem;
          color: #ffffff;
          margin-bottom: 6px;
        }

        .auth-desc {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .demo-fill-card {
          background: rgba(99, 102, 241, 0.08);
          border: 1px solid rgba(99, 102, 241, 0.25);
          border-radius: var(--radius-md);
          padding: 10px 14px;
          margin-bottom: var(--space-5);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-2);
        }

        .demo-fill-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.775rem;
          font-weight: 600;
          color: #c7d2fe;
        }

        .demo-fill-buttons {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .demo-quick-btn {
          padding: 4px 10px;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          font-weight: 600;
          border: 1px solid transparent;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .demo-quick-btn.admin {
          background: rgba(139, 92, 246, 0.2);
          color: #c084fc;
          border-color: rgba(139, 92, 246, 0.4);
        }
        .demo-quick-btn.staff {
          background: rgba(59, 130, 246, 0.2);
          color: #60a5fa;
          border-color: rgba(59, 130, 246, 0.4);
        }
        .demo-quick-btn.customer {
          background: rgba(16, 185, 129, 0.2);
          color: #34d399;
          border-color: rgba(16, 185, 129, 0.4);
        }

        .demo-quick-btn:hover {
          transform: translateY(-1px);
        }

        .auth-tabs {
          display: flex;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 4px;
          margin-bottom: var(--space-5);
        }

        .auth-tab-btn {
          flex: 1;
          padding: 8px 12px;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          font-size: 0.825rem;
          font-weight: 600;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .auth-tab-btn.active {
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
        }

        .auth-error-banner {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: 10px 14px;
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: var(--radius-md);
          color: #f87171;
          font-size: 0.85rem;
          margin-bottom: var(--space-4);
        }

        .auth-success-banner {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          padding: 10px 14px;
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: var(--radius-md);
          color: #34d399;
          font-size: 0.85rem;
          margin-bottom: var(--space-4);
        }

        .input-with-icon {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 12px;
          color: var(--text-muted);
          pointer-events: none;
        }

        .input-with-icon .form-input {
          padding-left: 38px;
        }

        .password-rules-box {
          background: rgba(0, 0, 0, 0.35);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 10px 14px;
          margin-top: var(--space-2);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .rules-heading {
          font-size: 0.725rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          margin-bottom: 2px;
        }

        .rule-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .rule-item.valid {
          color: #10b981;
        }

        .form-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-3);
        }
      `}</style>
    </div>
  );
};
