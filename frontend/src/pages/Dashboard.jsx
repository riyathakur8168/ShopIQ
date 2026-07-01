import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import DashboardTab from './DashboardTab';
import Sales from './Sales';
import Inventory from './Inventory';
import Customers from './Customers';
import Settings from './Settings';
import POSCounter from './POSCounter';
import Suppliers from './Suppliers';
import { useAuth } from '../context/AuthContext';
import { getInventoryNotifications } from '../services/api';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('POS Counter');
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const loadNotifications = () => {
    getInventoryNotifications()
      .then(res => setNotifications(res.data.notifications || []))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    loadNotifications();
    const handleUpdate = () => loadNotifications();
    window.addEventListener('update-notifications', handleUpdate);
    return () => window.removeEventListener('update-notifications', handleUpdate);
  }, []);

  const renderPage = () => {
    switch (activeTab) {
      case 'POS Counter': return <POSCounter setActiveTab={setActiveTab} />;
      case 'Analytics':   return <Sales setActiveTab={setActiveTab} />;
      case 'Inventory':   return <Inventory />;
      case 'Customers':   return <Customers />;
      case 'Suppliers':   return <Suppliers />;
      case 'Settings':    return <Settings />;
      default:            return <POSCounter setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} lowStockCount={notifications.length} />

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
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-50 focus:outline-none"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white">
                    {notifications.length}
                  </span>
                )}
              </button>
              
              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowNotifications(false)}></div>
                  <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-40 py-2 animate-fade-in max-h-[400px] overflow-y-auto">
                    <div className="px-4 py-2 border-b border-slate-100 flex justify-between items-center">
                      <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Inventory Alerts</span>
                      {notifications.length > 0 && (
                        <span className="text-[10px] bg-red-50 text-red-600 font-bold px-1.5 py-0.5 rounded-full">
                          {notifications.length} Alerts
                        </span>
                      )}
                    </div>
                    <div className="divide-y divide-slate-50">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 text-sm font-medium">
                          ✅ No stock alerts
                        </div>
                      ) : (
                        notifications.map(item => (
                          <div key={item.product_id} className="p-3 hover:bg-slate-50 transition-colors flex gap-3 items-start">
                            <span className="text-base select-none mt-0.5">
                              {item.priority === 1 ? '🚨' : (item.priority === 2 ? '⚠️' : '🔔')}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">{item.product_name}</p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {item.current_stock === 0 ? 'Out of Stock' : `Stock: ${item.current_stock}`} (Threshold: {item.low_stock_threshold})
                              </p>
                              {item.recommended_reorder && (
                                <p className="text-[10px] text-primary-600 font-semibold mt-1">Recommended Reorder: {item.recommended_reorder} units</p>
                              )}
                              <p className="text-[9px] text-slate-400 mt-0.5">Alert Date: {item.timestamp}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="p-2 border-t border-slate-100 text-center">
                      <button 
                        onClick={() => { setActiveTab('Inventory'); setShowNotifications(false); }} 
                        className="text-xs font-bold text-primary-600 hover:text-primary-700 w-full py-1.5"
                      >
                        Manage Inventory →
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
            
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
        <main className={`flex-1 overflow-hidden bg-slate-50 ${activeTab === 'POS Counter' ? 'p-0' : 'p-6 lg:p-8 overflow-y-auto'}`}>
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
