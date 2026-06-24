import { useState, useEffect } from 'react';
import { getProducts, addSale, getSalesAnalytics, getSales, uploadSalesCSV, addProduct } from '../services/api';
import { useToast } from '../context/ToastContext';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, LabelList } from 'recharts';

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
  
  const [cart, setCart] = useState([]);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [newProductForm, setNewProductForm] = useState({ name: '', buy_price: '', sell_price: '', stock_quantity: '' });
  const [searchQuery, setSearchQuery] = useState('');
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

  const addToCart = (product) => {
    if (product.stock_quantity <= 0) return toast('Product is out of stock', 'error');
    
    setCart(prevCart => {
      const existing = prevCart.find(item => item.product_id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock_quantity) {
          toast(`Only ${product.stock_quantity} units available!`, 'warning');
          return prevCart;
        }
        return prevCart.map(item => item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prevCart, { 
        product_id: product.id, 
        name: product.name, 
        sell_price: product.sell_price, 
        quantity: 1, 
        max_stock: product.stock_quantity,
        is_new: false
      }];
    });
    setSearchQuery('');
  };

  const updateCartQuantity = (productId, newQty) => {
    if (newQty < 1) return;
    setCart(prevCart => prevCart.map(item => {
      if (item.product_id === productId) {
        if (newQty > item.max_stock && !item.is_new) {
          toast(`Only ${item.max_stock} units available!`, 'warning');
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.product_id !== productId));
  };

  const handleAddNewProductToCart = () => {
    if (!newProductForm.name || !newProductForm.buy_price || !newProductForm.sell_price || !newProductForm.stock_quantity) {
      return toast('Please fill all new product fields', 'warning');
    }
    
    const tempId = 'new_' + Date.now();
    
    setCart(prev => [...prev, {
      product_id: tempId,
      name: newProductForm.name,
      buy_price: Number(newProductForm.buy_price),
      sell_price: Number(newProductForm.sell_price),
      quantity: 1,
      max_stock: Number(newProductForm.stock_quantity),
      is_new: true
    }]);
    
    setIsNewProduct(false);
    setNewProductForm({ name: '', buy_price: '', sell_price: '', stock_quantity: '' });
  };

  const handleSubmit = async () => {
    if (cart.length === 0) return toast('Cart is empty', 'warning');
    
    setSubmitting(true);
    let successCount = 0;
    
    try {
      for (const item of cart) {
        let finalProductId = item.product_id;
        
        if (item.is_new) {
          if (item.quantity > item.max_stock) {
            toast(`Cannot sell ${item.quantity} of ${item.name} (only ${item.max_stock} added to stock)`, 'error');
            throw new Error('Stock violation on new product');
          }
          const prodRes = await addProduct({
            name: item.name,
            category: 'General',
            buy_price: item.buy_price,
            sell_price: item.sell_price,
            stock_quantity: item.max_stock
          });
          finalProductId = prodRes.data.product.id;
        }

        await addSale({
          product_id: finalProductId,
          quantity: item.quantity,
          unit_price: item.sell_price,
          note: ''
        });
        successCount++;
      }
      
      toast(`Successfully completed sale of ${successCount} items!`, 'success');
      setCart([]);
      load();
    } catch (err) {
      toast(err.response?.data?.message || 'Error processing some items in the cart', 'error');
      load();
    } finally { 
      setSubmitting(false); 
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.sell_price * item.quantity), 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      {/* POS Cart Section */}
      <div className="card p-6 lg:col-span-2 flex flex-col h-[650px]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-900">Point of Sale</h3>
          <div className="flex items-center space-x-2 text-sm">
            <button type="button" onClick={() => setIsNewProduct(false)} className={`px-3 py-1.5 rounded-lg transition-colors ${!isNewProduct ? 'bg-primary-100 text-primary-700 font-bold' : 'text-slate-500 hover:bg-slate-100'}`}>Search</button>
            <button type="button" onClick={() => setIsNewProduct(true)} className={`px-3 py-1.5 rounded-lg transition-colors ${isNewProduct ? 'bg-primary-100 text-primary-700 font-bold' : 'text-slate-500 hover:bg-slate-100'}`}>+ New Product</button>
          </div>
        </div>

        {/* Product Selection Area */}
        <div className="mb-4">
          {!isNewProduct ? (
            <div className="relative z-20 space-y-2">
              <input 
                type="text" 
                className="input bg-slate-50 border-slate-200 shadow-inner w-full text-lg py-3" 
                placeholder="🔍 Search to add product to cart..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto bg-white shadow-inner divide-y divide-slate-100">
                {products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                  <div className="p-6 text-sm text-slate-500 text-center font-medium">No products found.</div>
                ) : (
                  products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => addToCart(p)}
                      className={`p-3 flex justify-between items-center transition-all ${p.stock_quantity === 0 ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'cursor-pointer hover:bg-primary-50 active:bg-primary-100'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-lg shadow-sm border border-slate-200">📦</div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{p.name}</p>
                          <p className="text-xs text-slate-500 font-medium">₹{p.sell_price} / unit</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${p.stock_quantity === 0 ? 'bg-red-50 text-red-600' : (p.stock_quantity < 5 ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600')}`}>
                          {p.stock_quantity === 0 ? 'Out of Stock' : `${p.stock_quantity} in stock`}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Quick Add New Product</h4>
                <button onClick={handleAddNewProductToCart} className="text-xs font-bold bg-primary-600 text-white px-3 py-1.5 rounded-lg hover:bg-primary-700 transition-colors">Add to Cart</button>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-2">
                  <input type="text" className="input text-sm py-1.5" placeholder="Product Name" value={newProductForm.name} onChange={e => setNewProductForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <input type="number" min="0" step="0.01" className="input text-sm py-1.5" placeholder="Buy ₹" value={newProductForm.buy_price} onChange={e => setNewProductForm(f => ({ ...f, buy_price: e.target.value }))} />
                </div>
                <div>
                  <input type="number" min="0" step="0.01" className="input text-sm py-1.5" placeholder="Sell ₹" value={newProductForm.sell_price} onChange={e => setNewProductForm(f => ({ ...f, sell_price: e.target.value }))} />
                </div>
              </div>
              <div>
                <input type="number" min="1" className="input text-sm py-1.5 w-1/4" placeholder="Initial Stock" value={newProductForm.stock_quantity} onChange={e => setNewProductForm(f => ({ ...f, stock_quantity: e.target.value }))} />
              </div>
            </div>
          )}
        </div>

        {/* Cart Table */}
        <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl bg-white shadow-sm relative z-0">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10 shadow-sm">
              <tr>
                <th className="p-3 text-xs font-bold text-slate-600 uppercase">Product</th>
                <th className="p-3 text-xs font-bold text-slate-600 uppercase text-center w-24">Qty</th>
                <th className="p-3 text-xs font-bold text-slate-600 uppercase text-right w-24">Price</th>
                <th className="p-3 text-xs font-bold text-slate-600 uppercase text-right w-24">Total</th>
                <th className="p-3 text-xs font-bold text-slate-600 uppercase text-center w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cart.length === 0 ? (
                <tr>
                  <td colSpan="5">
                    <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                      <span className="text-4xl mb-3">🛒</span>
                      <p className="text-sm font-medium text-slate-500">Cart is empty</p>
                      <p className="text-xs mt-1">Search and click products to add them to the cart.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                cart.map(item => (
                  <tr key={item.product_id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3">
                      <p className="text-sm font-bold text-slate-900">{item.name} {item.is_new && <span className="text-[10px] bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded ml-1">NEW</span>}</p>
                      <p className="text-xs text-slate-500">Stock: {item.max_stock}</p>
                    </td>
                    <td className="p-3 text-center">
                      <input 
                        type="number" 
                        min="1" 
                        max={item.max_stock}
                        value={item.quantity} 
                        onChange={(e) => updateCartQuantity(item.product_id, parseInt(e.target.value) || 1)}
                        className="input text-center font-bold text-slate-900 p-1 w-16 mx-auto border-slate-300 focus:border-primary-500 bg-white shadow-sm"
                      />
                    </td>
                    <td className="p-3 text-right text-sm font-semibold text-slate-700">₹{item.sell_price}</td>
                    <td className="p-3 text-right text-sm font-black text-primary-700">₹{(item.sell_price * item.quantity).toLocaleString()}</td>
                    <td className="p-3 text-center">
                      <button onClick={() => removeFromCart(item.product_id)} className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-red-50">
                        ❌
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Checkout Footer */}
        <div className="pt-5 mt-4 border-t-2 border-dashed border-slate-200 shrink-0">
          <div className="flex justify-between items-end mb-4">
            <span className="text-slate-500 font-bold uppercase tracking-wider text-sm">Grand Total</span>
            <span className="text-4xl font-black text-slate-900 tracking-tight">₹{cartTotal.toLocaleString()}</span>
          </div>
          <button 
            onClick={handleSubmit} 
            disabled={submitting || cart.length === 0} 
            className="btn-primary w-full py-4 text-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed transform transition-transform active:scale-[0.99]"
          >
            {submitting ? 'Processing Cart...' : `Complete Sale (${cart.length} items)`}
          </button>
        </div>
      </div>

      {/* History Area */}
      <div className="card p-0 lg:col-span-1 flex flex-col h-[650px] overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-800">Recent Sales</h3>
          <div className="text-xs font-bold text-green-700 bg-green-100 px-2 py-1 rounded-md border border-green-200">
            Rev: ₹{stats?.revenue?.toLocaleString() || 0}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/30">
          {loading ? (
            <div className="flex justify-center mt-10"><span className="spinner" /></div>
          ) : history.length === 0 ? (
             <div className="text-center text-sm text-slate-500 mt-10 font-medium">No recent sales</div>
          ) : (
            <div className="space-y-3">
              {history.map(s => (
                <div key={s.id} className="bg-white border border-slate-200 p-3 rounded-xl shadow-sm">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-slate-900 text-sm truncate pr-2">{s.product_name}</span>
                    <span className="font-black text-green-600 text-sm whitespace-nowrap">₹{s.total_amount}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-500 font-medium">
                    <span>Qty: {s.quantity}</span>
                    <span>{new Date(s.sale_date).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                </div>
              ))}
            </div>
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
      setActiveTab('Analytics');
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
      .catch(() => {})
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
