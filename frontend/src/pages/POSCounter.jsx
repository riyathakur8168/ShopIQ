import { useState, useEffect, useMemo, useRef } from 'react';
import { getProducts, getCustomers, addSale, addCredit, createInvoice, addCustomer, getCategories, checkCustomerPhone } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function POSCounter({ setActiveTab }) {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState([]);
  
  // Customer State
  const [customerMode, setCustomerMode] = useState('Walk-in'); // 'Walk-in', 'Existing'
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [newCustomer, setNewCustomer] = useState({ firstName: '', lastName: '', phone: '', address: '' });
  const [newCustomerErrors, setNewCustomerErrors] = useState({ firstName: '', lastName: '', phone: '' });
  const [newCustomerTouched, setNewCustomerTouched] = useState({ firstName: false, lastName: false, phone: false });
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileView, setMobileView] = useState('catalog'); // 'catalog' | 'cart'
  
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([
      getProducts({ per_page: 100 }),
      getCustomers({ per_page: 100 }),
      getCategories()
    ]).then(([prodRes, custRes, catRes]) => {
      setProducts(prodRes.data.items || prodRes.data || []);
      setCustomers(custRes.data.items || custRes.data || []);
      const backendCats = catRes.data || [];
      setCategories(['All', ...backendCats.map(c => c.name)]);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
      toast('Failed to load catalog', 'error');
    });
  }, [toast]);

  const modalFirstNameInputRef = useRef(null);
  const modalLastNameInputRef = useRef(null);
  const modalPhoneInputRef = useRef(null);

  useEffect(() => {
    if (showNewCustomerModal) {
      setTimeout(() => {
        modalFirstNameInputRef.current?.focus();
      }, 100);
    }
  }, [showNewCustomerModal]);

  const handleModeChange = (mode) => {
    if (mode === 'New') {
      setShowNewCustomerModal(true);
      setNewCustomerErrors({ firstName: '', lastName: '', phone: '' });
      setNewCustomerTouched({ firstName: false, lastName: false, phone: false });
    } else {
      setCustomerMode(mode);
      if (mode === 'Walk-in') {
        setSelectedCustomer(null);
      }
    }
  };

  
  const validateFirstName = (val) => {
    const trimmed = val.trim();
    if (!trimmed) return "First Name is required.";
    if (trimmed.length < 2 || trimmed.length > 30 || !/^[A-Za-z]+$/.test(trimmed)) {
      return "Please enter a valid first name using letters only.";
    }
    return "";
  };

  const validateLastName = (val) => {
    const trimmed = val.trim();
    if (!trimmed) return "";
    if (trimmed.length < 2 || trimmed.length > 30 || !/^[A-Za-z]+$/.test(trimmed)) {
      return "Please enter a valid last name using letters only.";
    }
    return "";
  };

  const validatePhone = (val) => {
    const digits = val.replace(/\D/g, '');
    if (!digits) return "Mobile Number is required.";
    if (digits.length !== 10 || !/^[6-9]/.test(digits)) {
      return "Please enter a valid 10-digit Indian mobile number.";
    }
    return "";
  };

  const formatName = (str) => {
    const trimmed = str.trim();
    if (!trimmed) return "";
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  };

  const handleNewCustomerFirstNameChange = (val) => {
    const cleanVal = val.replace(/[^A-Za-z]/g, '');
    setNewCustomer(c => ({ ...c, firstName: cleanVal }));
    setNewCustomerTouched(t => ({ ...t, firstName: true }));
    setNewCustomerErrors(e => ({ ...e, firstName: validateFirstName(cleanVal) }));
  };

  const handleNewCustomerFirstNameBlur = () => {
    if (newCustomer.firstName) {
      const formatted = formatName(newCustomer.firstName);
      setNewCustomer(c => ({ ...c, firstName: formatted }));
      setNewCustomerErrors(e => ({ ...e, firstName: validateFirstName(formatted) }));
    }
  };

  const handleNewCustomerLastNameChange = (val) => {
    const cleanVal = val.replace(/[^A-Za-z]/g, '');
    setNewCustomer(c => ({ ...c, lastName: cleanVal }));
    setNewCustomerTouched(t => ({ ...t, lastName: true }));
    setNewCustomerErrors(e => ({ ...e, lastName: validateLastName(cleanVal) }));
  };

  const handleNewCustomerLastNameBlur = () => {
    if (newCustomer.lastName) {
      const formatted = formatName(newCustomer.lastName);
      setNewCustomer(c => ({ ...c, lastName: formatted }));
      setNewCustomerErrors(e => ({ ...e, lastName: validateLastName(formatted) }));
    }
  };

  const handleNewCustomerFirstNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      modalLastNameInputRef.current?.focus();
    }
  };

  const handleNewCustomerLastNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      modalPhoneInputRef.current?.focus();
    }
  };

  const handleNewCustomerPhoneChange = async (val) => {
    const digits = val.replace(/\D/g, '').slice(0, 10);
    setNewCustomer(c => ({ ...c, phone: digits }));
    setNewCustomerTouched(t => ({ ...t, phone: true }));
    
    const phoneErr = validatePhone(digits);
    if (phoneErr) {
      setNewCustomerErrors(e => ({ ...e, phone: phoneErr }));
    } else {
      setNewCustomerErrors(e => ({ ...e, phone: '' }));
      try {
        const res = await checkCustomerPhone(digits);
        if (res.data.exists) {
          setNewCustomerErrors(e => ({ ...e, phone: "A customer with this mobile number already exists." }));
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const isNewCustomerFormValid = 
    !newCustomerErrors.firstName && 
    !newCustomerErrors.lastName && 
    !newCustomerErrors.phone && 
    newCustomer.firstName.trim() && 
    newCustomer.phone.trim();

  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }
    if (searchQuery) {
      const lowerQ = searchQuery.toLowerCase();
      filtered = filtered.filter(p => p.name.toLowerCase().includes(lowerQ));
    }
    return filtered;
  }, [products, searchQuery, selectedCategory]);

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
    setCart(prev => {
      const updated = prev.map(item => {
        if (item.id === id) {
          return { ...item, cartQty: item.cartQty + delta };
        }
        return item;
      });
      // Auto-remove if qty reaches 0
      return updated.filter(item => item.cartQty > 0);
    });
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
      return toast('Udhar requires an Existing customer', 'error');
    }
    if (customerMode === 'Existing' && !selectedCustomer && paymentMethod === 'Udhar') {
      return toast('Select a customer for Udhar', 'error');
    }

    setSubmitting(true);
    try {
      let finalCustomer = null;

      if (customerMode === 'Existing' && selectedCustomer) {
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

      // 3. Generate Bill/Invoice
      const invoicePayload = {
        customer_name: finalCustomer ? finalCustomer.name : 'Walk-in Customer',
        items: cart.map(item => ({
          name: item.name,
          qty: item.cartQty,
          price: item.sell_price
        }))
      };
      const invRes = await createInvoice(invoicePayload);

      // 4. Process Udhar — send complete cart so ledger stores full product details
      if (paymentMethod === 'Udhar' && finalCustomer) {
        const billNumber = invRes.data?.invoice?.id
          ? String(invRes.data.invoice.id)
          : String(Math.floor(Date.now() / 1000));

        const productsJSON = JSON.stringify(cart.map(item => ({
          name:       item.name,
          quantity:   item.cartQty,
          unit_price: item.sell_price,
          total:      item.sell_price * item.cartQty
        })));

        await addCredit(finalCustomer.id, {
          amount:             totalAmount,
          bill_amount:        totalAmount,
          bill_number:        billNumber,
          products_purchased: productsJSON,
          quantity:           cart.reduce((s, i) => s + i.cartQty, 0),
          note:               'POS Udhar Sale',
          date:               new Date().toISOString().split('T')[0]
        });
      }

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
      setMobileView('catalog');
      
      // Update inventory states
      window.dispatchEvent(new Event('update-notifications'));
      
      // Refetch products & categories to update UI
      const [prodRes, catRes] = await Promise.all([
        getProducts({ per_page: 100 }),
        getCategories()
      ]);
      setProducts(prodRes.data.items || prodRes.data || []);
      const backendCats = catRes.data || [];
      setCategories(['All', ...backendCats.map(c => c.name)]);
      
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
      <div className={`w-full md:w-[60%] flex-col h-full border-r border-slate-200 ${mobileView === 'catalog' ? 'flex' : 'hidden md:flex'}`}>
        <div className="p-4 bg-white border-b border-slate-200 shadow-sm z-10 flex-shrink-0 flex flex-col gap-3">
          
          {/* Category Tabs */}
          <div className="flex overflow-x-auto custom-scrollbar pb-1 gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${
                  selectedCategory === cat 
                    ? 'bg-primary-600 text-white shadow-md' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </span>
              <input 
                type="text" 
                autoFocus
                placeholder="Search products in selected category..." 
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
                  <div
                    key={product.id}
                    className={`relative text-left bg-white rounded-2xl border-2 transition-all duration-200 group flex flex-col cursor-pointer select-none
                      ${inCart ? 'border-primary-500 shadow-md bg-primary-50/30' : 'border-slate-100 shadow-sm hover:border-slate-300 hover:shadow-md'}`}
                  >
                    {/* Card body — clicking adds +1 */}
                    <div
                      className="flex-1 p-4 pb-2"
                      onClick={() => addToCart(product)}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider truncate pr-2">
                          {product.category || 'General'}
                        </p>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 leading-tight line-clamp-2 group-hover:text-primary-700 transition-colors">
                        {product.name}
                      </h4>
                      <p className={`text-[10px] font-bold mt-1 ${isLowStock ? 'text-red-500' : 'text-emerald-600'}`}>
                        Stock: {product.stock_quantity}
                      </p>
                    </div>

                    {/* Card footer — price + qty controls */}
                    <div className="px-3 pb-3">
                      {inCart ? (
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-black text-slate-900">
                            ₹{product.sell_price.toLocaleString()}
                          </span>
                          {/* [-] qty [+] stepper */}
                          <div className="flex items-center gap-1 bg-primary-600 rounded-lg px-1 py-0.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); updateCartQty(product.id, -1); }}
                              className="w-6 h-6 flex items-center justify-center text-white hover:bg-primary-700 rounded-md transition-colors font-black text-base leading-none"
                              title="Remove one"
                            >
                              −
                            </button>
                            <span className="text-white text-xs font-black min-w-[1.25rem] text-center">
                              {inCart.cartQty}
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); updateCartQty(product.id, 1); }}
                              className="w-6 h-6 flex items-center justify-center text-white hover:bg-primary-700 rounded-md transition-colors font-black text-base leading-none"
                              title="Add one"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="flex items-center justify-between"
                          onClick={() => addToCart(product)}
                        >
                          <span className="text-sm font-black text-slate-900">
                            ₹{product.sell_price.toLocaleString()}
                          </span>
                          <span className="text-[10px] font-black text-primary-600 bg-primary-50 border border-primary-200 px-2 py-0.5 rounded-lg">
                            Add +
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Floating bottom cart bar for mobile */}
        {cart.length > 0 && (
          <div className="md:hidden p-3 bg-white border-t border-slate-200 shadow-lg z-30 flex-shrink-0">
            <button 
              onClick={() => setMobileView('cart')}
              className="w-full bg-primary-600 hover:bg-primary-700 active:scale-[0.99] text-white font-bold py-3 px-4 rounded-xl flex items-center justify-between shadow-md transition-all"
            >
              <span className="flex items-center gap-2">
                <span>🛒</span>
                <span>View Cart ({cart.length} {cart.length === 1 ? 'item' : 'items'})</span>
              </span>
              <span className="font-black text-base">₹{totalAmount.toLocaleString()} →</span>
            </button>
          </div>
        )}
      </div>

      {/* Right Pane: Unified Checkout Workflow */}
      <div className={`w-full md:w-[40%] bg-white flex-col h-full shadow-[-4px_0_15px_rgba(0,0,0,0.03)] z-20 flex-shrink-0 ${mobileView === 'cart' ? 'flex' : 'hidden md:flex'}`}>
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setMobileView('catalog')} 
              className="md:hidden p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-200 transition-colors font-bold text-xs flex items-center gap-1"
              title="Back to products"
            >
              ← Catalog
            </button>
            <h2 className="text-lg font-black text-slate-900">Current Sale</h2>
          </div>
          <span className="text-xs font-bold bg-slate-200 text-slate-600 px-2 py-1 rounded-md">{cart.length} Items</span>
        </div>

        {/* Cart Items */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 custom-scrollbar">
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
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1 bg-slate-50 rounded-lg p-1 border border-slate-200">
                    <button onClick={() => updateCartQty(item.id, -1)} className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-white rounded-md transition-colors font-bold leading-none">-</button>
                    <span className="text-xs font-black w-4 text-center">{item.cartQty}</span>
                    <button onClick={() => updateCartQty(item.id, 1)} className="w-5 h-5 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-white rounded-md transition-colors font-bold leading-none">+</button>
                  </div>
                  <span className="text-[11px] font-black text-primary-700 bg-primary-50 px-1.5 py-0.5 rounded">₹{(item.sell_price * item.cartQty).toLocaleString()}</span>
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
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex-shrink-0 flex flex-col gap-2">
          
          {/* Customer Selection Mode */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Customer</label>
              <div className="flex gap-1 bg-slate-200/50 p-0.5 rounded-lg border border-slate-200">
                {['Walk-in', 'Existing', 'New'].map(mode => (
                  <button key={mode} type="button" onClick={() => handleModeChange(mode)}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${
                      customerMode === mode ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {customerMode === 'Existing' && (
              <div className="animate-fade-in space-y-2">
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
                  <div className="text-[10px] text-slate-600 font-bold space-y-1 bg-amber-50/50 p-2 rounded-xl border border-amber-100/60 shadow-sm">
                    <div className="flex justify-between">
                      <span>Current Pending Balance:</span>
                      <span className="text-red-500">₹{(selectedCustomer.total_credit - selectedCustomer.total_paid).toLocaleString()}</span>
                    </div>
                    {paymentMethod === 'Udhar' && (
                      <>
                        <div className="flex justify-between text-slate-500 font-semibold">
                          <span>New Bill Amount:</span>
                          <span>+ ₹{totalAmount.toLocaleString()}</span>
                        </div>
                        <div className="border-t border-amber-200/40 my-1"></div>
                        <div className="flex justify-between text-amber-900 font-extrabold text-xs">
                          <span>New Total Outstanding:</span>
                          <span>₹{((selectedCustomer.total_credit - selectedCustomer.total_paid) + totalAmount).toLocaleString()}</span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Payment Mode</label>
            <div className="grid grid-cols-3 gap-1">
              {['Cash', 'UPI', 'Udhar'].map(method => (
                <button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`py-1.5 text-[11px] font-bold rounded-lg transition-all border ${
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
              <div className="mt-2 flex items-center gap-3 bg-indigo-50 rounded-lg p-2 border border-indigo-100 animate-fade-in">
                <img src={qrCodeUrl} alt="UPI QR Code" className="w-12 h-12 object-contain bg-white p-1 rounded-md shadow-sm border border-indigo-50" />
                <p className="text-[11px] font-bold text-indigo-900 leading-tight">Scan to pay<br/>₹{totalAmount}</p>
              </div>
            )}
            {paymentMethod === 'Udhar' && customerMode === 'Walk-in' && (
              <p className="text-[9px] text-red-500 font-bold mt-1 animate-fade-in">
                ⚠️ Select "Existing" or "New" customer for Udhar.
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

      {/* New Customer Modal */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-scale-up border border-slate-100">
            <div className="bg-gradient-to-r from-primary-600 to-indigo-600 p-6 text-white flex-shrink-0">
              <h3 className="text-lg font-black">Add New Customer</h3>
              <p className="text-xs text-primary-100 mt-1">Create a customer profile to record sales & credit (Udhar).</p>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">First Name <span className="text-red-500">*</span></label>
                <input 
                  ref={modalFirstNameInputRef}
                  type="text" 
                  placeholder="Enter first name" 
                  className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:bg-white transition-all shadow-inner ${
                    newCustomerTouched.firstName && newCustomerErrors.firstName ? 'border-red-400 focus:ring-red-400' : 'border-slate-200 focus:ring-primary-500'
                  }`}
                  value={newCustomer.firstName}
                  onChange={e => handleNewCustomerFirstNameChange(e.target.value)}
                  onBlur={handleNewCustomerFirstNameBlur}
                  onKeyDown={handleNewCustomerFirstNameKeyDown}
                />
                {newCustomerTouched.firstName && newCustomerErrors.firstName && (
                  <p className="text-[10px] text-red-500 font-semibold mt-1">{newCustomerErrors.firstName}</p>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Last Name (Optional)</label>
                <input 
                  ref={modalLastNameInputRef}
                  type="text" 
                  placeholder="Enter last name" 
                  className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:bg-white transition-all shadow-inner ${
                    newCustomerTouched.lastName && newCustomerErrors.lastName ? 'border-red-400 focus:ring-red-400' : 'border-slate-200 focus:ring-primary-500'
                  }`}
                  value={newCustomer.lastName}
                  onChange={e => handleNewCustomerLastNameChange(e.target.value)}
                  onBlur={handleNewCustomerLastNameBlur}
                  onKeyDown={handleNewCustomerLastNameKeyDown}
                />
                {newCustomerTouched.lastName && newCustomerErrors.lastName && (
                  <p className="text-[10px] text-red-500 font-semibold mt-1">{newCustomerErrors.lastName}</p>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Phone Number <span className="text-red-500">*</span></label>
                <input 
                  ref={modalPhoneInputRef}
                  type="text" 
                  placeholder="Enter 10-digit mobile number" 
                  className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:bg-white transition-all shadow-inner ${
                    newCustomerTouched.phone && newCustomerErrors.phone ? 'border-red-400 focus:ring-red-400' : 'border-slate-200 focus:ring-primary-500'
                  }`}
                  value={newCustomer.phone}
                  onChange={e => handleNewCustomerPhoneChange(e.target.value)}
                />
                {newCustomerTouched.phone && newCustomerErrors.phone && (
                  <p className="text-[10px] text-red-500 font-semibold mt-1">{newCustomerErrors.phone}</p>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Address (Optional)</label>
                <textarea 
                  placeholder="Enter home/shop address" 
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all shadow-inner resize-none"
                  value={newCustomer.address}
                  onChange={e => setNewCustomer({...newCustomer, address: e.target.value})}
                />
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button 
                onClick={() => {
                  setShowNewCustomerModal(false);
                  setNewCustomer({ firstName: '', lastName: '', phone: '', address: '' });
                  setNewCustomerErrors({ firstName: '', lastName: '', phone: '' });
                  setNewCustomerTouched({ firstName: false, lastName: false, phone: false });
                }}
                className="flex-1 py-3 border border-slate-200 bg-white rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
              >
                Cancel
              </button>
              <button 
                disabled={!isNewCustomerFormValid}
                onClick={async () => {
                  const firstErr = validateFirstName(newCustomer.firstName);
                  if (firstErr) {
                    setNewCustomerErrors(e => ({ ...e, firstName: firstErr }));
                    setNewCustomerTouched(t => ({ ...t, firstName: true }));
                    modalFirstNameInputRef.current?.focus();
                    return;
                  }

                  const lastErr = validateLastName(newCustomer.lastName);
                  if (lastErr) {
                    setNewCustomerErrors(e => ({ ...e, lastName: lastErr }));
                    setNewCustomerTouched(t => ({ ...t, lastName: true }));
                    modalLastNameInputRef.current?.focus();
                    return;
                  }

                  const phoneErr = validatePhone(newCustomer.phone);
                  if (phoneErr) {
                    setNewCustomerErrors(e => ({ ...e, phone: phoneErr }));
                    setNewCustomerTouched(t => ({ ...t, phone: true }));
                    modalPhoneInputRef.current?.focus();
                    return;
                  }

                  const fName = formatName(newCustomer.firstName);
                  const lName = formatName(newCustomer.lastName);

                  try {
                    const cRes = await addCustomer({
                      first_name: fName,
                      last_name: lName,
                      phone: newCustomer.phone.trim(),
                      address: newCustomer.address.trim(),
                    });
                    const savedCustomer = cRes.data.customer || cRes.data;
                    setCustomers(prev => [...prev, savedCustomer]);
                    setSelectedCustomer(savedCustomer);
                    setCustomerMode('Existing');
                    setShowNewCustomerModal(false);
                    setNewCustomer({ firstName: '', lastName: '', phone: '', address: '' });
                    setNewCustomerErrors({ firstName: '', lastName: '', phone: '' });
                    setNewCustomerTouched({ firstName: false, lastName: false, phone: false });
                    toast('Customer added successfully.', 'success');
                  } catch (err) {
                    const backendMsg = err.response?.data?.message || '';
                    if (backendMsg.includes('already exists')) {
                      setNewCustomerErrors(prev => ({ ...prev, phone: "A customer with this mobile number already exists." }));
                      setNewCustomerTouched(prev => ({ ...prev, phone: true }));
                      modalPhoneInputRef.current?.focus();
                    } else {
                      toast(backendMsg || 'Failed to save customer', 'error');
                    }
                  }
                }}
                className="flex-1 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold transition-colors shadow-md shadow-primary-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Customer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
