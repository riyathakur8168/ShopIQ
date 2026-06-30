import { useState, useEffect, useRef } from 'react';
import { getProducts, addProduct, updateProduct, deleteProduct, uploadOCRImage, getCategories, addCategory, renameCategory, deleteCategory } from '../services/api';
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
        {['Products', 'Stock', 'OCR Import', 'Categories'].map(tab => (
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
        {activeTab === 'Categories' && <CategoriesTab />}
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

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getProducts({ page, per_page: 20, search, category: catFilter });
      if (res.data.items) {
        setFiltered(res.data.items);
        setProducts(res.data.items);
        setTotalPages(res.data.pages);
      } else {
        setFiltered(res.data);
        setProducts(res.data);
      }
    } catch { toast('Failed to load products', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const timer = setTimeout(() => { load(); }, 300);
    return () => clearTimeout(timer);
  }, [page, search, catFilter]);

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
      window.dispatchEvent(new Event('update-notifications'));
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to save product', 'error');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return;
    try { 
      await deleteProduct(id); 
      toast('Product deleted', 'success'); 
      load(); 
      window.dispatchEvent(new Event('update-notifications'));
    }
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
        <button className="btn-primary shadow-sm" onClick={() => { 
          setShowForm(!showForm); 
          setEditProduct(null); 
          setForm({ ...EMPTY_FORM, category: catFilter !== 'All' ? catFilter : '' }); 
        }}>
          {showForm ? 'Close Form' : '+ Add Product'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card p-6 animate-fade-in shadow-md border-primary-100 bg-primary-50/30">
          <h3 className="text-sm font-bold text-slate-900 mb-5">{editProduct ? 'Edit Product' : 'Add New Product'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="input-label">Product Name</label>
              <input required type="text" value={form.name || ''} placeholder="e.g. Amul Milk"
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} className="input bg-white border-slate-200" />
            </div>
            <div>
              <label className="input-label">Category</label>
              <input required type="text" value={form.category || ''} placeholder="e.g. Dairy"
                onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))} className="input bg-white border-slate-200" />
            </div>
            <div>
              <label className="input-label">Stock Qty</label>
              <input required type="number" value={form.stock_quantity ?? ''} placeholder="50"
                onChange={e => setForm(prev => ({ ...prev, stock_quantity: e.target.value }))} className="input bg-white border-slate-200" />
            </div>
            <div>
              <label className="input-label">Low Stock Alert At</label>
              <input type="number" value={form.low_stock_threshold ?? ''} placeholder="10"
                onChange={e => setForm(prev => ({ ...prev, low_stock_threshold: e.target.value }))} className="input bg-white border-slate-200" />
            </div>
            <div></div> {/* Empty column spacer */}
            <div>
              <label className="input-label">Buy Price (₹)</label>
              <input required type="number" value={form.buy_price ?? ''} placeholder="52"
                onChange={e => setForm(prev => ({ ...prev, buy_price: e.target.value }))} className="input bg-white border-slate-200" />
            </div>
            <div>
              <label className="input-label">Sell Price (₹)</label>
              <input required type="number" value={form.sell_price ?? ''} placeholder="60"
                onChange={e => setForm(prev => ({ ...prev, sell_price: e.target.value }))} className="input bg-white border-slate-200" />
            </div>

            {(Boolean(form.buy_price) && Boolean(form.sell_price) && Number(form.buy_price) > 0) ? (
              <div className="md:col-span-3 text-xs text-green-600 font-bold bg-green-50 p-2 rounded-lg border border-green-100">
                Profit Margin: {((Number(form.sell_price) - Number(form.buy_price)) / Number(form.buy_price) * 100).toFixed(1)}%
              </div>
            ) : null}
            
            <div className="md:col-span-3 flex gap-3 pt-2">
              <button type="submit" disabled={submitting} className="btn-primary">{submitting ? 'Saving...' : editProduct ? 'Update Product' : 'Add Product'}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditProduct(null); }} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <input className="input max-w-xs border-slate-200" placeholder="🔍 Search products..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        <div className="flex gap-2">
          {categories.map(c => (
            <button key={c} onClick={() => { setCatFilter(c); setPage(1); }}
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
  const [loading, setLoading] = useState(false);
  const [extractedItems, setExtractedItems] = useState([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      const res = await uploadOCRImage(file);
      setExtractedItems(res.data.extracted_items || []);
      toast('Image scanned successfully!', 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to scan image', 'error');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirm = async () => {
    setImporting(true);
    let successCount = 0;
    try {
      for (const item of extractedItems) {
        await addProduct(item);
        successCount++;
      }
      toast(`Successfully imported ${successCount} products!`, 'success');
      setExtractedItems([]);
      window.dispatchEvent(new Event('update-notifications'));
    } catch (err) {
      toast(`Import stopped. Failed to add an item.`, 'error');
    } finally {
      setImporting(false);
    }
  };

  if (extractedItems.length > 0) {
    return (
      <div className="card p-6 animate-fade-in mt-4">
        <h3 className="section-title mb-4">Review Scanned Items</h3>
        <p className="text-sm text-slate-500 mb-6">Please review the extracted data. You can edit the values below before confirming the import.</p>
        
        <div className="table-container mb-6">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Product Name</th>
                <th className="table-header">Buy ₹</th>
                <th className="table-header">Sell ₹</th>
                <th className="table-header">Qty</th>
                <th className="table-header"></th>
              </tr>
            </thead>
            <tbody>
              {extractedItems.map((item, idx) => (
                <tr key={idx} className="table-row">
                  <td className="table-cell">
                    <input type="text" className="input bg-white py-1" value={item.name} onChange={(e) => {
                      const newItems = [...extractedItems];
                      newItems[idx].name = e.target.value;
                      setExtractedItems(newItems);
                    }} />
                  </td>
                  <td className="table-cell">
                    <input type="number" className="input bg-white w-20 py-1" value={item.buy_price} onChange={(e) => {
                      const newItems = [...extractedItems];
                      newItems[idx].buy_price = e.target.value;
                      setExtractedItems(newItems);
                    }} />
                  </td>
                  <td className="table-cell">
                    <input type="number" className="input bg-white w-20 py-1" value={item.sell_price} onChange={(e) => {
                      const newItems = [...extractedItems];
                      newItems[idx].sell_price = e.target.value;
                      setExtractedItems(newItems);
                    }} />
                  </td>
                  <td className="table-cell">
                    <input type="number" className="input bg-white w-20 py-1" value={item.stock_quantity} onChange={(e) => {
                      const newItems = [...extractedItems];
                      newItems[idx].stock_quantity = e.target.value;
                      setExtractedItems(newItems);
                    }} />
                  </td>
                  <td className="table-cell">
                    <button onClick={() => setExtractedItems(extractedItems.filter((_, i) => i !== idx))} className="text-xs text-red-600 font-bold hover:underline">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-4">
          <button onClick={() => setExtractedItems([])} className="btn-secondary" disabled={importing}>Cancel</button>
          <button onClick={handleConfirm} className="btn-primary" disabled={importing}>
            {importing ? 'Importing...' : 'Confirm & Import to Inventory'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-8 text-center animate-fade-in max-w-2xl mx-auto mt-8">
      <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-2">Automated Data Entry (OCR)</h3>
      <p className="text-sm text-slate-500 mb-6">Upload a photo of a vendor bill or stock register, and ShopIQ will extract the products and quantities automatically.</p>
      
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleUpload} />
      
      <div 
        onClick={() => !loading && fileInputRef.current?.click()}
        className={`border-2 border-dashed border-slate-300 rounded-2xl p-12 transition-colors ${loading ? 'bg-slate-50 opacity-50 cursor-wait' : 'hover:border-primary-500 hover:bg-primary-50 cursor-pointer group'}`}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center">
            <span className="spinner mb-4" />
            <p className="text-sm font-semibold text-slate-600">Scanning document...</p>
          </div>
        ) : (
          <>
            <p className="text-sm font-semibold text-slate-600 group-hover:text-primary-700">Click to capture or upload image</p>
            <p className="text-xs text-slate-400 mt-2">Supports JPG, PNG (Max 10MB)</p>
          </>
        )}
      </div>
    </div>
  );
}


function CategoriesTab() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editCategory, setEditCategory] = useState(null);
  const [editName, setEditName] = useState('');
  
  const { toast } = useToast();

  const loadCategories = async () => {
    setLoading(true);
    try {
      const res = await getCategories();
      setCategories(res.data || []);
    } catch {
      toast('Failed to load categories', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    setSubmitting(true);
    try {
      await addCategory({ name: newCategoryName.trim() });
      toast('Category added successfully!', 'success');
      setNewCategoryName('');
      loadCategories();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to add category', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRename = async (e) => {
    e.preventDefault();
    if (!editName.trim() || !editCategory) return;
    setSubmitting(true);
    try {
      await renameCategory(editCategory.id, { name: editName.trim() });
      toast('Category renamed successfully!', 'success');
      setEditCategory(null);
      setEditName('');
      loadCategories();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to rename category', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (name.toLowerCase() === 'general') {
      return toast('Cannot delete General category', 'error');
    }
    if (!confirm(`Delete category "${name}"? Products in this category will be remapped to "General".`)) {
      return;
    }
    try {
      await deleteCategory(id);
      toast('Category deleted successfully', 'success');
      loadCategories();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to delete category', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Side: Create / Edit Form */}
        <div className="md:col-span-1 space-y-4">
          <div className="card p-5 bg-white border border-slate-200 shadow-sm rounded-2xl">
            <h4 className="text-sm font-bold text-slate-800 mb-4">
              {editCategory ? 'Rename Category' : 'Create Category'}
            </h4>
            
            {editCategory ? (
              <form onSubmit={handleRename} className="space-y-3">
                <div>
                  <label className="input-label text-[10px] uppercase font-bold text-slate-400">Current Name: {editCategory.name}</label>
                  <input
                    required
                    type="text"
                    className="input border-slate-200 w-full"
                    placeholder="Enter new name"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={submitting} className="btn-primary py-2 text-xs flex-1">
                    {submitting ? 'Saving...' : 'Rename'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditCategory(null); setEditName(''); }}
                    className="btn-secondary py-2 text-xs flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAdd} className="space-y-3">
                <div>
                  <label className="input-label text-[10px] uppercase font-bold text-slate-400">Category Name</label>
                  <input
                    required
                    type="text"
                    className="input border-slate-200 w-full"
                    placeholder="e.g. Dairy"
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                  />
                </div>
                <button type="submit" disabled={submitting} className="btn-primary py-2 text-xs w-full">
                  {submitting ? 'Creating...' : 'Create Category'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right Side: List of Categories */}
        <div className="md:col-span-2">
          <div className="card p-5 bg-white border border-slate-200 shadow-sm rounded-2xl">
            <h4 className="text-sm font-bold text-slate-800 mb-4">Available Categories</h4>
            
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <span className="spinner border-primary-500 w-6 h-6"></span>
              </div>
            ) : categories.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center font-medium">No custom categories configured.</p>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto pr-1">
                {categories.map(cat => (
                  <div key={cat.id} className="flex justify-between items-center py-3">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{cat.name}</p>
                      {cat.name.toLowerCase() === 'general' && (
                        <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">System Default</p>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setEditCategory(cat); setEditName(cat.name); }}
                        className="text-xs font-bold text-primary-600 hover:text-primary-700 bg-primary-50 px-2.5 py-1 rounded-md"
                      >
                        Rename
                      </button>
                      <button
                        disabled={cat.name.toLowerCase() === 'general'}
                        onClick={() => handleDelete(cat.id, cat.name)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-md transition-colors ${
                          cat.name.toLowerCase() === 'general'
                            ? 'text-slate-300 bg-slate-100 cursor-not-allowed'
                            : 'text-red-600 hover:text-red-700 bg-red-50'
                        }`}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
