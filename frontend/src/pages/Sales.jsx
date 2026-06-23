import { useState, useEffect } from 'react';
import { getProducts, addSale, getSalesAnalytics, getSales, uploadSalesCSV, addProduct } from '../services/api';
import { useToast } from '../context/ToastContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie } from 'recharts';

export default function Sales() {
  const [activeTab, setActiveTab] = useState('Sales Entry');
  const [recentUploads, setRecentUploads] = useState([]);
  
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
        {activeTab === 'CSV Upload' && <CSVUploadTab recentUploads={recentUploads} setRecentUploads={setRecentUploads} setActiveTab={setActiveTab} />}
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
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [newProductForm, setNewProductForm] = useState({ name: '', buy_price: '', sell_price: '', stock_quantity: '' });
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [pRes, aRes, sRes] = await Promise.all([getProducts(), getSalesAnalytics(), getSales({ per_page: 20 })]);
      setProducts(pRes.data);
      setStats(aRes.data.today);
      setHistory(sRes.data.sales || []);
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
    setSubmitting(true);
    try {
      let productIdToSell = form.product_id;
      let unitPrice = selectedProduct?.sell_price;

      if (isNewProduct) {
        if (!newProductForm.name || !newProductForm.buy_price || !newProductForm.sell_price || !newProductForm.stock_quantity) {
          toast('Please fill all new product fields', 'warning');
          setSubmitting(false);
          return;
        }
        if (form.quantity > Number(newProductForm.stock_quantity)) {
          toast(`Cannot sell more than the initial stock (${newProductForm.stock_quantity})`, 'error');
          setSubmitting(false);
          return;
        }
        
        // Create the product first
        const prodRes = await addProduct({
          name: newProductForm.name,
          category: 'General',
          buy_price: Number(newProductForm.buy_price),
          sell_price: Number(newProductForm.sell_price),
          stock_quantity: Number(newProductForm.stock_quantity)
        });
        
        productIdToSell = prodRes.data.product.id;
        unitPrice = Number(newProductForm.sell_price);
      } else {
        if (!selectedProduct) {
          setSubmitting(false);
          return toast('Select a product', 'warning');
        }
        if (form.quantity > selectedProduct.stock_quantity) {
          setSubmitting(false);
          return toast(`Only ${selectedProduct.stock_quantity} units available!`, 'error');
        }
      }

      await addSale({
        product_id: productIdToSell,
        quantity: form.quantity,
        unit_price: unitPrice,
        note: form.note
      });
      toast('Sale recorded successfully!', 'success');
      
      // Reset forms
      setForm({ product_id: '', quantity: 1, note: '' });
      setSelectedProduct(null);
      setIsNewProduct(false);
      setNewProductForm({ name: '', buy_price: '', sell_price: '', stock_quantity: '' });
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
          <div className="flex items-center justify-between mb-2">
            <label className="input-label mb-0">Product Type</label>
            <div className="flex items-center space-x-2 text-sm">
              <button type="button" onClick={() => setIsNewProduct(false)} className={`px-2 py-1 rounded ${!isNewProduct ? 'bg-primary-100 text-primary-700 font-bold' : 'text-slate-500'}`}>Existing</button>
              <button type="button" onClick={() => setIsNewProduct(true)} className={`px-2 py-1 rounded ${isNewProduct ? 'bg-primary-100 text-primary-700 font-bold' : 'text-slate-500'}`}>+ New</button>
            </div>
          </div>

          {!isNewProduct ? (
            <>
              <div>
                <select required={!isNewProduct} className="input" value={form.product_id} onChange={handleProductChange}>
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
            </>
          ) : (
            <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <div>
                <label className="text-xs font-semibold text-slate-700">Product Name</label>
                <input required={isNewProduct} type="text" className="input mt-1" placeholder="e.g. Wireless Mouse" value={newProductForm.name} onChange={e => setNewProductForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Buy Price (₹)</label>
                  <input required={isNewProduct} type="number" min="0" step="0.01" className="input mt-1" value={newProductForm.buy_price} onChange={e => setNewProductForm(f => ({ ...f, buy_price: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Sell Price (₹)</label>
                  <input required={isNewProduct} type="number" min="0" step="0.01" className="input mt-1" value={newProductForm.sell_price} onChange={e => setNewProductForm(f => ({ ...f, sell_price: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Initial Stock Added</label>
                <input required={isNewProduct} type="number" min="1" className="input mt-1" placeholder="e.g. 50" value={newProductForm.stock_quantity} onChange={e => setNewProductForm(f => ({ ...f, stock_quantity: e.target.value }))} />
              </div>
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
                ₹{(!isNewProduct && selectedProduct) 
                  ? (selectedProduct.sell_price * form.quantity).toLocaleString() 
                  : (isNewProduct && newProductForm.sell_price)
                    ? (Number(newProductForm.sell_price) * form.quantity).toLocaleString()
                    : '0'}
              </span>
            </div>
            <button type="submit" disabled={submitting || (!isNewProduct && !selectedProduct)} className="btn-primary w-full py-3 disabled:opacity-60 disabled:cursor-not-allowed">
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
                    <td className="table-cell text-slate-500 text-xs">{new Date(s.sale_date).toLocaleDateString('en-IN')}</td>
                    <td className="table-cell font-medium text-slate-900">{s.product_name}</td>
                    <td className="table-cell font-semibold text-slate-600">{s.quantity}</td>
                    <td className="table-cell font-bold text-green-600">₹{s.total_amount}</td>
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

function CSVUploadTab({ recentUploads, setRecentUploads, setActiveTab }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadSalesCSV(file);
      toast(res.data.message, 'success');
      if (res.data.errors && res.data.errors.length > 0) {
        res.data.errors.forEach(err => toast(err, 'error'));
      }
      setRecentUploads(prev => [{ name: file.name, date: new Date().toLocaleString(), success: res.data.success_count }, ...prev]);
      setFile(null);
    } catch (err) {
      toast(err.response?.data?.message || 'Upload failed', 'error');
      if (err.response?.data?.errors && err.response.data.errors.length > 0) {
        err.response.data.errors.forEach(e => toast(e, 'error'));
      }
      
      // Even if it failed completely, record it in the history so the user knows an attempt was made
      setRecentUploads(prev => [{ name: file?.name || 'Unknown', date: new Date().toLocaleString(), success: 0, failed: true }, ...prev]);
      setFile(null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="card p-8 text-center animate-fade-in max-w-2xl mx-auto mt-8">
      <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-2">Upload Bulk Sales (CSV)</h3>
      <p className="text-sm text-slate-500 mb-6">Drag and drop your POS export file here to sync offline sales.</p>
      
      <label className="border-2 border-dashed border-slate-300 rounded-2xl p-12 hover:border-primary-500 hover:bg-primary-50 transition-colors cursor-pointer group block">
        <input type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
        {file ? (
          <p className="text-sm font-semibold text-primary-700">{file.name}</p>
        ) : (
          <p className="text-sm font-semibold text-slate-600 group-hover:text-primary-700">Click to browse or drag file here</p>
        )}
        <p className="text-xs text-slate-400 mt-2">Supports .csv (Max 5MB)</p>
      </label>
      
      {file && (
        <button 
          onClick={handleUpload} 
          disabled={uploading}
          className="btn-primary w-full mt-4 py-3 disabled:opacity-60"
        >
          {uploading ? 'Uploading...' : 'Process Upload'}
        </button>
      )}
      
      <div className="mt-8 text-left">
        <h4 className="text-sm font-semibold text-slate-900 mb-3">Recent Uploads</h4>
        {recentUploads.length === 0 ? (
          <div className="text-sm text-slate-500 border border-slate-200 rounded-lg p-4 bg-slate-50 text-center">
            No recent uploads found.
          </div>
        ) : (
          <div className="space-y-2">
            {recentUploads.map((u, i) => (
              <div key={i} className={`flex justify-between items-center text-sm p-3 border rounded-lg ${u.failed ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-slate-50'}`}>
                <div>
                  <span className={`font-semibold ${u.failed ? 'text-red-800' : 'text-slate-800'}`}>{u.name}</span>
                  <div className={`${u.failed ? 'text-red-500' : 'text-slate-500'} text-xs mt-1`}>
                    {u.failed ? 'Upload completely failed' : `${u.success} rows imported`} • {u.date}
                  </div>
                </div>
                {!u.failed && (
                  <button 
                    onClick={() => setActiveTab('Analytics')} 
                    className="text-primary-600 text-xs font-semibold hover:text-primary-800 transition-colors bg-primary-50 px-3 py-1.5 rounded-md hover:bg-primary-100"
                  >
                    View Analysis →
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
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
                <Area type="monotone" dataKey="sales" name="Items Sold" stroke="#6366f1" fill="#e0e7ff" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="card">
          <div className="section-header">
            <h3 className="section-title">Revenue by Category</h3>
          </div>
          <div className="h-[300px] p-5">
            {data.category_data && data.category_data.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.category_data}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {data.category_data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `₹${value}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                No category data available
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportsTab() {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);

  const generateReport = async (type) => {
    setGenerating(true);
    try {
      let content = '';
      if (type === 'weekly' || type === 'monthly') {
        const days = type === 'weekly' ? 7 : 30;
        const d = new Date();
        d.setDate(d.getDate() - days);
        const startDate = d.toISOString().split('T')[0];
        
        const res = await getSales({ per_page: 1000, start_date: startDate });
        const sales = res.data.sales || [];
        
        const totalRev = sales.reduce((sum, s) => sum + s.total_amount, 0);
        
        content = `
          <h2>${type === 'weekly' ? 'Weekly' : 'Monthly'} Sales Report</h2>
          <p><strong>Generated on:</strong> ${new Date().toLocaleDateString()}</p>
          <p><strong>Total Revenue:</strong> ₹${totalRev.toLocaleString()}</p>
          <p><strong>Total Transactions:</strong> ${sales.length}</p>
          <hr/>
          <table>
            <thead>
              <tr><th>Date</th><th>Product</th><th>Qty</th><th>Total</th></tr>
            </thead>
            <tbody>
              ${sales.map(s => `<tr><td>${s.sale_date}</td><td>${s.product_name}</td><td>${s.quantity}</td><td>₹${s.total_amount}</td></tr>`).join('')}
            </tbody>
          </table>
        `;
      } else if (type === 'inventory') {
        const res = await getProducts();
        const products = res.data || [];
        
        const totalVal = products.reduce((sum, p) => sum + (p.buy_price * p.stock_quantity), 0);
        
        content = `
          <h2>Inventory Valuation Report</h2>
          <p><strong>Generated on:</strong> ${new Date().toLocaleDateString()}</p>
          <p><strong>Total Inventory Value:</strong> ₹${totalVal.toLocaleString()}</p>
          <hr/>
          <table>
            <thead>
              <tr><th>Product</th><th>Stock</th><th>Buy Price</th><th>Total Value</th></tr>
            </thead>
            <tbody>
              ${products.map(p => `<tr><td>${p.name}</td><td>${p.stock_quantity}</td><td>₹${p.buy_price}</td><td>₹${(p.buy_price * p.stock_quantity).toFixed(2)}</td></tr>`).join('')}
            </tbody>
          </table>
        `;
      }
      
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
          <head>
            <title>ShopIQ Report - ${type}</title>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; }
              h2 { color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
              th, td { border: 1px solid #cbd5e1; padding: 12px; text-align: left; }
              th { background-color: #f8fafc; font-weight: 600; color: #334155; }
              tr:nth-child(even) { background-color: #f8fafc; }
              hr { border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0; }
            </style>
          </head>
          <body>${content}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
      
    } catch (err) {
      toast('Failed to generate report', 'error');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="card animate-fade-in max-w-4xl mx-auto mt-4">
      <div className="section-header">
        <h3 className="section-title">Generate Reports</h3>
      </div>
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div onClick={() => !generating && generateReport('weekly')} className="border border-slate-200 rounded-xl p-5 hover:border-primary-500 cursor-pointer transition-colors bg-white hover:shadow-md">
            <div className="w-10 h-10 bg-primary-100 text-primary-700 rounded-lg flex items-center justify-center mb-3">📅</div>
            <h4 className="font-semibold text-slate-900 mb-1">Weekly Summary</h4>
            <p className="text-xs text-slate-500">Sales, revenue, and top products for the past 7 days.</p>
            <button disabled={generating} className="text-sm text-primary-600 font-semibold mt-4 disabled:opacity-50">Export PDF →</button>
          </div>
          <div onClick={() => !generating && generateReport('monthly')} className="border border-slate-200 rounded-xl p-5 hover:border-primary-500 cursor-pointer transition-colors bg-white hover:shadow-md">
            <div className="w-10 h-10 bg-green-100 text-green-700 rounded-lg flex items-center justify-center mb-3">📈</div>
            <h4 className="font-semibold text-slate-900 mb-1">Monthly Report</h4>
            <p className="text-xs text-slate-500">Comprehensive overview of the entire month's performance.</p>
            <button disabled={generating} className="text-sm text-primary-600 font-semibold mt-4 disabled:opacity-50">Export PDF →</button>
          </div>
          <div onClick={() => !generating && generateReport('inventory')} className="border border-slate-200 rounded-xl p-5 hover:border-primary-500 cursor-pointer transition-colors bg-white hover:shadow-md">
            <div className="w-10 h-10 bg-orange-100 text-orange-700 rounded-lg flex items-center justify-center mb-3">📦</div>
            <h4 className="font-semibold text-slate-900 mb-1">Inventory Value</h4>
            <p className="text-xs text-slate-500">Current valuation of all stock based on buy/sell prices.</p>
            <button disabled={generating} className="text-sm text-primary-600 font-semibold mt-4 disabled:opacity-50">Export PDF →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
