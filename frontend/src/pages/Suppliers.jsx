import { useState, useEffect } from 'react';
import { 
  getSuppliers, 
  addSupplier, 
  updateSupplier, 
  deleteSupplier, 
  getSupplier, 
  addSupplierPurchase, 
  recordSupplierPayment, 
  getProducts 
} from '../services/api';
import { useToast } from '../context/ToastContext';

export default function Suppliers() {
  const [activeTab, setActiveTab] = useState('Directory');
  
  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      <div>
        <h2 className="page-title">Supplier (Vendor) Management</h2>
        <p className="page-subtitle">Manage wholesale distributors, record purchase bills, track outstanding payables, and automatically update inventory stock.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6">
        {['Directory', 'Purchase History', 'Payments'].map(tab => (
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
        {activeTab === 'Purchase History' && <PurchaseHistoryTab />}
        {activeTab === 'Payments' && <PaymentsTab />}
      </div>
    </div>
  );
}

// ─── DIRECTORY TAB ────────────────────────────────────────────────────────────
function DirectoryTab() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  const [form, setForm] = useState({
    id: '', name: '', business_name: '', contact_person: '', phone: '', email: '',
    gst_number: '', address: '', city: '', state: '', pincode: '',
    product_category: '', notes: '', status: 'Active'
  });
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '', 'Active', 'Inactive'
  const [sortBy, setSortBy] = useState('name'); // 'name', 'balance'
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try { 
      const res = await getSuppliers({ search, status: statusFilter });
      setSuppliers(res.data);
    }
    catch (e) { toast('Failed to load suppliers', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { 
    const timer = setTimeout(() => { load(); }, 300);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  const loadHistory = async (id) => {
    setHistoryLoading(true);
    try { 
      const res = await getSupplier(id); 
      setHistory(res.data.history || []); 
    }
    catch (e) { toast('Failed to load supplier ledger history', 'error'); }
    finally { setHistoryLoading(false); }
  };

  const selectSupplier = (s) => { 
    setSelectedSupplier(s); 
    loadHistory(s.id); 
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await updateSupplier(form.id, form);
        toast('Supplier updated successfully!', 'success');
      } else {
        await addSupplier(form);
        toast('Supplier added successfully!', 'success');
      }
      setShowAddForm(false);
      setIsEditing(false);
      resetForm();
      load();
      if (selectedSupplier && selectedSupplier.id === form.id) {
        const res = await getSupplier(form.id);
        setSelectedSupplier(res.data);
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to save supplier', 'error');
    }
  };

  const handleEditClick = (s) => {
    setForm(s);
    setIsEditing(true);
    setShowAddForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this supplier and all their ledger history?')) return;
    try { 
      await deleteSupplier(id); 
      toast('Supplier deleted successfully', 'success'); 
      if (selectedSupplier?.id === id) setSelectedSupplier(null);
      load(); 
    }
    catch (e) { toast('Failed to delete supplier', 'error'); }
  };

  const resetForm = () => {
    setForm({
      id: '', name: '', business_name: '', contact_person: '', phone: '', email: '',
      gst_number: '', address: '', city: '', state: '', pincode: '',
      product_category: '', notes: '', status: 'Active'
    });
  };

  const sortedSuppliers = [...suppliers].sort((a, b) => {
    if (sortBy === 'balance') return b.balance - a.balance;
    return a.name.localeCompare(b.name);
  });

  const totalOutstanding = suppliers.reduce((s, sup) => s + Math.max(0, sup.balance), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Suppliers', value: suppliers.length, color: 'text-primary-600' },
          { label: 'Total Outstanding Payable', value: `₹${totalOutstanding.toLocaleString()}`, color: 'text-red-600' },
          { label: 'Active Suppliers', value: suppliers.filter(s => s.status === 'Active').length, color: 'text-green-600' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{s.label}</p>
            <h3 className={`text-2xl font-black ${s.color}`}>{s.value}</h3>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Supplier Directory</h3>
        <button 
          className="btn-primary shadow-sm" 
          onClick={() => {
            if (showAddForm) resetForm();
            setIsEditing(false);
            setShowAddForm(!showAddForm);
          }}
        >
          {showAddForm ? 'Hide Form' : '+ Add Supplier'}
        </button>
      </div>

      {showAddForm && (
        <div className="card p-6 animate-fade-in border-primary-100 shadow-md bg-primary-50/30">
          <h3 className="text-sm font-bold text-slate-900 mb-4">{isEditing ? 'Edit Supplier' : 'Add New Supplier'}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="input-label">Supplier Name *</label>
                <input required className="input bg-white border-slate-200" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Vendor / Rep Name" />
              </div>
              <div>
                <label className="input-label">Business Name *</label>
                <input required className="input bg-white border-slate-200" value={form.business_name} onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))} placeholder="ABC Distributors Ltd." />
              </div>
              <div>
                <label className="input-label">Contact Person</label>
                <input className="input bg-white border-slate-200" value={form.contact_person} onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))} placeholder="Optional contact name" />
              </div>
              <div>
                <label className="input-label">Mobile Number *</label>
                <input required className="input bg-white border-slate-200" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="9876543210" />
              </div>
              <div>
                <label className="input-label">Email Address</label>
                <input type="email" className="input bg-white border-slate-200" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="vendor@email.com" />
              </div>
              <div>
                <label className="input-label">GST Number</label>
                <input className="input bg-white border-slate-200" value={form.gst_number} onChange={e => setForm(f => ({ ...f, gst_number: e.target.value }))} placeholder="22AAAAA0000A1Z5" />
              </div>
              <div>
                <label className="input-label">Pincode</label>
                <input className="input bg-white border-slate-200" value={form.pincode} onChange={e => setForm(f => ({ ...f, pincode: e.target.value }))} placeholder="110001" />
              </div>
              <div>
                <label className="input-label">City</label>
                <input className="input bg-white border-slate-200" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="New Delhi" />
              </div>
              <div>
                <label className="input-label">State</label>
                <input className="input bg-white border-slate-200" value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))} placeholder="Delhi" />
              </div>
              <div className="md:col-span-2">
                <label className="input-label">Address</label>
                <input className="input bg-white border-slate-200" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Street, Building details" />
              </div>
              <div>
                <label className="input-label">Product Category</label>
                <input className="input bg-white border-slate-200" value={form.product_category} onChange={e => setForm(f => ({ ...f, product_category: e.target.value }))} placeholder="Dairy, Beverages, Hardware etc." />
              </div>
              <div className="md:col-span-2">
                <label className="input-label">Notes / Instructions</label>
                <input className="input bg-white border-slate-200" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Delivery preferences, credit terms etc." />
              </div>
              <div>
                <label className="input-label">Status</label>
                <select className="input bg-white border-slate-200 py-2.5 font-semibold text-slate-800" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" className="btn-primary">Save Supplier</button>
              <button type="button" onClick={() => { setShowAddForm(false); resetForm(); }} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Directory Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Left Side: Supplier List */}
        <div className="table-container shadow-sm flex flex-col h-[650px] overflow-hidden bg-white">
          <div className="section-header bg-slate-50 flex flex-col md:flex-row gap-3 items-center justify-between py-3 px-4 flex-shrink-0">
            <h3 className="section-title mb-0">Select Supplier</h3>
            <div className="flex gap-2 w-full md:w-auto">
              <input 
                className="input py-1.5 px-3 text-xs border-slate-200 bg-white max-w-[150px]" 
                placeholder="Search..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
              />
              <select 
                className="input py-1.5 px-2 text-xs border-slate-200 bg-white font-semibold"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              <select 
                className="input py-1.5 px-2 text-xs border-slate-200 bg-white font-semibold"
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
              >
                <option value="name">Sort by Name</option>
                <option value="balance">Sort by Outstanding</option>
              </select>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="flex items-center justify-center h-40"><span className="spinner" /></div>
            ) : sortedSuppliers.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No suppliers found.</div>
            ) : (
              sortedSuppliers.map(s => (
                <div 
                  key={s.id} 
                  onClick={() => selectSupplier(s)}
                  className={`flex items-center justify-between px-5 py-4 cursor-pointer transition-colors ${
                    selectedSupplier?.id === s.id ? 'bg-primary-50' : 'hover:bg-slate-50 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm shadow-sm">
                      {s.business_name[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{s.business_name}</p>
                      <p className="text-xs text-slate-500">{s.name} · {s.phone}</p>
                      {s.product_category && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-semibold mt-1 inline-block">
                          {s.product_category}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-black ${s.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ₹{s.balance.toLocaleString()}
                    </p>
                    <span className={`badge text-[9px] ${
                      s.status === 'Active' ? 'badge-success' : 'badge-danger'
                    }`}>
                      {s.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Supplier profile details & ledger timeline */}
        <div className="card flex flex-col shadow-sm h-[650px] overflow-hidden bg-white">
          {selectedSupplier ? (
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="section-header bg-slate-50 py-3.5 px-5 flex-shrink-0 flex items-start justify-between">
                <div>
                  <h3 className="section-title text-base">{selectedSupplier.business_name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    📞 {selectedSupplier.phone} {selectedSupplier.contact_person ? `· Contact: ${selectedSupplier.contact_person}` : ''}
                  </p>
                  {selectedSupplier.gst_number && (
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">GSTIN: {selectedSupplier.gst_number}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEditClick(selectedSupplier)} className="text-xs font-bold text-primary-600 hover:underline">Edit</button>
                  <span className="text-slate-300">|</span>
                  <button onClick={() => handleDelete(selectedSupplier.id)} className="text-xs font-bold text-red-600 hover:underline">Delete</button>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="px-5 py-4 border-b border-slate-200 flex gap-6 bg-white flex-shrink-0">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Total Purchases</p>
                  <p className="text-base font-black text-slate-800">₹{selectedSupplier.total_purchase.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Total Paid</p>
                  <p className="text-base font-black text-green-600">₹{selectedSupplier.total_paid.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Outstanding Payable</p>
                  <p className={`text-base font-black ${selectedSupplier.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ₹{selectedSupplier.balance.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Ledger Timeline */}
              <div className="flex-1 overflow-y-auto bg-white">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-5 py-3 border-b border-slate-100">Ledger Timeline</p>
                {historyLoading ? (
                  <div className="flex justify-center py-8"><span className="spinner" /></div>
                ) : history.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm">No transaction ledger entries recorded yet.</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {history.map(r => (
                      <div key={r.id} className="px-5 py-4 hover:bg-slate-50 transition-colors">
                        <div className="flex items-start gap-3 w-full">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 mt-0.5 ${
                            r.record_type === 'purchase' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                          }`}>
                            {r.record_type === 'purchase' ? '−' : '+'}
                          </div>
                          
                          <div className="w-full">
                            {r.record_type === 'purchase' ? (
                              <div className="w-full">
                                <div className="flex justify-between items-center mb-2">
                                  <p className="text-sm font-bold text-slate-800">
                                    {r.invoice_number ? `Invoice #${r.invoice_number}` : 'Inventory Purchase'}
                                  </p>
                                  <p className="text-[11px] text-slate-500 font-medium">{r.date}</p>
                                </div>

                                {r.products_purchased && (
                                  <div className="mb-3">
                                    <p className="text-xs font-bold text-slate-500 mb-2">Products Purchased</p>
                                    {(() => {
                                      try {
                                        const arr = JSON.parse(r.products_purchased);
                                        if (Array.isArray(arr)) {
                                          return (
                                            <ul className="space-y-4 pl-1 mt-2">
                                              {arr.map((p, idx) => (
                                                <li key={idx} className="flex flex-col gap-1">
                                                  <p className="text-sm font-bold text-slate-800">• {p.name} ×{p.quantity}</p>
                                                  <p className="text-sm text-slate-600">₹{p.unit_cost || p.unit_price} each</p>
                                                  <p className="text-sm font-semibold text-slate-700">Subtotal ₹{(p.total || (p.quantity * (p.unit_cost || p.unit_price))).toLocaleString()}</p>
                                                </li>
                                              ))}
                                            </ul>
                                          );
                                        }
                                      } catch(e) {
                                        return <p className="text-xs text-slate-700 pl-1">• {r.products_purchased}</p>;
                                      }
                                    })()}
                                  </div>
                                )}

                                <div className="flex flex-col gap-3 pt-3 mt-2 border-t border-slate-100">
                                  <div>
                                    <p className="text-xs text-slate-500 font-bold tracking-wide mb-1">Purchase Total</p>
                                    <p className="text-lg font-black text-slate-800">₹{r.amount.toLocaleString()}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-slate-500 font-bold tracking-wide mb-1">Outstanding After Purchase</p>
                                    <p className={`text-lg font-black ${r.running_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>₹{r.running_balance.toLocaleString()}</p>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="w-full">
                                <div className="flex justify-between items-center mb-4">
                                  <p className="text-sm font-bold text-slate-800">Payment Made</p>
                                  <p className="text-[11px] text-slate-500 font-medium">{r.date}</p>
                                </div>
                                <div className="flex flex-col gap-4">
                                  <div>
                                    <p className="text-lg font-black text-green-600">₹{r.amount.toLocaleString()}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-slate-500 font-bold tracking-wide mb-1">Outstanding After Payment</p>
                                    <p className={`text-lg font-black ${r.running_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>₹{r.running_balance.toLocaleString()}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                            {r.note && <p className="mt-2 text-[10px] text-slate-400 italic">Note: {r.note}</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
              <span className="text-4xl mb-2">🏢</span>
              <p className="text-sm font-semibold">Select a supplier from the list to view their ledger and timeline history.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PURCHASE HISTORY TAB ──────────────────────────────────────────────────────
function PurchaseHistoryTab() {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [purchases, setPurchases] = useState([]);
  
  // New Purchase Form state
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [cart, setCart] = useState([]); // Array of { id, name, quantity, unit_cost }
  
  // Current item being added to cart
  const [currentProductId, setCurrentProductId] = useState('');
  const [currentQty, setCurrentQty] = useState('');
  const [currentCost, setCurrentCost] = useState('');

  const { toast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const [supRes, prodRes] = await Promise.all([
        getSuppliers(),
        getProducts({ per_page: 1000 })
      ]);
      setSuppliers(supRes.data);
      setProducts(prodRes.data.items || prodRes.data || []);

      // Compile list of all purchases from all suppliers
      let allPurchases = [];
      for (const sup of supRes.data) {
        const detailRes = await getSupplier(sup.id);
        const pRecs = (detailRes.data.history || []).filter(r => r.record_type === 'purchase');
        // Inject supplier business name into record
        pRecs.forEach(r => {
          r.supplier_business_name = sup.business_name;
          r.supplier_id = sup.id;
        });
        allPurchases = [...allPurchases, ...pRecs];
      }
      // Sort purchases by date desc, then created_at desc
      allPurchases.sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id);
      setPurchases(allPurchases);
    } catch(e) {
      toast('Failed to load purchase history data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddProductToCart = () => {
    if (!currentProductId) return toast('Please select a product', 'warning');
    if (!currentQty || Number(currentQty) <= 0) return toast('Quantity must be greater than 0', 'warning');
    if (!currentCost || Number(currentCost) <= 0) return toast('Cost must be greater than 0', 'warning');

    const product = products.find(p => p.id === Number(currentProductId));
    if (!product) return;

    // Check if product already exists in cart
    const existingIndex = cart.findIndex(item => item.id === product.id);
    if (existingIndex > -1) {
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantity += Number(currentQty);
      updatedCart[existingIndex].unit_cost = Number(currentCost);
      setCart(updatedCart);
    } else {
      setCart([...cart, {
        id: product.id,
        name: product.name,
        quantity: Number(currentQty),
        unit_cost: Number(currentCost)
      }]);
    }

    // Reset current item inputs
    setCurrentProductId('');
    setCurrentQty('');
    setCurrentCost('');
  };

  const handleRemoveFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const handleSavePurchase = async (e) => {
    e.preventDefault();
    if (!selectedSupplierId) return toast('Please select a supplier', 'warning');
    if (cart.length === 0) return toast('Please add at least one product to the purchase bill', 'warning');

    const totalBillAmount = cart.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);

    const payload = {
      amount: totalBillAmount,
      invoice_number: invoiceNumber,
      date: purchaseDate,
      note: note,
      products_purchased: cart
    };

    try {
      await addSupplierPurchase(selectedSupplierId, payload);
      toast('Purchase saved & Inventory updated successfully!', 'success');
      
      // Reset form
      setSelectedSupplierId('');
      setInvoiceNumber('');
      setNote('');
      setCart([]);
      setShowAddForm(false);
      
      // Reload timeline and history list
      loadData();
      
      // Dispatch alert notify trigger to topbar notifications
      window.dispatchEvent(new Event('update-notifications'));
    } catch(err) {
      toast(err.response?.data?.message || 'Failed to save purchase', 'error');
    }
  };

  const totalCartAmount = cart.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Purchase Invoices / Stock Inflow</h3>
        <button 
          className="btn-primary shadow-sm"
          onClick={() => {
            if (showAddForm) {
              setCart([]);
              setSelectedSupplierId('');
              setInvoiceNumber('');
            }
            setShowAddForm(!showAddForm);
          }}
        >
          {showAddForm ? 'View Invoices' : 'New Purchase Entry'}
        </button>
      </div>

      {showAddForm ? (
        <div className="card p-6 border-indigo-100 bg-indigo-50/20 shadow-md">
          <h3 className="text-sm font-extrabold text-indigo-900 mb-4">Record New Inventory Purchase</h3>
          
          <form onSubmit={handleSavePurchase} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="input-label">Supplier *</label>
                <select 
                  required
                  className="input bg-white border-slate-200 font-semibold"
                  value={selectedSupplierId}
                  onChange={e => setSelectedSupplierId(e.target.value)}
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.business_name} ({s.name})</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="input-label">Invoice / Bill Number</label>
                <input 
                  className="input bg-white border-slate-200"
                  value={invoiceNumber}
                  onChange={e => setInvoiceNumber(e.target.value)}
                  placeholder="e.g. BILL-987"
                />
              </div>

              <div>
                <label className="input-label">Purchase Date</label>
                <input 
                  type="date"
                  required
                  className="input bg-white border-slate-200 font-semibold"
                  value={purchaseDate}
                  onChange={e => setPurchaseDate(e.target.value)}
                />
              </div>

              <div>
                <label className="input-label">Note / Remark</label>
                <input 
                  className="input bg-white border-slate-200"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="e.g. Diwali stock restocking"
                />
              </div>
            </div>

            {/* Add Item Widget */}
            <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Add Products to Purchase Bill</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Product *</label>
                  <select 
                    className="input bg-slate-50 border-slate-200 text-sm font-semibold"
                    value={currentProductId}
                    onChange={e => {
                      setCurrentProductId(e.target.value);
                      const prod = products.find(p => p.id === Number(e.target.value));
                      if (prod) {
                        setCurrentCost(prod.buy_price || '');
                      }
                    }}
                  >
                    <option value="">Select product from inventory...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (Current Stock: {p.stock_quantity})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Purchase Price (Cost ₹) *</label>
                  <input 
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="₹ Unit Cost"
                    className="input bg-slate-50 border-slate-200"
                    value={currentCost}
                    onChange={e => setCurrentCost(e.target.value)}
                  />
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Quantity *</label>
                    <input 
                      type="number"
                      min="1"
                      placeholder="Qty"
                      className="input bg-slate-50 border-slate-200"
                      value={currentQty}
                      onChange={e => setCurrentQty(e.target.value)}
                    />
                  </div>
                  <button 
                    type="button" 
                    onClick={handleAddProductToCart}
                    className="btn bg-slate-800 text-white font-bold px-4 py-2.5 rounded-xl hover:bg-slate-900 shadow-sm"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Cart Table */}
            {cart.length > 0 && (
              <div className="table-container shadow-sm bg-white rounded-2xl overflow-hidden border border-slate-200">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="table-header">Product</th>
                      <th className="table-header text-right">Unit Price</th>
                      <th className="table-header text-right">Quantity</th>
                      <th className="table-header text-right">Subtotal</th>
                      <th className="table-header text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map(item => (
                      <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                        <td className="table-cell font-bold text-slate-800">{item.name}</td>
                        <td className="table-cell text-right text-slate-600">₹{item.unit_cost.toLocaleString()}</td>
                        <td className="table-cell text-right text-slate-900 font-extrabold">{item.quantity}</td>
                        <td className="table-cell text-right font-black text-slate-800">₹{(item.quantity * item.unit_cost).toLocaleString()}</td>
                        <td className="table-cell text-right">
                          <button 
                            type="button" 
                            onClick={() => handleRemoveFromCart(item.id)} 
                            className="text-xs font-bold text-red-500 hover:underline"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-100/60 font-bold border-t border-slate-200">
                      <td colSpan="3" className="table-cell text-right text-slate-700 font-black">Purchase Total</td>
                      <td className="table-cell text-right text-lg font-black text-slate-900">₹{totalCartAmount.toLocaleString()}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex gap-3">
              <button 
                type="submit" 
                disabled={cart.length === 0 || !selectedSupplierId}
                className="btn-primary shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Purchase &amp; Increase Stock
              </button>
              <button 
                type="button" 
                onClick={() => { setShowAddForm(false); setCart([]); }} 
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="table-container shadow-sm bg-white">
          <div className="section-header bg-slate-50 py-3.5 px-5">
            <h3 className="section-title mb-0">All Purchase Invoices</h3>
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-40"><span className="spinner" /></div>
          ) : purchases.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No purchases found. Use "New Purchase Entry" to log inventory stock inflow.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">Date</th>
                  <th className="table-header">Supplier</th>
                  <th className="table-header">Invoice #</th>
                  <th className="table-header">Items</th>
                  <th className="table-header text-right">Amount</th>
                  <th className="table-header text-right">Outstanding After</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map(p => (
                  <tr key={p.id} className="table-row">
                    <td className="table-cell text-slate-600">{p.date}</td>
                    <td className="table-cell font-bold text-slate-900">{p.supplier_business_name}</td>
                    <td className="table-cell font-semibold text-slate-600">{p.invoice_number || 'N/A'}</td>
                    <td className="table-cell max-w-[280px]">
                      {p.products_purchased && (
                        <div className="text-xs text-slate-500 line-clamp-2">
                          {(() => {
                            try {
                              const arr = JSON.parse(p.products_purchased);
                              return arr.map(i => `${i.name} (${i.quantity})`).join(', ');
                            } catch(e) {
                              return p.products_purchased;
                            }
                          })()}
                        </div>
                      )}
                    </td>
                    <td className="table-cell text-right font-black text-slate-800">₹{p.amount.toLocaleString()}</td>
                    <td className="table-cell text-right font-black text-red-600">₹{p.running_balance.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// ─── PAYMENTS TAB ─────────────────────────────────────────────────────────────
function PaymentsTab() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [payments, setPayments] = useState([]);
  
  // Record Payment Form state
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  
  const { toast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const supRes = await getSuppliers();
      setSuppliers(supRes.data);

      // Compile list of all payments made to all suppliers
      let allPayments = [];
      for (const sup of supRes.data) {
        const detailRes = await getSupplier(sup.id);
        const pRecs = (detailRes.data.history || []).filter(r => r.record_type === 'payment');
        // Inject supplier business name
        pRecs.forEach(r => {
          r.supplier_business_name = sup.business_name;
          r.supplier_id = sup.id;
        });
        allPayments = [...allPayments, ...pRecs];
      }
      // Sort payments by date desc
      allPayments.sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id);
      setPayments(allPayments);
    } catch(e) {
      toast('Failed to load supplier payment logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedSupplierId) return toast('Please select a supplier', 'warning');
    if (!paymentAmount || Number(paymentAmount) <= 0) return toast('Amount must be greater than zero', 'warning');

    const supplier = suppliers.find(s => s.id === Number(selectedSupplierId));
    if (supplier && Number(paymentAmount) > supplier.balance) {
      return toast(`Payment exceeds outstanding payable of ₹${supplier.balance.toLocaleString()}`, 'error');
    }

    const payload = {
      amount: Number(paymentAmount),
      date: paymentDate,
      note: note
    };

    try {
      await recordSupplierPayment(selectedSupplierId, payload);
      toast('Payment recorded successfully!', 'success');
      
      // Reset form
      setSelectedSupplierId('');
      setPaymentAmount('');
      setNote('');
      setShowAddForm(false);
      
      // Reload list
      loadData();
    } catch(err) {
      toast(err.response?.data?.message || 'Failed to record payment', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Supplier Payment Outflows</h3>
        <button 
          className="btn-primary shadow-sm"
          onClick={() => {
            if (showAddForm) {
              setSelectedSupplierId('');
              setPaymentAmount('');
            }
            setShowAddForm(!showAddForm);
          }}
        >
          {showAddForm ? 'View Payments' : 'Record Payment'}
        </button>
      </div>

      {showAddForm ? (
        <div className="card p-6 border-emerald-100 bg-emerald-50/20 shadow-md max-w-xl mx-auto">
          <h3 className="text-sm font-extrabold text-emerald-900 mb-4">Record Payment to Supplier</h3>
          
          <form onSubmit={handleRecordPayment} className="space-y-4">
            <div>
              <label className="input-label">Supplier *</label>
              <select 
                required
                className="input bg-white border-slate-200 font-semibold"
                value={selectedSupplierId}
                onChange={e => setSelectedSupplierId(e.target.value)}
              >
                <option value="">Select Supplier</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.business_name} (Pending: ₹{s.balance.toLocaleString()})</option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="input-label">Amount Paid *</label>
                <input 
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  className="input bg-white border-slate-200 font-bold"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  placeholder="₹ Amount Paid"
                />
              </div>

              <div>
                <label className="input-label">Payment Date</label>
                <input 
                  type="date"
                  required
                  className="input bg-white border-slate-200 font-semibold"
                  value={paymentDate}
                  onChange={e => setPaymentDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="input-label">Notes / Payment Reference</label>
              <input 
                className="input bg-white border-slate-200"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="e.g. Bank Transfer Ref 12345"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                type="submit" 
                disabled={!selectedSupplierId || !paymentAmount}
                className="btn bg-emerald-600 text-white hover:bg-emerald-700 text-sm font-bold shadow-sm px-4 py-2.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Confirm Payment
              </button>
              <button 
                type="button" 
                onClick={() => { setShowAddForm(false); setSelectedSupplierId(''); setPaymentAmount(''); }} 
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="table-container shadow-sm bg-white">
          <div className="section-header bg-slate-50 py-3.5 px-5">
            <h3 className="section-title mb-0">All Supplier Payment Logs</h3>
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-40"><span className="spinner" /></div>
          ) : payments.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No payment records found. Use "Record Payment" to log cash/bank payouts to wholesalers.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">Date</th>
                  <th className="table-header">Supplier</th>
                  <th className="table-header">Reference / Notes</th>
                  <th className="table-header text-right">Amount Paid</th>
                  <th className="table-header text-right">Remaining Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id} className="table-row">
                    <td className="table-cell text-slate-600">{p.date}</td>
                    <td className="table-cell font-bold text-slate-900">{p.supplier_business_name}</td>
                    <td className="table-cell text-slate-500 italic text-xs">{p.note || 'None'}</td>
                    <td className="table-cell text-right font-black text-green-600">₹{p.amount.toLocaleString()}</td>
                    <td className="table-cell text-right font-black text-slate-800">₹{p.running_balance.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
