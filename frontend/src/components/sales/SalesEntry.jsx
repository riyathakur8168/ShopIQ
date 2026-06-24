import { useState, useEffect } from 'react';
import { getProducts, addSale, getSalesAnalytics, getSales, addProduct } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function SalesEntry() {
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
      window.dispatchEvent(new Event('update-notifications'));
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
                    <span>{new Date(s.created_at || s.sale_date).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'})}</span>
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
