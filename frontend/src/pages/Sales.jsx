import { useState } from 'react';
import SalesEntry from '../components/sales/SalesEntry';
import SalesCSVUpload from '../components/sales/SalesCSVUpload';
import SalesAnalytics from '../components/sales/SalesAnalytics';
import SalesReports from '../components/sales/SalesReports';
import DashboardTab from './DashboardTab';

export default function Sales({ setActiveTab: setGlobalActiveTab }) {
  const [activeTab, setActiveTab] = useState('Overview');
  const [recentUploads, setRecentUploads] = useState([]);
  
  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      <div>
        <h2 className="page-title">Analytics & Reports</h2>
        <p className="page-subtitle">Business overview, analytics, and legacy sales tools</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        {['Overview', 'Sales Entry', 'CSV Upload', 'Analytics', 'Reports'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm font-semibold transition-colors relative ${
              activeTab === tab ? 'text-primary-600' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary-600 rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="pt-2">
        {activeTab === 'Overview' && <DashboardTab setActiveTab={setGlobalActiveTab} />}
        {activeTab === 'Sales Entry' && <SalesEntry />}
        {activeTab === 'CSV Upload' && <SalesCSVUpload recentUploads={recentUploads} setRecentUploads={setRecentUploads} setActiveTab={setActiveTab} />}
        {activeTab === 'Analytics' && <SalesAnalytics />}
        {activeTab === 'Reports' && <SalesReports />}
      </div>
    </div>
  );
}
