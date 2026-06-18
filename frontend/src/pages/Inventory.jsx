import { useState, useEffect } from 'react';
import { getProducts, addProduct, updateProduct, deleteProduct } from '../services/api';
import { useToast } from '../context/ToastContext';

const EMPTY_FORM = { name: '', category: '', buy_price: '', sell_price: '', stock_quantity: '', low_stock_threshold: 10 };

export default function Inventory() {
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
  const lowStockItems = products.filter(p => p.is_low_stock);

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
        <div>
          <h2 className="page-title">Inventory</h2>
          <p className="page-subtitle">Manage products, stock levels, and pricing</p>
        </div>
        <button className="btn-primary shadow-sm" onClick={() => { setShowForm(!showForm); setEditProduct(null); setForm(EMPTY_FORM); }}>+ Add Product</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Products',   value: products.length,        color: 'text-primary-600' },
          { label: 'Low Stock',        value: lowStockItems.length,   color: 'text-orange-600' },
          { label: 'Out of Stock',     value: products.filter(p => p.stock_quantity === 0).length, color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{s.label}</p>
            <h3 className={`text-2xl font-black ${s.color}`}>{s.value}</h3>
          </div>
        ))}
      </div>

      {/* Low stock alert */}
      {lowStockItems.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-orange-800 mb-2">⚠ Low Stock Alert</p>
          <div className="flex flex-wrap gap-2">
            {lowStockItems.map(p => (
              <span key={p.id} className="badge-warning bg-orange-100">{p.name} — {p.stock_quantity} left</span>
            ))}
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="card p-6 animate-fade-in shadow-md border-indigo-100">
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
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} className="input bg-slate-50 border-slate-200" />
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
        <div className="section-header">
          <h3 className="section-title">Products ({filtered.length})</h3>
        </div>
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
