import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import DashboardTab from './DashboardTab';
import Sales from './Sales';
import Inventory from './Inventory';
import Customers from './Customers';
import AIAssistant from './AIAssistant';
import Settings from './Settings';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const { user } = useAuth();

  const renderPage = () => {
    switch (activeTab) {
      case 'Dashboard':   return <DashboardTab setActiveTab={setActiveTab} />;
      case 'Sales':       return <Sales />;
      case 'Inventory':   return <Inventory />;
      case 'Customers':   return <Customers />;
      case 'AIAssistant': return <AIAssistant />;
      case 'Settings':    return <Settings />;
      default:            return <DashboardTab setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-surface-border flex items-center justify-between px-6 flex-shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.03)] z-10">
          
          {/* Search Bar */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </span>
              <input 
                type="text" 
                placeholder="Search products, customers, or bills..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-colors"
              />
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-4 ml-4">
            <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-50">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            
            <div className="h-6 w-px bg-slate-200 mx-1"></div>

            <button onClick={() => setActiveTab('Settings')} className="flex items-center gap-2 hover:bg-slate-50 p-1.5 rounded-lg transition-colors">
              <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs">
                {user?.name?.[0]?.toUpperCase() || 'O'}
              </div>
              <span className="text-sm font-medium text-slate-700 hidden sm:block">{user?.name?.split(' ')[0] || 'Owner'}</span>
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-slate-50">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
