import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Overview from './Overview';
import Sales from './Sales';
import Inventory from './Inventory';
import Udhar from './Udhar';
import Billing from './Billing';
import AIAssistant from './AIAssistant';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('Overview');
  const { user } = useAuth();

  const titles = {
    Overview:    `Welcome back, ${user?.name?.split(' ')[0] || 'Owner'} 👋`,
    Sales:       'Sales Management',
    Inventory:   'Inventory',
    Udhar:       'Udhar / Credit',
    Billing:     'Billing',
    AIAssistant: 'AI Assistant',
  };

  const renderPage = () => {
    switch (activeTab) {
      case 'Overview':    return <Overview setActiveTab={setActiveTab} />;
      case 'Sales':       return <Sales />;
      case 'Inventory':   return <Inventory />;
      case 'Udhar':       return <Udhar />;
      case 'Billing':     return <Billing />;
      case 'AIAssistant': return <AIAssistant />;
      default:            return <Overview setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900">{titles[activeTab]}</h2>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="hidden sm:block font-medium">
              {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-50 border border-green-200 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-green-700 font-semibold text-[11px]">Live</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
