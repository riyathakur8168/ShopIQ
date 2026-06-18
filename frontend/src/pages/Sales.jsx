import { useState, useEffect } from 'react';
import { getProducts, addSale, getSalesAnalytics } from '../services/api';
import { useToast } from '../context/ToastContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

export default function Sales() {
  const [activeTab, setActiveTab] = useState('Sales Entry');
  
  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      <div>
        <h2 className="page-title">Sales & Analytics</h2>
        <p className="page-subtitle">Manage transactions and view performance reports</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        {['Sales Entry', 'CSV Upload', 'Analytics', 'Reports'].map(tab => (
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
        {activeTab === 'Sales Entry' && <SalesEntryTab />}
        {activeTab === 'CSV Upload' && <CSVUploadTab />}
        {activeTab === 'Analytics' && <AnalyticsTab />}
        {activeTab === 'Reports' && <ReportsTab />}
      </div>
    </div>
  );
}

function SalesEntryTab() {
  const [products, setProducts] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState(null);
  
  const [form, setForm] = useState({ product_id: '', quantity: 1, note: '' });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [pRes, aRes] = await Promise.all([getProducts(), getSalesAnalytics()]);
      setProducts(pRes.data);
      setStats(aRes.data.today);
      setHistory(aRes.data.recent_sales || []);
    } catch { toast('Failed to load data', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleProductChange = (e) => {
    const id = e.target.value;
    setForm(prev => ({ ...prev, product_id: id }));
    setSelectedProduct(products.find(p => p.id === Number(id)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return toast('Select a product', 'warning');
    if (form.quantity > selectedProduct.stock_quantity) {
      return toast(`Only ${selectedProduct.stock_quantity} units available!`, 'error');
    }

    setSubmitting(true);
    try {
      await addSale({
        product_id: form.product_id,
        quantity: form.quantity,
        total_price: form.quantity * selectedProduct.sell_price,
        note: form.note
      });
      toast('Sale recorded successfully!', 'success');
      setForm({ product_id: '', quantity: 1, note: '' });
      setSelectedProduct(null);
      load();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to record sale', 'error');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      {/* Form */}
      <div className="card p-6 lg:col-span-1 h-fit">
        <h3 className="text-sm font-semibold text-slate-900 mb-5">New Sale Entry</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="input-label">Select Product</label>
            <select required className="input" value={form.product_id} onChange={handleProductChange}>
              <option value="">-- Choose Product --</option>
              {products.map(p => (
                <option key={p.id} value={p.id} disabled={p.stock_quantity === 0}>
                  {p.name} (₹{p.sell_price}) {p.stock_quantity === 0 ? '— OUT OF STOCK' : ''}
                </option>
              ))}
            </select>
          </div>

          {selectedProduct && (
            <div className="flex justify-between text-xs px-1">
              <span className="text-slate-500">Available Stock:</span>
              <span className={`font-bold ${selectedProduct.stock_quantity < 5 ? 'text-red-500' : 'text-green-600'}`}>
                {selectedProduct.stock_quantity}
              </span>
            </div>
          )}

          <div>
            <label className="input-label">Quantity</label>
            <input required type="number" min="1" className="input" value={form.quantity}
              onChange={e => setForm(f => ({ ...f, quantity: Number(e.target.value) }))} />
          </div>

          <div className="pt-4 border-t border-slate-200">
            <div className="flex justify-between items-end mb-4">
              <span className="text-sm text-slate-500 font-medium">Total Amount</span>
              <span className="text-2xl font-black text-slate-900">
                ₹{selectedProduct ? (selectedProduct.sell_price * form.quantity).toLocaleString() : '0'}
              </span>
            </div>
            <button type="submit" disabled={submitting || !selectedProduct} className="btn-primary w-full py-3 disabled:opacity-60 disabled:cursor-not-allowed">
              {submitting ? 'Processing...' : 'Complete Sale'}
            </button>
          </div>
        </form>
      </div>

      {/* History */}
      <div className="card lg:col-span-2 flex flex-col h-[500px]">
        <div className="section-header">
          <h3 className="section-title">Today's Transactions</h3>
          <div className="text-sm font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full">
            Revenue: ₹{stats?.revenue?.toLocaleString() || 0}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-0">
          {loading ? (
            <div className="flex items-center justify-center h-40"><span className="spinner" /></div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-500">
              <span className="text-3xl mb-2">🧾</span>
              <p className="text-sm">No sales recorded yet today</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-white z-10 shadow-sm">
                <tr>
                  <th className="table-header">Time</th>
                  <th className="table-header">Item</th>
                  <th className="table-header">Qty</th>
                  <th className="table-header">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map(s => (
                  <tr key={s.id} className="table-row">
                    <td className="table-cell text-slate-500 text-xs">{new Date(s.sale_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="table-cell font-medium text-slate-900">{s.product_name}</td>
                    <td className="table-cell font-semibold text-slate-600">{s.quantity}</td>
                    <td className="table-cell font-bold text-green-600">₹{s.total_price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function CSVUploadTab() {
  return (
    <div className="card p-8 text-center animate-fade-in max-w-2xl mx-auto mt-8">
      <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-2">Upload Bulk Sales (CSV)</h3>
      <p className="text-sm text-slate-500 mb-6">Drag and drop your POS export file here to sync offline sales.</p>
      
      <div className="border-2 border-dashed border-slate-300 rounded-2xl p-12 hover:border-primary-500 hover:bg-primary-50 transition-colors cursor-pointer group">
        <p className="text-sm font-semibold text-slate-600 group-hover:text-primary-700">Click to browse or drag file here</p>
        <p className="text-xs text-slate-400 mt-2">Supports .csv, .xls, .xlsx (Max 5MB)</p>
      </div>
      
      <div className="mt-8 text-left">
        <h4 className="text-sm font-semibold text-slate-900 mb-3">Recent Uploads</h4>
        <div className="text-sm text-slate-500 border border-slate-200 rounded-lg p-4 bg-slate-50 text-center">
          No recent uploads found.
        </div>
      </div>
    </div>
  );
}

function AnalyticsTab() {
  const [data, setData] = useState(null);

  useEffect(() => {
    getSalesAnalytics().then(res => setData(res.data)).catch(() => {});
  }, []);

  if (!data) return <div className="flex justify-center p-12"><span className="spinner"></span></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="section-header">
            <h3 className="section-title">Sales Volume (Last 7 Days)</h3>
          </div>
          <div className="h-[300px] p-5">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.chart_data || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="sales_count" name="Items Sold" stroke="#6366f1" fill="#e0e7ff" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="card">
          <div className="section-header">
            <h3 className="section-title">Revenue by Category</h3>
          </div>
          <div className="flex items-center justify-center h-[300px] text-slate-400 text-sm">
            Interactive pie chart coming soon
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportsTab() {
  return (
    <div className="card animate-fade-in max-w-4xl mx-auto mt-4">
      <div className="section-header">
        <h3 className="section-title">Generate Reports</h3>
      </div>
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="border border-slate-200 rounded-xl p-5 hover:border-primary-500 cursor-pointer transition-colors bg-white hover:shadow-md">
            <div className="w-10 h-10 bg-primary-100 text-primary-700 rounded-lg flex items-center justify-center mb-3">📅</div>
            <h4 className="font-semibold text-slate-900 mb-1">Weekly Summary</h4>
            <p className="text-xs text-slate-500">Sales, revenue, and top products for the past 7 days.</p>
            <button className="text-sm text-primary-600 font-semibold mt-4">Export PDF →</button>
          </div>
          <div className="border border-slate-200 rounded-xl p-5 hover:border-primary-500 cursor-pointer transition-colors bg-white hover:shadow-md">
            <div className="w-10 h-10 bg-green-100 text-green-700 rounded-lg flex items-center justify-center mb-3">📈</div>
            <h4 className="font-semibold text-slate-900 mb-1">Monthly Report</h4>
            <p className="text-xs text-slate-500">Comprehensive overview of the entire month's performance.</p>
            <button className="text-sm text-primary-600 font-semibold mt-4">Export PDF →</button>
          </div>
          <div className="border border-slate-200 rounded-xl p-5 hover:border-primary-500 cursor-pointer transition-colors bg-white hover:shadow-md">
            <div className="w-10 h-10 bg-orange-100 text-orange-700 rounded-lg flex items-center justify-center mb-3">📦</div>
            <h4 className="font-semibold text-slate-900 mb-1">Inventory Value</h4>
            <p className="text-xs text-slate-500">Current valuation of all stock based on buy/sell prices.</p>
            <button className="text-sm text-primary-600 font-semibold mt-4">Export CSV →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
