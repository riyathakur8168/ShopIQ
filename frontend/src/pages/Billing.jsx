import { useState, useEffect } from 'react';
import { getProducts, createInvoice, getInvoices } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function Billing() {
  const [products, setProducts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [customer, setCustomer] = useState('');
  const [items, setItems] = useState([{ product_id: '', name: '', qty: 1, price: 0 }]);
  const [generated, setGenerated] = useState(null);
  const [tab, setTab] = useState('create');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    getProducts().then(r => setProducts(r.data)).catch(() => {});
    getInvoices().then(r => setInvoices(r.data)).catch(() => {});
  }, []);

  const addItem = () => setItems(prev => [...prev, { product_id: '', name: '', qty: 1, price: 0 }]);
  const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));

  const updateItem = (i, field, value) => {
    setItems(prev => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      if (field === 'product_id') {
        const p = products.find(p => p.id === Number(value));
        if (p) { next[i].name = p.name; next[i].price = p.sell_price; }
      }
      return next;
    });
  };

  const total = items.reduce((s, it) => s + it.qty * it.price, 0);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        customer_name: customer,
        items: items.map(it => ({ name: it.name || it.product_id, qty: it.qty, price: it.price })),
      };
      const res = await createInvoice(payload);
      setGenerated(res.data.invoice);
      toast('Invoice created!', 'success');
      getInvoices().then(r => setInvoices(r.data));
    } catch (err) { toast(err.response?.data?.message || 'Failed', 'error'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h2 className="page-title">Billing</h2><p className="page-subtitle">Create and manage customer invoices</p></div>
        <div className="flex gap-2">
          {['create', 'history'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`btn ${tab === t ? 'btn-primary shadow-sm' : 'btn-secondary'} capitalize`}>{t === 'create' ? 'Create Invoice' : 'Invoice History'}</button>
          ))}
        </div>
      </div>

      {tab === 'create' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Builder */}
          <div className="card p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-5">Invoice Builder</h3>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="input-label">Customer Name</label>
                <input required className="input bg-slate-50 border-slate-200" value={customer} onChange={e => setCustomer(e.target.value)} placeholder="Enter customer name" />
              </div>
              <div>
                <label className="input-label">Items</label>
                <div className="space-y-2">
                  {items.map((item, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <select className="input flex-1 py-2 text-xs bg-slate-50 border-slate-200" value={item.product_id}
                        onChange={e => updateItem(i, 'product_id', e.target.value)}>
                        <option value="">Select or type product...</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      {!item.product_id && (
                        <input className="input flex-1 py-2 text-xs bg-slate-50 border-slate-200" placeholder="Product name" value={item.name}
                          onChange={e => updateItem(i, 'name', e.target.value)} />
                      )}
                      <input className="input w-14 py-2 text-xs text-center bg-slate-50 border-slate-200" type="number" min="1" value={item.qty}
                        onChange={e => updateItem(i, 'qty', Number(e.target.value))} />
                      <input className="input w-20 py-2 text-xs text-center bg-slate-50 border-slate-200" type="number" value={item.price}
                        onChange={e => updateItem(i, 'price', Number(e.target.value))} placeholder="₹" />
                      {items.length > 1 && (
                        <button type="button" onClick={() => removeItem(i)} className="text-red-500 hover:text-red-600 text-lg font-black px-1">×</button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addItem} className="mt-2 text-xs text-primary-600 hover:text-primary-800 font-bold">+ Add Item</button>
              </div>
              <div className="bg-slate-50 rounded-xl px-4 py-4 flex justify-between items-center border border-slate-200">
                <span className="text-sm font-semibold text-slate-500">Total Amount</span>
                <span className="text-xl font-black text-slate-900">₹{total.toLocaleString()}</span>
              </div>
              <button type="submit" disabled={submitting} className="btn-primary w-full py-3 disabled:opacity-60 shadow-md">
                {submitting ? 'Generating...' : 'Generate Invoice'}
              </button>
            </form>
          </div>

          {/* Preview */}
          <div className="card p-6 flex flex-col shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-5">Invoice Preview</h3>
            {generated ? (
              <div id="invoice-print" className="flex-1 bg-white text-gray-900 rounded-xl p-6 border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h4 className="text-2xl font-black text-gray-900">ShopIQ</h4>
                    <p className="text-xs text-gray-500">Your Trusted Shop</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900">{generated.invoice_number}</p>
                    <p className="text-xs text-gray-500">{generated.invoice_date}</p>
                  </div>
                </div>
                <div className="mb-6">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Bill To</p>
                  <p className="font-bold text-gray-900">{generated.customer_name}</p>
                </div>
                <table className="w-full text-sm mb-6">
                  <thead><tr className="border-b-2 border-gray-200">
                    <th className="text-left py-2 text-gray-500 font-bold">Item</th>
                    <th className="text-center py-2 text-gray-500 font-bold">Qty</th>
                    <th className="text-right py-2 text-gray-500 font-bold">Amount</th>
                  </tr></thead>
                  <tbody>
                    {generated.items.map((it, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-2.5 font-medium">{it.name}</td>
                        <td className="py-2.5 text-center text-gray-600">{it.qty}</td>
                        <td className="py-2.5 text-right font-bold">₹{(it.qty * it.price).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex justify-between font-black text-lg border-t-2 border-gray-900 pt-3">
                  <span>Total</span><span className="text-indigo-600">₹{generated.total_amount.toLocaleString()}</span>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-5xl mb-4 opacity-50">🧾</span>
                <p className="text-sm font-medium text-center">Fill in the invoice builder and click<br />"Generate Invoice" to preview it here.</p>
              </div>
            )}
            {generated && (
              <button onClick={() => window.print()} className="btn-secondary mt-4 w-full shadow-sm bg-slate-100">🖨️ Print Invoice</button>
            )}
          </div>
        </div>
      ) : (
        <div className="table-container shadow-sm">
          <div className="section-header bg-slate-50"><h3 className="section-title">All Invoices ({invoices.length})</h3></div>
          <table className="w-full">
            <thead><tr>{['Invoice #', 'Customer', 'Items', 'Total', 'Date'].map(h => <th key={h} className="table-header">{h}</th>)}</tr></thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} className="table-row">
                  <td className="table-cell font-mono text-primary-600 font-bold">{inv.invoice_number}</td>
                  <td className="table-cell font-bold text-slate-900">{inv.customer_name}</td>
                  <td className="table-cell text-slate-500">{inv.items?.length || 0} items</td>
                  <td className="table-cell font-black text-green-600">₹{inv.total_amount.toLocaleString()}</td>
                  <td className="table-cell text-slate-400 font-medium">{inv.invoice_date}</td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr><td colSpan={5} className="table-cell text-center text-slate-400 py-12 font-medium">No invoices yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
