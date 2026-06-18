import { useState, useEffect } from 'react';
import { getProducts, addProduct, updateProduct, deleteProduct } from '../services/api';
import { useToast } from '../context/ToastContext';

const EMPTY_FORM = { name: '', category: '', buy_price: '', sell_price: '', stock_quantity: '', low_stock_threshold: 10 };

export default function Inventory() {
  const [activeTab, setActiveTab] = useState('Products');
  
  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      <div>
        <h2 className="page-title">Inventory</h2>
        <p className="page-subtitle">Manage products, stock levels, and automated imports</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        {['Products', 'Stock', 'OCR Import'].map(tab => (
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
        {activeTab === 'Products' && <ProductsTab />}
        {activeTab === 'Stock' && <StockTab />}
        {activeTab === 'OCR Import' && <OCRImportTab />}
      </div>
    </div>
  );
}

function ProductsTab() {
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const res = await getProducts();
      setProducts(res.data);
    } catch { toast('Failed to load products', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    let list = products;
    if (search) list = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()));
    if (catFilter !== 'All') list = list.filter(p => p.category === catFilter);
    setFiltered(list);
  }, [products, search, catFilter]);

  const categories = ['All', ...new Set(products.map(p => p.category).filter(Boolean))];

  const openEdit = (p) => {
    setEditProduct(p);
    setForm({ name: p.name, category: p.category, buy_price: p.buy_price, sell_price: p.sell_price, stock_quantity: p.stock_quantity, low_stock_threshold: p.low_stock_threshold });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editProduct) {
        await updateProduct(editProduct.id, form);
        toast('Product updated!', 'success');
      } else {
        await addProduct(form);
        toast('Product added!', 'success');
      }
      setShowForm(false); setEditProduct(null); setForm(EMPTY_FORM);
      load();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to save product', 'error');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return;
    try { await deleteProduct(id); toast('Product deleted', 'success'); load(); }
    catch { toast('Failed to delete', 'error'); }
  };

  const stockStatus = (p) => {
    if (p.stock_quantity === 0) return { label: 'Out of Stock', cls: 'badge-danger' };
    if (p.is_low_stock) return { label: 'Low Stock', cls: 'badge-warning' };
    return { label: 'In Stock', cls: 'badge-success' };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Product Catalog</h3>
        <button className="btn-primary shadow-sm" onClick={() => { setShowForm(!showForm); setEditProduct(null); setForm(EMPTY_FORM); }}>
          {showForm ? 'Close Form' : '+ Add Product'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card p-6 animate-fade-in shadow-md border-primary-100 bg-primary-50/30">
          <h3 className="text-sm font-bold text-slate-900 mb-5">{editProduct ? 'Edit Product' : 'Add New Product'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Product Name', key: 'name', type: 'text', placeholder: 'e.g. Amul Milk', span: 2 },
              { label: 'Category', key: 'category', type: 'text', placeholder: 'e.g. Dairy' },
              { label: 'Stock Qty', key: 'stock_quantity', type: 'number', placeholder: '50' },
              { label: 'Low Stock Alert At', key: 'low_stock_threshold', type: 'number', placeholder: '10' },
              { label: 'Buy Price (₹)', key: 'buy_price', type: 'number', placeholder: '52' },
              { label: 'Sell Price (₹)', key: 'sell_price', type: 'number', placeholder: '60' },
            ].map(f => (
              <div key={f.key} className={f.span === 2 ? 'md:col-span-2' : ''}>
                <label className="input-label">{f.label}</label>
                <input required={!['low_stock_threshold'].includes(f.key)} type={f.type} value={form[f.key]} placeholder={f.placeholder}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} className="input bg-white border-slate-200" />
              </div>
            ))}
            {form.buy_price && form.sell_price && (
              <div className="md:col-span-3 text-xs text-green-600 font-bold bg-green-50 p-2 rounded-lg border border-green-100">
                Profit Margin: {((form.sell_price - form.buy_price) / form.buy_price * 100).toFixed(1)}%
              </div>
            )}
            <div className="md:col-span-3 flex gap-3 pt-2">
              <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Saving...' : editProduct ? 'Update Product' : 'Add Product'}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditProduct(null); }} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <input className="input max-w-xs border-slate-200" placeholder="🔍 Search products..." value={search} onChange={e => setSearch(e.target.value)} />
        <div className="flex gap-2">
          {categories.map(c => (
            <button key={c} onClick={() => setCatFilter(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${catFilter === c ? 'bg-primary-600 text-white shadow-sm' : 'bg-slate-50 text-slate-500 hover:text-slate-900 border border-slate-200'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        {loading ? (
          <div className="flex items-center justify-center h-40"><span className="spinner" /></div>
        ) : (
          <table className="w-full">
            <thead>
              <tr>{['Product', 'Category', 'Stock', 'Buy ₹', 'Sell ₹', 'Margin', 'Status', ''].map(h => <th key={h} className="table-header">{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const st = stockStatus(p);
                return (
                  <tr key={p.id} className="table-row">
                    <td className="table-cell font-bold text-slate-900">{p.name}</td>
                    <td className="table-cell"><span className="badge badge-primary">{p.category}</span></td>
                    <td className="table-cell font-black text-slate-800">{p.stock_quantity}</td>
                    <td className="table-cell text-slate-500">₹{p.buy_price}</td>
                    <td className="table-cell text-slate-500">₹{p.sell_price}</td>
                    <td className="table-cell text-green-600 font-bold">{p.profit_margin}%</td>
                    <td className="table-cell"><span className={st.cls}>{st.label}</span></td>
                    <td className="table-cell">
                      <div className="flex gap-3">
                        <button onClick={() => openEdit(p)} className="text-xs text-primary-600 hover:text-primary-800 font-bold">Edit</button>
                        <button onClick={() => handleDelete(p.id)} className="text-xs text-red-600 hover:text-red-800 font-bold">Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StockTab() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProducts().then(res => {
      setProducts(res.data.filter(p => p.is_low_stock || p.stock_quantity === 0));
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex justify-center p-12"><span className="spinner"></span></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <div className="section-header">
            <h3 className="section-title">Critical Shortages</h3>
          </div>
          <div className="p-4 space-y-3">
            {products.filter(p => p.stock_quantity === 0).length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No out-of-stock items.</p>
            ) : products.filter(p => p.stock_quantity === 0).map(p => (
              <div key={p.id} className="flex justify-between items-center p-3 border border-red-200 bg-red-50 rounded-lg">
                <span className="font-semibold text-slate-900">{p.name}</span>
                <span className="badge badge-danger">Out of Stock</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="section-header">
            <h3 className="section-title">Reorder Suggestions</h3>
          </div>
          <div className="p-4 space-y-3">
            {products.filter(p => p.is_low_stock && p.stock_quantity > 0).length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">Stock levels are healthy.</p>
            ) : products.filter(p => p.is_low_stock && p.stock_quantity > 0).map(p => (
              <div key={p.id} className="flex justify-between items-center p-3 border border-orange-200 bg-orange-50 rounded-lg">
                <div>
                  <span className="font-semibold text-slate-900 block">{p.name}</span>
                  <span className="text-xs text-orange-700">Only {p.stock_quantity} left</span>
                </div>
                <button className="text-xs font-semibold bg-white border border-orange-200 text-orange-700 px-3 py-1.5 rounded-lg hover:bg-orange-100 transition-colors">
                  Reorder
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function OCRImportTab() {
  return (
    <div className="card p-8 text-center animate-fade-in max-w-2xl mx-auto mt-8">
      <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-2">Automated Data Entry (OCR)</h3>
      <p className="text-sm text-slate-500 mb-6">Upload a photo of a vendor bill or stock register, and ShopIQ will extract the products and quantities automatically.</p>
      
      <div className="border-2 border-dashed border-slate-300 rounded-2xl p-12 hover:border-primary-500 hover:bg-primary-50 transition-colors cursor-pointer group">
        <p className="text-sm font-semibold text-slate-600 group-hover:text-primary-700">Click to capture or upload image</p>
        <p className="text-xs text-slate-400 mt-2">Supports JPG, PNG (Max 10MB)</p>
      </div>
    </div>
  );
}
