import { useState, useEffect } from 'react';
import { getSalesAnalytics, getInventoryNotifications } from '../services/api';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';

const COLORS = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-card">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: p.color }}>
          {p.name}: {p.name === 'Revenue' ? '₹' : ''}{Number(p.value).toLocaleString()}
        </p>
      ))}
    </div>
  );
};

export default function DashboardTab({ setActiveTab }) {
  const [data, setData] = useState(null);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    getSalesAnalytics().then(res => setData(res.data)).catch(() => {});
    getInventoryNotifications().then(res => setNotifications(res.data.notifications || [])).catch(() => {});
  }, []);

  if (!data) return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-xl bg-slate-200 animate-pulse" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="h-80 lg:col-span-2 rounded-xl bg-slate-200 animate-pulse" />
        <div className="h-80 rounded-xl bg-slate-200 animate-pulse" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      <div>
        <h2 className="page-title">Business Overview</h2>
        <p className="page-subtitle">Your shop's performance at a glance</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Today's Revenue", value: `₹${data.today?.revenue?.toLocaleString() || 0}`, sub: `${data.today?.count || 0} sales`, color: 'text-green-600' },
          { label: 'Monthly Revenue', value: `₹${data.monthly?.revenue?.toLocaleString() || 0}`, sub: `${data.monthly?.count || 0} sales`, color: 'text-primary-600' },
          { label: 'Total Products',   value: '124', sub: 'In catalog', color: 'text-indigo-600' },
          { label: 'Pending Udhar',       value: '₹3,200', sub: 'From 4 customers', color: 'text-orange-600' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{s.label}</p>
            <h3 className={`text-2xl font-black ${s.color} mb-1`}>{s.value}</h3>
            <p className="text-xs text-slate-500">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="card lg:col-span-2">
          <div className="section-header">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Revenue Trend</h3>
              <p className="text-xs text-slate-500">Last 7 days</p>
            </div>
          </div>
          <div className="h-[300px] p-5">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.chart_data || []}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Products */}
        <div className="card flex flex-col">
          <div className="section-header">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Top Products</h3>
              <p className="text-xs text-slate-500">By revenue</p>
            </div>
          </div>
          <div className="flex-1 p-5">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.top_products || []} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={80} stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" name="Revenue" radius={[0, 4, 4, 0]} barSize={24}>
                  {(data.top_products || []).map((e, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Low Stock Alerts */}
        <div className="card">
          <div className="section-header">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${notifications.length > 0 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></span>
              Low Stock Alerts
            </h3>
            <button onClick={() => setActiveTab('Inventory')} className="text-xs font-semibold text-primary-600 hover:text-primary-700">View All</button>
          </div>
          <div className="p-4 space-y-3 max-h-[320px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm font-medium">
                ✅ All stock levels are healthy!
              </div>
            ) : (
              notifications.map((item) => (
                <div key={item.product_id} className={`flex items-center justify-between p-3 rounded-lg border ${
                  item.priority === 1 
                    ? 'bg-red-50 border-red-100 text-red-900' 
                    : (item.priority === 2 ? 'bg-orange-50 border-orange-100 text-orange-900' : 'bg-amber-50 border-amber-100 text-amber-900')
                }`}>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.product_name}</p>
                    <p className={`text-xs mt-0.5 font-semibold ${
                      item.priority === 1 ? 'text-red-600' : (item.priority === 2 ? 'text-orange-600' : 'text-amber-600')
                    }`}>
                      {item.current_stock === 0 ? 'Out of Stock' : `${item.current_stock} left in stock`}
                      <span className="text-slate-400 font-normal ml-2">({item.status_label})</span>
                    </p>
                    {item.recommended_reorder && (
                      <p className="text-[10px] text-slate-500 mt-1">
                        Recommended Reorder: <strong className="text-slate-700">{item.recommended_reorder} units</strong>
                      </p>
                    )}
                    <p className="text-[9px] text-slate-400 mt-0.5">Alert Date: {item.timestamp}</p>
                  </div>
                  <button onClick={() => setActiveTab('Inventory')} className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors bg-white border ${
                    item.priority === 1 
                      ? 'border-red-200 text-red-600 hover:bg-red-50' 
                      : (item.priority === 2 ? 'border-orange-200 text-orange-600 hover:bg-orange-50' : 'border-amber-200 text-amber-600 hover:bg-amber-50')
                  }`}>
                    Reorder
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* AI Business Insights Card */}
        <div className="card bg-gradient-brand text-white border-none shadow-glow">
          <div className="section-header border-white/20">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <span className="text-xl">✨</span>
              AI Business Insights
            </h3>
          </div>
          <div className="p-6">
            <p className="text-sm text-primary-50 leading-relaxed mb-6">
              "Your sales for **Aashirvaad Atta** usually peak on weekends. You currently have 2 left in stock. I recommend reordering at least 15 units before Friday to avoid stockouts."
            </p>
            <button onClick={() => setActiveTab('AIAssistant')} className="w-full bg-white text-primary-700 font-semibold py-2.5 rounded-lg text-sm hover:bg-primary-50 transition-colors">
              Chat with AI Assistant →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
