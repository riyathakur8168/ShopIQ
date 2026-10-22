import { useState } from 'react';
import SalesReports from '../components/sales/SalesReports';
import SalesAnalytics from '../components/sales/SalesAnalytics';
import SalesCSVUpload from '../components/sales/SalesCSVUpload';
import DashboardTab from './DashboardTab';

export default function Sales({ setActiveTab: setGlobalActiveTab }) {
  const [activeTab, setActiveTab] = useState('Overview');
  const [recentUploads, setRecentUploads] = useState([]);
  
  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      <div>
        <h2 className="page-title">Analytics & Reports</h2>
        <p className="page-subtitle">Business overview, detailed analytics, CSV imports, and reports</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 overflow-x-auto custom-scrollbar">
        {['Overview', 'Deep Analytics', 'CSV Import', 'Reports'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm font-semibold transition-colors relative whitespace-nowrap ${
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
        {activeTab === 'Deep Analytics' && <SalesAnalytics />}
        {activeTab === 'CSV Import' && <SalesCSVUpload recentUploads={recentUploads} setRecentUploads={setRecentUploads} setActiveTab={setActiveTab} />}
        {activeTab === 'Reports' && <SalesReports />}
      </div>
    </div>
  );
}
