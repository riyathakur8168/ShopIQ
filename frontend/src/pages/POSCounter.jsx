import { useState, useEffect, useMemo } from 'react';
import { getProducts, getCustomers, addSale, addCredit, createInvoice, addCustomer } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function POSCounter({ setActiveTab }) {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  
  // Customer State
  const [customerMode, setCustomerMode] = useState('Walk-in'); // 'Walk-in', 'Existing', 'New'
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', address: '' });
  
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([
      getProducts({ per_page: 100 }),
      getCustomers({ per_page: 100 })
    ]).then(([prodRes, custRes]) => {
      setProducts(prodRes.data.items || prodRes.data || []);
      setCustomers(custRes.data.items || custRes.data || []);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
      toast('Failed to load catalog', 'error');
    });
  }, [toast]);

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    const lowerQ = searchQuery.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(lowerQ) || 
      (p.category && p.category.toLowerCase().includes(lowerQ))
    );
  }, [products, searchQuery]);

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, cartQty: item.cartQty + 1 } : item);
      }
      return [...prev, { ...product, cartQty: 1 }];
    });
  };

  const updateCartQty = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.cartQty + delta);
        return { ...item, cartQty: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.sell_price * item.cartQty), 0);

  const triggerPrint = (invoiceData, customerData, cartItems, total, paymentMode) => {
    const receiptHtml = `
      <html>
        <head>
          <style>
            body { font-family: monospace; font-size: 12px; width: 80mm; margin: 0 auto; padding: 10px; color: #000; }
            h2, h3, p { text-align: center; margin: 2px 0; }
            .divider { border-bottom: 1px dashed #000; margin: 5px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 5px; }
            th, td { text-align: left; padding: 2px 0; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .total-row { font-size: 14px; font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>SHOPIQ</h2>
          <p>Retail Invoice</p>
          <div class="divider"></div>
          <p>Date: ${new Date().toLocaleString()}</p>
          <p>Customer: ${customerData ? customerData.name : 'Walk-in'}</p>
          <p>Payment: ${paymentMode}</p>
          <div class="divider"></div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th class="right">Qty</th>
                <th class="right">Price</th>
                <th class="right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${cartItems.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td class="right">${item.cartQty}</td>
                  <td class="right">${item.sell_price}</td>
                  <td class="right">${item.cartQty * item.sell_price}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="divider"></div>
          <table>
            <tr class="total-row">
              <td>Total Amount</td>
              <td class="right">Rs. ${total}</td>
            </tr>
          </table>
          <div class="divider"></div>
          <p>Thank You! Visit Again.</p>
        </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    iframe.contentDocument.write(receiptHtml);
    iframe.contentDocument.close();

    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 250);
  };

  const handleGenerateBill = async () => {
    if (cart.length === 0) return toast('Cart is empty', 'error');
    if (paymentMethod === 'Udhar' && customerMode === 'Walk-in') {
      return toast('Udhar requires an Existing or New customer', 'error');
    }
    if (customerMode === 'New' && !newCustomer.name.trim()) {
      return toast('New customer name is required', 'error');
    }
    if (customerMode === 'Existing' && !selectedCustomer && paymentMethod === 'Udhar') {
      return toast('Select an existing customer for Udhar', 'error');
    }

    setSubmitting(true);
    try {
      let finalCustomer = null;

      // 1. Process Customer (if New)
      if (customerMode === 'New') {
        const cRes = await addCustomer({
          name: newCustomer.name,
          phone: newCustomer.phone,
          address: newCustomer.address,
        });
        // Handle response gracefully
        finalCustomer = cRes.data.customer || cRes.data;
        setCustomers(prev => [...prev, finalCustomer]);
      } else if (customerMode === 'Existing' && selectedCustomer) {
        finalCustomer = selectedCustomer;
      }

      // 2. Process Sales
      for (const item of cart) {
        await addSale({
          product_id: item.id,
          quantity: item.cartQty,
          unit_price: item.sell_price,
          sale_date: new Date().toISOString().split('T')[0],
          note: `POS Sale - ${paymentMethod}`
        });
      }

      // 3. Process Udhar
      if (paymentMethod === 'Udhar' && finalCustomer) {
        await addCredit(finalCustomer.id, { amount: totalAmount });
      }

      // 4. Generate Bill/Invoice
      const invoicePayload = {
        customer_name: finalCustomer ? finalCustomer.name : 'Walk-in Customer',
        items: cart.map(item => ({
          name: item.name,
          qty: item.cartQty,
          price: item.sell_price
        }))
      };
      const invRes = await createInvoice(invoicePayload);

      toast(`Sale recorded & bill generated for ₹${totalAmount.toLocaleString()}!`, 'success');
      
      // 5. Trigger Native Print
      triggerPrint(invRes.data?.invoice || {}, finalCustomer, cart, totalAmount, paymentMethod);

      // Reset Form
      setCart([]);
      setCustomerMode('Walk-in');
      setSelectedCustomer(null);
      setNewCustomer({ name: '', phone: '', address: '' });
      setPaymentMethod('Cash');
      setSearchQuery('');
      
      // Update inventory states
      window.dispatchEvent(new Event('update-notifications'));
      
      // Refetch products to update stock counts in UI
      const prodRes = await getProducts({ per_page: 100 });
      setProducts(prodRes.data.items || prodRes.data || []);
      
    } catch (err) {
      console.error(err);
      toast(err.response?.data?.message || 'Transaction failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const lowStockItems = products.filter(p => p.stock_quantity <= p.low_stock_threshold).slice(0, 3);
  
  const upiUrl = `upi://pay?pa=shopiq@upi&pn=ShopIQ&am=${totalAmount}&cu=INR`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiUrl)}&color=4338ca`;

  return (
    <div className="h-full flex flex-col md:flex-row bg-slate-50 overflow-hidden relative animate-fade-in">
      
      {/* Left Pane: Product Catalog */}
      <div className="flex-1 flex flex-col h-full border-r border-slate-200">
        <div className="p-4 bg-white border-b border-slate-200 shadow-sm z-10 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </span>
              <input 
                type="text" 
                autoFocus
                placeholder="Search products by name or category..." 
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all shadow-inner"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="hidden lg:flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-3 py-2 rounded-xl">
              <span className="text-indigo-500 text-lg">🤖</span>
              <div>
                <p className="text-[10px] font-black text-indigo-800 uppercase tracking-wide">Quick Insight</p>
                <p className="text-xs text-indigo-600 font-medium whitespace-nowrap">
                  {lowStockItems.length > 0 
                    ? `${lowStockItems.length} items running extremely low` 
                    : 'Inventory is healthy!'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <span className="spinner border-primary-500 w-8 h-8"></span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <div className="text-4xl mb-3 opacity-50">🛒</div>
              <p className="text-sm font-semibold">No products found matching "{searchQuery}"</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map(product => {
                const isLowStock = product.stock_quantity <= product.low_stock_threshold;
                const inCart = cart.find(c => c.id === product.id);
                return (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className={`relative text-left bg-white p-4 rounded-2xl border-2 transition-all duration-200 group flex flex-col justify-between h-32
                      ${inCart ? 'border-primary-500 shadow-md bg-primary-50/30' : 'border-slate-100 shadow-sm hover:border-slate-300 hover:shadow-md'}`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider truncate pr-2">
                          {product.category || 'General'}
                        </p>
                        {inCart && (
                          <span className="bg-primary-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md shadow-sm">
                            {inCart.cartQty} in cart
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 leading-tight line-clamp-2 group-hover:text-primary-700 transition-colors">
                        {product.name}
                      </h4>
                    </div>
                    
                    <div className="flex justify-between items-end mt-2">
                      <p className={`text-xs font-bold ${isLowStock ? 'text-red-500' : 'text-emerald-600'}`}>
                        Stock: {product.stock_quantity}
                      </p>
                      <p className="text-lg font-black text-slate-900">
                        ₹{product.sell_price.toLocaleString()}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Pane: Unified Checkout Workflow */}
      <div className="w-full md:w-[420px] bg-white flex flex-col h-full shadow-[-4px_0_15px_rgba(0,0,0,0.03)] z-20 flex-shrink-0">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center flex-shrink-0">
          <h2 className="text-lg font-black text-slate-900">Current Sale</h2>
          <span className="text-xs font-bold bg-slate-200 text-slate-600 px-2 py-1 rounded-md">{cart.length} Items</span>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
              <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
              <p className="text-sm font-semibold">Cart is empty</p>
              <p className="text-xs mt-1">Select products to begin billing</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex gap-3 bg-white border border-slate-100 p-3 rounded-xl shadow-sm relative group">
                <div className="flex-1 min-w-0">
                  <h5 className="text-sm font-bold text-slate-800 truncate">{item.name}</h5>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">₹{item.sell_price.toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-1 border border-slate-200">
                  <button onClick={() => updateCartQty(item.id, -1)} className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-white rounded-md transition-colors font-bold">-</button>
                  <span className="text-xs font-black w-4 text-center">{item.cartQty}</span>
                  <button onClick={() => updateCartQty(item.id, 1)} className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-white rounded-md transition-colors font-bold">+</button>
                </div>
                <button 
                  onClick={() => removeFromCart(item.id)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity font-bold shadow-sm"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>

        {/* Checkout Controls */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-4 flex-shrink-0">
          
          {/* Customer Selection Mode */}
          <div>
            <div className="flex justify-between items-end mb-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Customer</label>
              <div className="flex gap-1 bg-slate-200/50 p-0.5 rounded-lg border border-slate-200">
                {['Walk-in', 'Existing', 'New'].map(mode => (
                  <button key={mode} onClick={() => setCustomerMode(mode)}
                    className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${
                      customerMode === mode ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {customerMode === 'Existing' && (
              <div className="animate-fade-in mt-2">
                <select 
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-primary-500 focus:outline-none shadow-sm"
                  value={selectedCustomer ? selectedCustomer.id : ''}
                  onChange={(e) => {
                    const c = customers.find(x => x.id === Number(e.target.value));
                    setSelectedCustomer(c || null);
                  }}
                >
                  <option value="">Select Customer...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>
                  ))}
                </select>
                {selectedCustomer && (
                  <p className="text-[10px] text-slate-500 font-semibold mt-1.5 px-1 flex justify-between">
                    <span>Balance:</span>
                    <span className={selectedCustomer.total_credit - selectedCustomer.total_paid > 0 ? 'text-red-500' : 'text-emerald-500'}>
                      ₹{(selectedCustomer.total_credit - selectedCustomer.total_paid).toLocaleString()}
                    </span>
                  </p>
                )}
              </div>
            )}

            {customerMode === 'New' && (
              <div className="space-y-2 animate-fade-in mt-2 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <input 
                  type="text" 
                  placeholder="Customer Name *" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary-500"
                  value={newCustomer.name}
                  onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
                />
                <input 
                  type="text" 
                  placeholder="Phone Number" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary-500"
                  value={newCustomer.phone}
                  onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
                />
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Payment Mode</label>
            <div className="grid grid-cols-3 gap-2">
              {['Cash', 'UPI', 'Udhar'].map(method => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`py-2 text-xs font-bold rounded-xl transition-all border-2 ${
                    paymentMethod === method 
                      ? method === 'Udhar' 
                        ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-sm'
                        : 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm'
                      : 'border-transparent bg-white text-slate-500 shadow-sm hover:border-slate-200'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
            
            {/* Dynamic UPI QR Code Panel */}
            {paymentMethod === 'UPI' && cart.length > 0 && (
              <div className="mt-3 bg-indigo-50 rounded-xl p-4 flex flex-col items-center justify-center border border-indigo-100 animate-fade-in">
                <div className="bg-white p-2 rounded-lg shadow-sm border border-indigo-50 mb-2">
                  <img src={qrCodeUrl} alt="UPI QR Code" className="w-24 h-24 object-contain" />
                </div>
                <p className="text-xs font-bold text-indigo-900">Scan to pay ₹{totalAmount}</p>
              </div>
            )}
            {paymentMethod === 'Udhar' && customerMode === 'Walk-in' && (
              <p className="text-[10px] text-red-500 font-bold mt-2 animate-fade-in">
                ⚠️ Please select "Existing" or "New" customer to give Udhar.
              </p>
            )}
          </div>

          {/* Totals & CTA */}
          <div className="pt-2">
            <div className="flex justify-between items-end mb-4 px-1">
              <span className="text-sm font-bold text-slate-500">Total Amount</span>
              <span className="text-3xl font-black text-slate-900 tracking-tight">₹{totalAmount.toLocaleString()}</span>
            </div>
            
            <button
              onClick={handleGenerateBill}
              disabled={submitting || cart.length === 0}
              className={`w-full py-4 rounded-2xl text-base font-black flex justify-center items-center gap-2 transition-all shadow-lg
                ${cart.length === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                : paymentMethod === 'Udhar' ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/25 hover:shadow-amber-500/40' 
                : 'bg-primary-600 hover:bg-primary-700 text-white shadow-primary-600/25 hover:shadow-primary-600/40'}`}
            >
              {submitting ? (
                <><span className="spinner w-5 h-5 border-2 border-white border-t-transparent"></span> Processing...</>
              ) : (
                <>Generate Bill {paymentMethod === 'Udhar' ? '& Udhar' : '& Print'} ✨</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
