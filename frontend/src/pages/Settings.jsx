import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('Profile');
  
  const [profile, setProfile] = useState({
    shopName: user?.shop_name || '',
    ownerName: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.store_address || '',
  });

  const [saving, setSaving] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast('Settings saved successfully!', 'success');
    }, 800);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div>
        <h2 className="page-title">Settings</h2>
        <p className="page-subtitle">Manage your shop profile and preferences</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 flex flex-col gap-1">
          {['Profile', 'Notifications', 'Security', 'Billing Plan'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-semibold rounded-xl text-left transition-colors ${
                activeTab === tab 
                  ? 'bg-primary-50 text-primary-700' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1">
          {activeTab === 'Profile' && (
            <div className="card p-6 shadow-sm border-slate-200 animate-fade-in">
              <h3 className="text-base font-bold text-slate-900 mb-6">Store Information</h3>
              
              <div className="flex items-center gap-6 mb-8">
                <div className="w-20 h-20 rounded-2xl bg-gradient-brand text-white flex items-center justify-center text-2xl font-black shadow-sm">
                  {profile.shopName ? profile.shopName[0].toUpperCase() : 'S'}
                </div>
                <div>
                  <button className="btn-secondary text-xs font-bold shadow-sm">Change Logo</button>
                  <p className="text-xs text-slate-500 mt-2">JPG, PNG under 2MB</p>
                </div>
              </div>

              <form onSubmit={handleSave} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="input-label">Store Name</label>
                    <input className="input" value={profile.shopName} onChange={e => setProfile({...profile, shopName: e.target.value})} required />
                  </div>
                  <div>
                    <label className="input-label">Owner Name</label>
                    <input className="input" value={profile.ownerName} onChange={e => setProfile({...profile, ownerName: e.target.value})} required />
                  </div>
                  <div>
                    <label className="input-label">Email Address</label>
                    <input type="email" className="input bg-slate-50 text-slate-500 cursor-not-allowed" value={profile.email} readOnly />
                  </div>
                  <div>
                    <label className="input-label">Phone Number</label>
                    <input className="input" value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} required />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="input-label">Store Address</label>
                    <textarea className="input min-h-[80px]" value={profile.address} onChange={e => setProfile({...profile, address: e.target.value})} required />
                  </div>
                  
                  {/* Read Only Store Info */}
                  <div className="pt-4 border-t border-slate-100 sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-5 mt-2">
                    <div>
                      <label className="input-label">Store Type</label>
                      <input 
                        className="input bg-slate-50 text-slate-500 border-slate-200 cursor-not-allowed font-medium" 
                        value={user?.store_type || 'Not Set'} 
                        readOnly 
                      />
                      <p className="text-[10px] text-slate-400 mt-1">Store type is permanently locked.</p>
                    </div>
                    <div>
                      <label className="input-label">Business Setup Status</label>
                      <div className="h-[42px] flex items-center">
                        {user?.business_setup_completed ? (
                          <span className="badge badge-success px-3 py-1.5 font-bold">✓ Setup Completed</span>
                        ) : (
                          <span className="badge badge-warning px-3 py-1.5 font-bold">⚠ Pending Setup</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button type="submit" disabled={saving} className="btn-primary px-8 shadow-sm">
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'Notifications' && (
            <div className="card p-6 shadow-sm border-slate-200 animate-fade-in">
              <h3 className="text-base font-bold text-slate-900 mb-6">Notification Preferences</h3>
              <div className="space-y-4">
                {[
                  { title: 'Low Stock Alerts', desc: 'Get notified when items drop below threshold', id: 'n1' },
                  { title: 'Daily Sales Report', desc: 'Receive a summary of sales every evening', id: 'n2' },
                  { title: 'Customer Payment Reminders', desc: 'Auto-send WhatsApp reminders for pending udhar', id: 'n3' },
                ].map(n => (
                  <div key={n.id} className="flex items-start justify-between p-4 border border-slate-200 rounded-xl hover:border-primary-300 transition-colors">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{n.title}</p>
                      <p className="text-xs text-slate-500 mt-1">{n.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer mt-1">
                      <input type="checkbox" className="sr-only peer" defaultChecked={true} />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'Security' && (
            <div className="card p-6 shadow-sm border-slate-200 animate-fade-in">
              <h3 className="text-base font-bold text-slate-900 mb-6">Security Settings</h3>
              <form onSubmit={handleSave} className="space-y-4 max-w-sm">
                <div>
                  <label className="input-label">Current Password</label>
                  <input type="password" className="input" placeholder="••••••••" />
                </div>
                <div>
                  <label className="input-label">New Password</label>
                  <input type="password" className="input" placeholder="••••••••" />
                </div>
                <div>
                  <label className="input-label">Confirm New Password</label>
                  <input type="password" className="input" placeholder="••••••••" />
                </div>
                <div className="pt-4">
                  <button type="submit" disabled={saving} className="btn-primary shadow-sm w-full">
                    Update Password
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'Billing Plan' && (
            <div className="card p-6 shadow-sm border-slate-200 animate-fade-in text-center py-12">
              <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">💎</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">ShopIQ Pro Plan</h3>
              <p className="text-sm text-slate-500 mb-6">You are currently on the free trial. Upgrade to Pro for unlimited invoices and AI insights.</p>
              <button className="btn-primary px-8 shadow-md hover:shadow-lg transition-shadow">
                Upgrade to Pro
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
