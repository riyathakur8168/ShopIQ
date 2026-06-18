import { useState, useEffect } from 'react';
import { getProducts, addSale, getSalesAnalytics } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function Sales() {
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
      load(); // refresh stock and history
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to record sale', 'error');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="page-title">Sales Management</h2>
        <p className="page-subtitle">Record new sales and view today's performance</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "Today's Revenue", value: `₹${stats?.revenue?.toLocaleString() || 0}`, color: 'text-green-600' },
          { label: "Items Sold Today", value: stats?.count || 0, color: 'text-primary-600' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{s.label}</p>
            <h3 className={`text-2xl font-black ${s.color}`}>{s.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

            <div>
              <label className="input-label">Note (Optional)</label>
              <input className="input" placeholder="e.g. UPI payment, discount given" value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
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
            <h3 className="section-title">Recent Transactions</h3>
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
                    <th className="table-header hidden sm:table-cell">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map(s => (
                    <tr key={s.id} className="table-row">
                      <td className="table-cell text-slate-500 text-xs">{new Date(s.sale_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                      <td className="table-cell font-medium text-slate-900">{s.product_name}</td>
                      <td className="table-cell font-semibold text-slate-600">{s.quantity}</td>
                      <td className="table-cell font-bold text-green-600">₹{s.total_price}</td>
                      <td className="table-cell text-slate-500 text-xs hidden sm:table-cell">{s.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
