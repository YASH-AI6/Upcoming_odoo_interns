import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { HeroSection } from './components/hero/HeroSection';
import { DashboardView } from './components/dashboard/DashboardView';
import { SubscriptionsView } from './components/subscriptions/SubscriptionsView';
import { BillingTimeMachineView } from './components/billing/BillingTimeMachineView';
import { InvoicesView } from './components/invoices/InvoicesView';
import { CustomerPortalView } from './components/portal/CustomerPortalView';
import { CatalogView } from './components/catalog/CatalogView';
import { AuthModal } from './components/auth/AuthModal';
import { ShieldCheck, Heart, Zap, Terminal } from 'lucide-react';

const MainApp: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="main-content">
        {currentTab === 'home' && (
          <HeroSection
            onNavigate={setCurrentTab}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}

        {currentTab === 'dashboard' && (
          <DashboardView onNavigate={setCurrentTab} />
        )}

        {currentTab === 'subscriptions' && (
          <SubscriptionsView />
        )}

        {currentTab === 'billing' && (
          <BillingTimeMachineView />
        )}

        {currentTab === 'invoices' && (
          <InvoicesView />
        )}

        {currentTab === 'catalog' && (
          <CatalogView />
        )}

        {currentTab === 'portal' && (
          <CustomerPortalView onOpenAuth={() => setAuthModalOpen(true)} />
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-inner">
          <div className="footer-left">
            <div className="footer-brand">
              <Zap size={18} className="text-accent" />
              <span>SubPulse Subscription &amp; Billing Engine</span>
            </div>
            <p className="footer-desc">
              Built with Node.js, Express, TypeScript, PostgreSQL, Prisma ORM, Zod, JWT, Nodemailer, PDFKit &amp; node-cron.
            </p>
          </div>
          <div className="footer-right">
            <div className="footer-tag">
              <ShieldCheck size={14} className="text-active" />
              <span>Database-Enforced Idempotency &amp; State Machine</span>
            </div>
            <div className="footer-seed-info">
              <span>Seeded: 5,100+ Subscriptions &bull; 200 Customers</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      <style>{`
        .app-footer {
          border-top: 1px solid var(--border-subtle);
          background: rgba(8, 11, 17, 0.9);
          padding: var(--space-8) var(--space-6);
          margin-top: auto;
        }

        .footer-inner {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: var(--space-4);
        }

        .footer-brand {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-weight: 700;
          color: #ffffff;
          font-size: 1rem;
          margin-bottom: 4px;
        }

        .footer-desc {
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        .footer-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
        }

        .footer-tag {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.775rem;
          color: #c7d2fe;
          font-family: var(--font-mono);
        }

        .footer-seed-info {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        @media (max-width: 768px) {
          .footer-right {
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
