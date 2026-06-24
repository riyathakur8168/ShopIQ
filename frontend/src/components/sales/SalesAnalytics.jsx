import { useState, useEffect } from 'react';
import { getSalesAnalytics } from '../../services/api';
import { BarChart, Bar, Cell, PieChart, Pie, LabelList, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function SalesAnalytics() {
  const [selectedSource, setSelectedSource] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getSalesAnalytics(selectedSource ? { source: selectedSource } : {})
      .then(res => {
        setData(res.data);
        if (res.data.current_source && selectedSource !== res.data.current_source) {
          setSelectedSource(res.data.current_source);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [selectedSource]);

  if (!data) return <div className="flex justify-center p-12"><span className="spinner"></span></div>;

  const processedCategoryData = (() => {
    if (!data.category_data) return [];
    const map = {};
    const revenueMap = {};
    data.category_data.forEach(item => {
      if (!item.name) return;
      const trimmed = item.name.trim();
      if (!trimmed) return;
      
      const normalized = trimmed.toLowerCase();
      map[normalized] = (map[normalized] || 0) + (Number(item.value) || 0);
      revenueMap[normalized] = (revenueMap[normalized] || 0) + (Number(item.revenue) || 0);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ 
        name: name.replace(/\b\w/g, char => char.toUpperCase()), 
        value: Math.round(value * 100) / 100,
        revenue: Math.round(revenueMap[name] * 100) / 100
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.revenue - a.revenue);
  })();

  const aiInsights = (() => {
    const insights = [];
    
    if (data.top_selling_product && data.top_selling_product.name !== 'N/A') {
      insights.push({
        type: 'success',
        icon: '🏆',
        title: 'Top Demand Driver',
        text: `${data.top_selling_product.name} is leading sales with ${data.top_selling_product.quantity} units sold. Ensure sufficient inventory buffer to avoid stockouts.`
      });
    }

    if (data.highest_revenue_product && data.highest_revenue_product.name !== 'N/A') {
      insights.push({
        type: 'revenue',
        icon: '💰',
        title: 'Revenue Engine',
        text: `${data.highest_revenue_product.name} is the top revenue generator, contributing ₹${data.highest_revenue_product.revenue.toLocaleString(undefined, {minimumFractionDigits: 2})} in gross sales.`
      });
    }

    if (data.highest_profit_product && data.highest_profit_product.name !== 'N/A') {
      insights.push({
        type: 'profit',
        icon: '📈',
        title: 'High-Margin Winner',
        text: `${data.highest_profit_product.name} yields a stellar ${data.highest_profit_product.margin}% net profit margin (₹${data.highest_profit_product.profit.toLocaleString()} profit). Prioritize promotion of this item.`
      });
    }

    if (processedCategoryData && processedCategoryData.length > 0) {
      insights.push({
        type: 'category',
        icon: '🗂️',
        title: 'Category Performance',
        text: `${processedCategoryData[0].name} is your dominant category, accounting for ${processedCategoryData[0].value}% of category-wise sales revenue.`
      });
    }

    if (data.low_stock_count > 0) {
      insights.push({
        type: 'warning',
        icon: '⚠️',
        title: 'Inventory Alert',
        text: `There are ${data.low_stock_count} products currently below their low-stock threshold. Restock recommended to maintain retail operations.`
      });
    } else {
      insights.push({
        type: 'info',
        icon: '✅',
        title: 'Inventory Healthy',
        text: 'All catalog items are currently above their low-stock thresholds. No urgent restock action is required.'
      });
    }

    return insights;
  })();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-lg text-primary-600 shadow-inner flex-shrink-0">
            📂
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Analysis Source</p>
            <h4 className="text-sm font-black text-slate-800 mt-0.5">
              {data.current_source === 'combined' ? 'Combined Analytics (All CSVs + POS)' : 
               (data.current_source === 'POS' ? 'Manual POS Sales Catalog' : data.current_source)}
            </h4>
          </div>
        </div>
        
        <div className={`flex items-center gap-2 transition-opacity ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Select Dataset:</label>
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer min-w-[200px]"
          >
            <option value="combined">🗂️ Combined Analytics (All)</option>
            <option value="POS">💻 Manual POS Sales Only</option>
            {data.uploaded_files && data.uploaded_files.map(file => (
              <option key={file} value={file}>📄 {file}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Revenue</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              ₹{(data.total_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="text-xl bg-amber-50 p-2.5 rounded-lg text-amber-600 flex-shrink-0 ml-3">💰</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Orders</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {(data.total_orders || 0).toLocaleString()}
            </h3>
          </div>
          <div className="text-xl bg-blue-50 p-2.5 rounded-lg text-blue-600 flex-shrink-0 ml-3">📦</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Quantity Sold</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {(data.total_qty_sold || 0).toLocaleString()}
            </h3>
          </div>
          <div className="text-xl bg-emerald-50 p-2.5 rounded-lg text-emerald-600 flex-shrink-0 ml-3">🛒</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 uppercase tracking-wider">
              <span>🏆</span> Top Seller
            </div>
            <h4 className="text-base font-extrabold text-slate-800 mt-1 line-clamp-1" title={data.top_selling_product?.name}>
              {data.top_selling_product?.name || 'N/A'}
            </h4>
          </div>
          <div className="text-sm font-semibold text-slate-500 mt-2">
            {data.top_selling_product?.quantity || 0} Units
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 uppercase tracking-wider">
              <span>💰</span> Revenue King
            </div>
            <h4 className="text-base font-extrabold text-slate-800 mt-1 line-clamp-1" title={data.highest_revenue_product?.name}>
              {data.highest_revenue_product?.name || 'N/A'}
            </h4>
          </div>
          <div className="text-sm font-semibold text-slate-500 mt-2">
            ₹{(data.highest_revenue_product?.revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 uppercase tracking-wider">
              <span>📈</span> Profit Leader
            </div>
            <h4 className="text-base font-extrabold text-slate-800 mt-1 line-clamp-1" title={data.highest_profit_product?.name}>
              {data.highest_profit_product?.name || 'N/A'}
            </h4>
          </div>
          <div className="text-xs font-medium text-slate-500 mt-2 flex flex-wrap items-center gap-1">
            <span className="font-bold text-slate-700">₹{(data.highest_profit_product?.profit || 0).toLocaleString()} Profit</span>
            <span>•</span>
            <span className="font-extrabold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              {data.highest_profit_product?.margin}% Margin
            </span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-sm font-extrabold text-slate-800">Sales Volume by Product</h3>
        </div>
        <div className="p-6">
          {data.sales_volume_by_product && data.sales_volume_by_product.length > 0 ? (
            <div className="h-[450px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.sales_volume_by_product}
                  layout="vertical"
                  margin={{ top: 10, right: 50, left: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    stroke="#475569"
                    fontSize={11}
                    fontWeight="semibold"
                    tickLine={false}
                    axisLine={false}
                    width={140}
                  />
                  <Tooltip formatter={(value) => [`${value} units`, "Quantity Sold"]} />
                  <Bar dataKey="quantity" radius={[0, 6, 6, 0]} barSize={20}>
                    {data.sales_volume_by_product.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={index === 0 ? '#6366f1' : '#cbd5e1'}
                      />
                    ))}
                    <LabelList dataKey="quantity" position="right" style={{ fill: '#1e293b', fontWeight: 'bold', fontSize: 11 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm font-medium">
              No product sales volume data available
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-sm font-extrabold text-slate-800">Revenue by Category</h3>
        </div>
        <div className="p-6">
          {processedCategoryData.length > 0 ? (
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={processedCategoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                    nameKey="name"
                    labelLine={true}
                    label={({ name, value }) => `${name}: ${value ? value.toFixed(1) : 0}%`}
                  >
                    {processedCategoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#6366f1', '#10b981', '#fb923c', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'][index % 7]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name, entry) => [
                    entry.payload.revenue !== undefined 
                      ? `₹${entry.payload.revenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` 
                      : `₹${value}`, 
                    "Revenue"
                  ]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm font-medium">
              No category data available
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">✨</span>
          <h3 className="text-base font-extrabold text-slate-900">AI Insights & Recommendations</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {aiInsights.map((insight, idx) => (
            <div key={idx} className="flex gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <div className="text-xl select-none">{insight.icon}</div>
              <div>
                <h5 className="text-sm font-extrabold text-slate-800">{insight.title}</h5>
                <p className="text-xs font-semibold text-slate-500 mt-1 leading-relaxed">{insight.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
