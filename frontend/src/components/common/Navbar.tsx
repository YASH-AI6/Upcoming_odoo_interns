import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Zap, 
  LayoutDashboard, 
  Layers, 
  Clock, 
  FileText, 
  Package, 
  UserCheck, 
  LogOut, 
  LogIn, 
  ShieldCheck,
  User as UserIcon
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onSelectTab, onOpenAuth }) => {
  const { user, isAuthenticated, logout, switchDemoRole } = useAuth();

  const navItems = [
    { id: 'home', label: 'Overview', icon: Zap },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'subscriptions', label: 'Subscriptions', icon: Layers },
    { id: 'billing', label: 'Time Machine', icon: Clock },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'catalog', label: 'Catalog & Plans', icon: Package },
    { id: 'portal', label: 'Customer Portal', icon: UserCheck },
  ];

  return (
    <header className="navbar-container">
      <div className="navbar-inner">
        {/* Brand */}
        <div className="navbar-brand" onClick={() => onSelectTab('home')}>
          <div className="brand-logo-glow">
            <Zap size={20} className="brand-icon" />
          </div>
          <div className="brand-text">
            <span className="brand-title">SubPulse</span>
            <span className="brand-tag">v2.4 Engine</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="navbar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                className={`nav-tab-btn ${isActive ? 'active' : ''}`}
                onClick={() => onSelectTab(item.id)}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Actions / Role Switcher */}
        <div className="navbar-actions">
          {/* Quick Demo Switcher */}
          <div className="demo-switcher">
            <span className="demo-label">Role:</span>
            <button
              className={`demo-btn ${user?.role === 'ADMIN' ? 'active-admin' : ''}`}
              onClick={() => switchDemoRole('ADMIN')}
              title="One-click switch to Administrator"
            >
              Admin
            </button>
            <button
              className={`demo-btn ${user?.role === 'STAFF' ? 'active-staff' : ''}`}
              onClick={() => switchDemoRole('STAFF')}
              title="One-click switch to Staff"
            >
              Staff
            </button>
            <button
              className={`demo-btn ${user?.role === 'CUSTOMER' ? 'active-customer' : ''}`}
              onClick={() => switchDemoRole('CUSTOMER')}
              title="One-click switch to Customer"
            >
              Customer
            </button>
          </div>

          {/* User Account / Auth */}
          {isAuthenticated && user ? (
            <div className="user-profile-menu">
              <div className="user-info">
                <span className="user-name">{user.name}</span>
                <span className="user-role-badge">
                  <ShieldCheck size={12} />
                  {user.role}
                </span>
              </div>
              <button className="btn-icon" onClick={logout} title="Sign Out">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={onOpenAuth}>
              <LogIn size={15} />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>

      <style>{`
        .navbar-container {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(8, 11, 17, 0.85);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--border-subtle);
          padding: 0 var(--space-6);
        }

        .navbar-inner {
          max-width: 1400px;
          margin: 0 auto;
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-4);
        }

        .navbar-brand {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          cursor: pointer;
          user-select: none;
        }

        .brand-logo-glow {
          width: 38px;
          height: 38px;
          border-radius: var(--radius-md);
          background: var(--gradient-brand);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 16px rgba(99, 102, 241, 0.45);
        }

        .brand-icon {
          color: #ffffff;
        }

        .brand-text {
          display: flex;
          flex-direction: column;
        }

        .brand-title {
          font-family: var(--font-heading);
          font-weight: 800;
          font-size: 1.25rem;
          color: #ffffff;
          line-height: 1.1;
          letter-spacing: -0.02em;
        }

        .brand-tag {
          font-family: var(--font-mono);
          font-size: 0.65rem;
          color: var(--accent-purple);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .navbar-nav {
          display: flex;
          align-items: center;
          gap: 4px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-pill);
          padding: 4px;
        }

        .nav-tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          font-family: var(--font-body);
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--text-secondary);
          background: transparent;
          border: none;
          border-radius: var(--radius-pill);
          cursor: pointer;
          transition: all var(--transition-fast);
          white-space: nowrap;
        }

        .nav-tab-btn:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.05);
        }

        .nav-tab-btn.active {
          color: #ffffff;
          background: rgba(99, 102, 241, 0.2);
          border: 1px solid rgba(99, 102, 241, 0.35);
          box-shadow: 0 2px 10px rgba(99, 102, 241, 0.2);
        }

        .navbar-actions {
          display: flex;
          align-items: center;
          gap: var(--space-4);
        }

        .demo-switcher {
          display: flex;
          align-items: center;
          gap: 4px;
          background: rgba(15, 20, 34, 0.7);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 3px 6px;
        }

        .demo-label {
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          margin-right: 4px;
          font-family: var(--font-mono);
        }

        .demo-btn {
          padding: 4px 8px;
          font-size: 0.75rem;
          font-weight: 600;
          background: transparent;
          color: var(--text-secondary);
          border: 1px solid transparent;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .demo-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-primary);
        }

        .demo-btn.active-admin {
          background: rgba(139, 92, 246, 0.2);
          color: #c084fc;
          border-color: rgba(139, 92, 246, 0.4);
        }

        .demo-btn.active-staff {
          background: rgba(59, 130, 246, 0.2);
          color: #60a5fa;
          border-color: rgba(59, 130, 246, 0.4);
        }

        .demo-btn.active-customer {
          background: rgba(16, 185, 129, 0.2);
          color: #34d399;
          border-color: rgba(16, 185, 129, 0.4);
        }

        .user-profile-menu {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding-left: var(--space-2);
          border-left: 1px solid var(--border-subtle);
        }

        .user-info {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .user-name {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .user-role-badge {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 0.65rem;
          font-family: var(--font-mono);
          color: var(--accent-purple);
          text-transform: uppercase;
        }

        .btn-icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .btn-icon:hover {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
          border-color: rgba(239, 68, 68, 0.3);
        }

        @media (max-width: 1080px) {
          .navbar-nav {
            display: none;
          }
        }
      `}</style>
    </header>
  );
};
