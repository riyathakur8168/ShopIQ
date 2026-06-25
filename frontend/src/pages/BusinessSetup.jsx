import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { setupBusiness } from '../services/api';

const STORE_TYPES = [
  { id: 'Grocery Store', name: 'Grocery Store', icon: '🛒' },
  { id: 'Department Store', name: 'Department Store', icon: '🏢' },
  { id: 'Clothing Store', name: 'Clothing Store', icon: '👕' },
  { id: 'Electronics Store', name: 'Electronics Store', icon: '💻' },
  { id: 'Pharmacy', name: 'Pharmacy', icon: '💊' },
  { id: 'Hardware Store', name: 'Hardware Store', icon: '🔧' },
  { id: 'Stationery Store', name: 'Stationery Store', icon: '📝' },
  { id: 'Cosmetics Store', name: 'Cosmetics Store', icon: '💄' },
  { id: 'Other', name: 'Other', icon: '🏪' }
];

export default function BusinessSetup() {
  const [storeName, setStoreName] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [loading, setLoading] = useState(false);

  const { updateUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!storeName.trim()) return toast('Store name is required', 'error');
    if (!selectedType) return toast('Please select a store type', 'error');

    setLoading(true);
    try {
      const res = await setupBusiness({
        store_name: storeName.trim(),
        store_address: storeAddress.trim(),
        gst_number: gstNumber.trim(),
        store_type: selectedType
      });
      
      updateUser(res.data.user);
      toast('Store configuration setup successfully!', 'success');
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      toast(err.response?.data?.message || 'Failed to complete setup. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 md:p-8 font-sans">
      <div className="w-full max-w-2xl bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm animate-fade-in">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-extrabold text-xs shadow-sm">
              SQ
            </div>
            <span className="text-lg font-black text-slate-900 tracking-tight">ShopIQ</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Setup Your Retail Business</h2>
          <p className="text-sm font-semibold text-slate-500 mt-1">Configure your store profiles to bootstrap default product categories.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Store Name & GST Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Store Name *</label>
              <input 
                type="text" 
                required
                placeholder="Enter store/shop name" 
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-inner"
                value={storeName}
                onChange={e => setStoreName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">GST Number (Optional)</label>
              <input 
                type="text" 
                placeholder="22AAAAA0000A1Z5" 
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-inner"
                value={gstNumber}
                onChange={e => setGstNumber(e.target.value)}
              />
            </div>
          </div>

          {/* Store Address */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Store Address</label>
            <textarea 
              rows={2}
              placeholder="Enter building number, street name, and city" 
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-inner resize-none"
              value={storeAddress}
              onChange={e => setStoreAddress(e.target.value)}
            />
          </div>

          {/* Store Type Cards */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Select Store Type *</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {STORE_TYPES.map(type => {
                const isSelected = selectedType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setSelectedType(type.id)}
                    className={`p-4 rounded-2xl flex flex-col items-center justify-center text-center transition-all border-2
                      ${isSelected 
                        ? 'border-blue-600 bg-blue-50/20 text-blue-900 shadow-sm' 
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 bg-white text-slate-700'
                      }`}
                  >
                    <span className="text-2xl mb-1.5 select-none">{type.icon}</span>
                    <span className="text-xs font-bold leading-tight">{type.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <span className="spinner w-4 h-4 border-2 border-white border-t-transparent"></span>
                  <span>Configuring Shop...</span>
                </div>
              ) : (
                'Complete Business Setup →'
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
