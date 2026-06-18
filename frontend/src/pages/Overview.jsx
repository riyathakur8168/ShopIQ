import { useState, useEffect } from 'react';
import { getSalesAnalytics } from '../services/api';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'];

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

export default function Overview({ setActiveTab }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    getSalesAnalytics().then(res => setData(res.data)).catch(() => {});
  }, []);

  if (!data) return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-2xl bg-slate-200 animate-pulse" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="h-80 lg:col-span-2 rounded-2xl bg-slate-200 animate-pulse" />
        <div className="h-80 rounded-2xl bg-slate-200 animate-pulse" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="page-title">Business Overview</h2>
        <p className="page-subtitle">Your shop's performance at a glance</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Today's Revenue", value: `₹${data.today.revenue.toLocaleString()}`, sub: `${data.today.count} sales`, color: 'text-green-600' },
          { label: 'Monthly Revenue', value: `₹${data.monthly.revenue.toLocaleString()}`, sub: `${data.monthly.count} sales`, color: 'text-primary-600' },
          { label: 'Pending Udhar',   value: '₹...', sub: '3 customers', color: 'text-orange-600' },
          { label: 'Low Stock',       value: '2 items', sub: 'Needs reorder', color: 'text-red-600' },
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
              <AreaChart data={data.chart_data}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={v => `₹${v}`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
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
              <BarChart data={data.top_products} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={80} stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" name="Revenue" radius={[0, 4, 4, 0]} barSize={24}>
                  {data.top_products.map((e, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-4 px-1">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { id: 'Sales', icon: '🛒', label: 'New Sale', desc: 'Record a transaction' },
            { id: 'Inventory', icon: '📦', label: 'Add Stock', desc: 'Manage products' },
            { id: 'Udhar', icon: '💳', label: 'Udhar', desc: 'Customer credit' },
            { id: 'AIAssistant', icon: '🤖', label: 'Ask AI', desc: 'Get insights' },
          ].map(a => (
            <button key={a.id} onClick={() => setActiveTab(a.id)}
              className="card p-4 text-left hover:border-primary-300 hover:shadow-md transition-all group">
              <span className="text-2xl mb-2 block">{a.icon}</span>
              <span className="text-sm font-semibold text-slate-900 block group-hover:text-primary-600 transition-colors">{a.label}</span>
              <span className="text-xs text-slate-500">{a.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
