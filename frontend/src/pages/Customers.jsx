import { useState, useEffect } from 'react';
import { getCustomers, addCustomer, deleteCustomer, getCustomer, addCredit, recordPayment, getProducts, createInvoice, getInvoices } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function Customers() {
  const [activeTab, setActiveTab] = useState('Directory');
  
  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      <div>
        <h2 className="page-title">Customers & Billing</h2>
        <p className="page-subtitle">Manage customer directory, udhar (credit), and generate invoices</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        {['Directory', 'Credit (Udhar)', 'Billing'].map(tab => (
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
        {activeTab === 'Directory' && <DirectoryTab />}
        {activeTab === 'Credit (Udhar)' && <CreditTab />}
        {activeTab === 'Billing' && <BillingTab />}
      </div>
    </div>
  );
}

function DirectoryTab() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', address: '' });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try { 
      const res = await getCustomers({ search, page, per_page: 20 });
      if (res.data.items) {
        setCustomers(res.data.items);
        setTotalPages(res.data.pages);
      } else {
        setCustomers(res.data);
      }
    }
    catch { toast('Failed to load customers', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { 
    const timer = setTimeout(() => { load(); }, 300);
    return () => clearTimeout(timer);
  }, [search, page]);

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    try {
      await addCustomer(form);
      toast('Customer added!', 'success');
      setShowAddForm(false); setForm({ name: '', phone: '', address: '' }); load();
    } catch { toast('Failed to add customer', 'error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this customer?')) return;
    try { await deleteCustomer(id); toast('Customer deleted', 'success'); load(); }
    catch { toast('Failed', 'error'); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Customer Directory</h3>
        <button className="btn-primary shadow-sm" onClick={() => setShowAddForm(!showAddForm)}>+ Add Customer</button>
      </div>

      {showAddForm && (
        <div className="card p-6 animate-fade-in border-primary-100 shadow-md bg-primary-50/30">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Add New Customer</h3>
          <form onSubmit={handleAddCustomer} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="input-label">Name</label><input required className="input bg-white border-slate-200" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Customer name" /></div>
            <div><label className="input-label">Phone</label><input className="input bg-white border-slate-200" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="9876543210" /></div>
            <div><label className="input-label">Address</label><input className="input bg-white border-slate-200" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Colony, City" /></div>
            <div className="md:col-span-3 flex gap-3 pt-2">
              <button type="submit" className="btn-primary">Save Customer</button>
              <button type="button" onClick={() => setShowAddForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="table-container shadow-sm">
        <div className="section-header bg-slate-50 flex justify-between items-center py-2 px-4">
          <h3 className="section-title mb-0">All Customers ({customers.length})</h3>
          <input className="input max-w-[200px] py-1.5 text-xs border-slate-200 bg-white" placeholder="Search customers..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        {loading ? <div className="flex items-center justify-center h-40"><span className="spinner" /></div> : (
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Name</th>
                <th className="table-header">Contact</th>
                <th className="table-header">Status</th>
                <th className="table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id} className="table-row">
                  <td className="table-cell font-bold text-slate-900">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs">{c.name[0].toUpperCase()}</div>
                      {c.name}
                    </div>
                  </td>
                  <td className="table-cell text-slate-600">
                    <div>{c.phone || 'No phone'}</div>
                    <div className="text-xs text-slate-400">{c.address}</div>
                  </td>
                  <td className="table-cell">
                    <span className={c.status === 'pending' ? 'badge badge-warning' : 'badge badge-success'}>
                      {c.status === 'pending' ? 'Has Udhar' : 'Cleared'}
                    </span>
                  </td>
                  <td className="table-cell text-right">
                    <button onClick={() => handleDelete(c.id)} className="text-xs font-bold text-red-600 hover:text-red-800">Delete</button>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr><td colSpan={4} className="text-center text-slate-500 py-8">No customers found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm mt-4">
          <button 
            disabled={page === 1} 
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="btn-secondary disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm font-semibold text-slate-600">Page {page} of {totalPages}</span>
          <button 
            disabled={page === totalPages} 
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            className="btn-secondary disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function CreditTab() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [creditForm, setCreditForm] = useState({ amount: '', note: '', date: new Date().toISOString().split('T')[0] });
  const [paymentForm, setPaymentForm] = useState({ amount: '', note: '', date: new Date().toISOString().split('T')[0] });
  const [search, setSearch] = useState('');
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try { setCustomers((await getCustomers({ search })).data); }
    catch { toast('Failed to load customers', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search]);

  const loadHistory = async (id) => {
    setHistoryLoading(true);
    try { const res = await getCustomer(id); setHistory(res.data.history || []); }
    catch { toast('Failed to load history', 'error'); }
    finally { setHistoryLoading(false); }
  };

  const selectCustomer = (c) => { setSelectedCustomer(c); loadHistory(c.id); };

  const handleCredit = async (e) => {
    e.preventDefault();
    try {
      const res = await addCredit(selectedCustomer.id, creditForm);
      toast('Credit added!', 'success');
      setSelectedCustomer(res.data.customer);
      setCreditForm({ amount: '', note: '', date: new Date().toISOString().split('T')[0] });
      loadHistory(selectedCustomer.id); load();
    } catch (err) { toast(err.response?.data?.message || 'Failed', 'error'); }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    try {
      const res = await recordPayment(selectedCustomer.id, paymentForm);
      toast('Payment recorded!', 'success');
      setSelectedCustomer(res.data.customer);
      setPaymentForm({ amount: '', note: '', date: new Date().toISOString().split('T')[0] });
      loadHistory(selectedCustomer.id); load();
    } catch (err) { toast(err.response?.data?.message || 'Failed', 'error'); }
  };

  const totalPending = customers.reduce((s, c) => s + Math.max(0, c.balance), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Customers', value: customers.length, color: 'text-primary-600' },
          { label: 'Total Pending',   value: `₹${totalPending.toLocaleString()}`, color: 'text-red-600' },
          { label: 'Cleared Accounts', value: customers.filter(c => c.balance <= 0).length, color: 'text-green-600' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{s.label}</p>
            <h3 className={`text-2xl font-black ${s.color}`}>{s.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="table-container shadow-sm">
          <div className="section-header bg-slate-50">
            <h3 className="section-title">Select Customer</h3>
            <input className="input max-w-[180px] py-1.5 text-xs border-slate-200 bg-white" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {loading ? <div className="flex items-center justify-center h-40"><span className="spinner" /></div> : (
            <div className="divide-y divide-slate-100">
              {customers.map(c => (
                <div key={c.id} onClick={() => selectCustomer(c)}
                  className={`flex items-center justify-between px-5 py-4 cursor-pointer transition-colors ${selectedCustomer?.id === c.id ? 'bg-primary-50' : 'hover:bg-slate-50 bg-white'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm shadow-sm">
                      {c.name[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{c.name}</p>
                      <p className="text-xs text-slate-500">{c.phone || 'No phone'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-black ${c.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>₹{c.balance}</p>
                    <span className={c.status === 'pending' ? 'badge-danger text-[10px]' : 'badge-success text-[10px]'}>
                      {c.status === 'pending' ? 'Pending' : 'Cleared'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card flex flex-col shadow-sm h-[600px]">
          {selectedCustomer ? (
            <>
              <div className="section-header bg-slate-50 rounded-t-2xl">
                <div>
                  <h3 className="section-title text-base">{selectedCustomer.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{selectedCustomer.phone} · {selectedCustomer.address}</p>
                </div>
              </div>

              <div className="px-5 py-5 border-b border-slate-200 flex gap-6 bg-white">
                <div><p className="text-xs text-slate-400 font-semibold mb-1">Total Credit</p><p className="text-xl font-black text-red-600">₹{selectedCustomer.total_credit}</p></div>
                <div><p className="text-xs text-slate-400 font-semibold mb-1">Total Paid</p><p className="text-xl font-black text-green-600">₹{selectedCustomer.total_paid}</p></div>
                <div><p className="text-xs text-slate-400 font-semibold mb-1">Balance</p><p className={`text-xl font-black ${selectedCustomer.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>₹{selectedCustomer.balance}</p></div>
              </div>

              <div className="px-5 py-5 border-b border-slate-200 bg-slate-50 flex-shrink-0">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-2 font-bold tracking-wide">ADD CREDIT</p>
                    <form onSubmit={handleCredit} className="flex gap-2">
                      <input className="input flex-1 py-2 text-sm border-slate-300 bg-white" type="number" step="0.01" required value={creditForm.amount} placeholder="₹ Amount"
                        onChange={e => setCreditForm(f => ({ ...f, amount: e.target.value }))} />
                      <button type="submit" className="btn bg-red-600 text-white hover:bg-red-700 text-sm font-bold shadow-sm">Add</button>
                    </form>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-2 font-bold tracking-wide">RECORD PAYMENT</p>
                    <form onSubmit={handlePayment} className="flex gap-2">
                      <input className="input flex-1 py-2 text-sm border-slate-300 bg-white" type="number" step="0.01" required value={paymentForm.amount} placeholder="₹ Amount"
                        onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))} />
                      <button type="submit" className="btn bg-green-600 text-white hover:bg-green-700 text-sm font-bold shadow-sm">Pay</button>
                    </form>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto bg-white rounded-b-2xl">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-5 py-4 border-b border-slate-100">Transaction History</p>
                {historyLoading ? <div className="flex justify-center py-8"><span className="spinner" /></div> : (
                  <div className="divide-y divide-slate-100">
                    {history.map(r => (
                      <div key={r.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black ${r.record_type === 'credit' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                            {r.record_type === 'credit' ? '−' : '+'}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800 capitalize">{r.record_type}</p>
                            <p className="text-[11px] text-slate-500 font-medium">{r.date} · {r.note || 'No note'}</p>
                          </div>
                        </div>
                        <p className={`text-base font-black ${r.record_type === 'credit' ? 'text-red-600' : 'text-green-600'}`}>₹{r.amount}</p>
                      </div>
                    ))}
                    {history.length === 0 && <p className="text-center text-slate-400 text-sm py-12">No transactions yet</p>}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-2xl">
              <span className="text-5xl mb-4 opacity-50">👈</span>
              <p className="text-sm font-medium">Select a customer to view Udhar details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BillingTab() {
  const [products, setProducts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [customer, setCustomer] = useState('');
  const [items, setItems] = useState([{ product_id: '', name: '', qty: 1, price: 0 }]);
  const [generated, setGenerated] = useState(null);
  const [tab, setTab] = useState('create');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    getProducts().then(r => setProducts(r.data)).catch(err => console.error(err));
    getInvoices().then(r => setInvoices(r.data)).catch(err => console.error(err));
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
        <h3 className="text-sm font-semibold text-slate-900">Billing</h3>
        <div className="flex gap-2 border border-slate-200 rounded-lg p-1 bg-slate-50">
          {['create', 'history'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors capitalize ${tab === t ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>{t === 'create' ? 'Create Invoice' : 'Invoice History'}</button>
          ))}
        </div>
      </div>

      {tab === 'create' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-5">Invoice Builder</h3>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="input-label">Customer Name</label>
                <input required className="input bg-white border-slate-200" value={customer} onChange={e => setCustomer(e.target.value)} placeholder="Enter customer name" />
              </div>
              <div>
                <label className="input-label">Items</label>
                <div className="space-y-2">
                  {items.map((item, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <select className="input flex-1 py-2 text-xs bg-white border-slate-200" value={item.product_id}
                        onChange={e => updateItem(i, 'product_id', e.target.value)}>
                        <option value="">Select or type product...</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      {!item.product_id && (
                        <input className="input flex-1 py-2 text-xs bg-white border-slate-200" placeholder="Product name" value={item.name}
                          onChange={e => updateItem(i, 'name', e.target.value)} />
                      )}
                      <input className="input w-14 py-2 text-xs text-center bg-white border-slate-200" type="number" min="1" value={item.qty}
                        onChange={e => updateItem(i, 'qty', Number(e.target.value))} />
                      <input className="input w-20 py-2 text-xs text-center bg-white border-slate-200" type="number" value={item.price}
                        onChange={e => updateItem(i, 'price', Number(e.target.value))} placeholder="₹" />
                      {items.length > 1 && (
                        <button type="button" onClick={() => removeItem(i)} className="text-red-500 hover:text-red-600 text-lg font-black px-1">×</button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addItem} className="mt-2 text-xs text-primary-600 hover:text-primary-800 font-bold">+ Add Item</button>
              </div>
              <div className="bg-primary-50 rounded-xl px-4 py-4 flex justify-between items-center border border-primary-100 mt-6">
                <span className="text-sm font-semibold text-primary-800">Total Amount</span>
                <span className="text-2xl font-black text-primary-900">₹{total.toLocaleString()}</span>
              </div>
              <button type="submit" disabled={submitting} className="btn-primary w-full py-3 mt-4 disabled:opacity-60 shadow-md">
                {submitting ? 'Generating...' : 'Generate Invoice'}
              </button>
            </form>
          </div>

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
                  <span>Total</span><span className="text-primary-600">₹{generated.total_amount.toLocaleString()}</span>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-5xl mb-4 opacity-50">🧾</span>
                <p className="text-sm font-medium text-center">Fill in the invoice builder and click<br />"Generate Invoice" to preview it here.</p>
              </div>
            )}
            {generated && (
              <button onClick={() => window.print()} className="btn-secondary mt-4 w-full shadow-sm bg-white">🖨️ Print Invoice</button>
            )}
          </div>
        </div>
      ) : (
        <div className="table-container shadow-sm">
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
