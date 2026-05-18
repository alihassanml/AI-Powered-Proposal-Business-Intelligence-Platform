import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ScraperProvider } from './context/ScraperContext';
import Sidebar from './components/Sidebar';
import type { TabId } from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import ProposalPage from './pages/ProposalPage';
import MapScraperPage from './pages/MapScraperPage';
import HistoryPage from './pages/HistoryPage';
import EmailVerifyPage from './pages/EmailVerifyPage';
import DomainFinderPage from './pages/DomainFinderPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';

function AppInner() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>(
    () => (localStorage.getItem('halify_tab') as TabId) || 'dashboard'
  );
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  const handleTabChange = (tab: TabId) => {
    localStorage.setItem('halify_tab', tab);
    setActiveTab(tab);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <span className="text-sm text-on-surface-variant font-medium">Loading…</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return authMode === 'login'
      ? <LoginPage  onSwitch={() => setAuthMode('signup')} />
      : <SignupPage onSwitch={() => setAuthMode('login')}  />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar active={activeTab} onChange={handleTabChange} />
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'dashboard' && <DashboardPage onNavigate={handleTabChange} />}
        {activeTab === 'proposal'  && <ProposalPage />}
        {activeTab === 'maps'      && <MapScraperPage />}
        {activeTab === 'email'     && <EmailVerifyPage />}
        {activeTab === 'domain'    && <DomainFinderPage />}
        {activeTab === 'history'   && <HistoryPage />}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ScraperProvider>
        <AppInner />
      </ScraperProvider>
    </AuthProvider>
  );
}
