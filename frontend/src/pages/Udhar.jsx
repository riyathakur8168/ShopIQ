import { useState, useEffect } from 'react';
import { getCustomers, addCustomer, deleteCustomer, getCustomer, addCredit, recordPayment } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function Udhar() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', address: '' });
  const [txnForm, setTxnForm] = useState({ amount: '', note: '', date: new Date().toISOString().split('T')[0] });
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

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    try {
      await addCustomer(form);
      toast('Customer added!', 'success');
      setShowAddForm(false); setForm({ name: '', phone: '', address: '' }); load();
    } catch { toast('Failed to add customer', 'error'); }
  };

  const handleCredit = async (e) => {
    e.preventDefault();
    try {
      const res = await addCredit(selectedCustomer.id, txnForm);
      toast('Credit added!', 'success');
      setSelectedCustomer(res.data.customer);
      setTxnForm({ amount: '', note: '', date: new Date().toISOString().split('T')[0] });
      loadHistory(selectedCustomer.id); load();
    } catch (err) { toast(err.response?.data?.message || 'Failed', 'error'); }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    try {
      const res = await recordPayment(selectedCustomer.id, txnForm);
      toast('Payment recorded!', 'success');
      setSelectedCustomer(res.data.customer);
      setTxnForm({ amount: '', note: '', date: new Date().toISOString().split('T')[0] });
      loadHistory(selectedCustomer.id); load();
    } catch (err) { toast(err.response?.data?.message || 'Failed', 'error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this customer?')) return;
    try { await deleteCustomer(id); toast('Customer deleted', 'success'); if (selectedCustomer?.id === id) setSelectedCustomer(null); load(); }
    catch { toast('Failed', 'error'); }
  };

  const totalPending = customers.reduce((s, c) => s + Math.max(0, c.balance), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h2 className="page-title">Udhar / Credit</h2><p className="page-subtitle">Track customer credit and payments</p></div>
        <button className="btn-primary shadow-sm" onClick={() => setShowAddForm(!showAddForm)}>+ Add Customer</button>
      </div>

      {/* Stats */}
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

      {/* Add Customer Form */}
      {showAddForm && (
        <div className="card p-6 animate-fade-in border-indigo-100 shadow-md">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Add New Customer</h3>
          <form onSubmit={handleAddCustomer} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className="input-label">Name</label><input required className="input bg-slate-50 border-slate-200" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Customer name" /></div>
            <div><label className="input-label">Phone</label><input className="input bg-slate-50 border-slate-200" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="9876543210" /></div>
            <div><label className="input-label">Address</label><input className="input bg-slate-50 border-slate-200" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Colony, City" /></div>
            <div className="md:col-span-3 flex gap-3 pt-2">
              <button type="submit" className="btn-primary">Save Customer</button>
              <button type="button" onClick={() => setShowAddForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Customer List */}
        <div className="table-container shadow-sm">
          <div className="section-header bg-slate-50">
            <h3 className="section-title">Customers</h3>
            <input className="input max-w-[180px] py-1.5 text-xs border-slate-200 bg-white" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {loading ? <div className="flex items-center justify-center h-40"><span className="spinner" /></div> : (
            <div className="divide-y divide-slate-100">
              {customers.map(c => (
                <div key={c.id} onClick={() => selectCustomer(c)}
                  className={`flex items-center justify-between px-5 py-4 cursor-pointer transition-colors ${selectedCustomer?.id === c.id ? 'bg-primary-50' : 'hover:bg-slate-50 bg-white'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-violet-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
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
              {customers.length === 0 && (
                <div className="flex flex-col items-center justify-center h-40 text-slate-400 bg-white text-sm">
                  <span className="text-4xl mb-2">💳</span>No customers yet
                </div>
              )}
            </div>
          )}
        </div>

        {/* Customer Detail */}
        <div className="card flex flex-col shadow-sm">
          {selectedCustomer ? (
            <>
              <div className="section-header bg-slate-50 rounded-t-2xl">
                <div>
                  <h3 className="section-title text-base">{selectedCustomer.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{selectedCustomer.phone} · {selectedCustomer.address}</p>
                </div>
                <button onClick={() => handleDelete(selectedCustomer.id)} className="btn-ghost text-red-600 hover:text-red-800 text-xs hover:bg-red-50">Delete</button>
              </div>

              {/* Balance Bar */}
              <div className="px-5 py-5 border-b border-slate-200 flex gap-6 bg-white">
                <div><p className="text-xs text-slate-400 font-semibold mb-1">Total Credit</p><p className="text-xl font-black text-red-600">₹{selectedCustomer.total_credit}</p></div>
                <div><p className="text-xs text-slate-400 font-semibold mb-1">Total Paid</p><p className="text-xl font-black text-green-600">₹{selectedCustomer.total_paid}</p></div>
                <div><p className="text-xs text-slate-400 font-semibold mb-1">Balance</p><p className={`text-xl font-black ${selectedCustomer.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>₹{selectedCustomer.balance}</p></div>
              </div>

              {/* Quick Actions */}
              <div className="px-5 py-5 border-b border-slate-200 bg-slate-50">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-2 font-bold tracking-wide">ADD CREDIT</p>
                    <form onSubmit={handleCredit} className="flex gap-2">
                      <input className="input flex-1 py-2 text-sm border-slate-300" type="number" step="0.01" required value={txnForm.amount} placeholder="₹ Amount"
                        onChange={e => setTxnForm(f => ({ ...f, amount: e.target.value }))} />
                      <button type="submit" className="btn bg-red-600 text-white hover:bg-red-700 text-sm font-bold shadow-sm">Add</button>
                    </form>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-2 font-bold tracking-wide">RECORD PAYMENT</p>
                    <form onSubmit={handlePayment} className="flex gap-2">
                      <input className="input flex-1 py-2 text-sm border-slate-300" type="number" step="0.01" required value={txnForm.amount} placeholder="₹ Amount"
                        onChange={e => setTxnForm(f => ({ ...f, amount: e.target.value }))} />
                      <button type="submit" className="btn bg-green-600 text-white hover:bg-green-700 text-sm font-bold shadow-sm">Pay</button>
                    </form>
                  </div>
                </div>
              </div>

              {/* Transaction History */}
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
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-white rounded-2xl">
              <span className="text-5xl mb-4 opacity-50">👈</span>
              <p className="text-sm font-medium">Select a customer to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
