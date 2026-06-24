import { useState } from 'react';
import { uploadSalesCSV } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function SalesCSVUpload({ recentUploads, setRecentUploads, setActiveTab }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadSalesCSV(file);
      toast(res.data.message, 'success');
      if (res.data.errors && res.data.errors.length > 0) {
        res.data.errors.forEach(err => toast(err, 'error'));
      }
      setRecentUploads(prev => [{ name: file.name, date: new Date().toLocaleString(), success: res.data.success_count }, ...prev]);
      setFile(null);
      setActiveTab('Analytics');
      window.dispatchEvent(new Event('update-notifications'));
    } catch (err) {
      toast(err.response?.data?.message || 'Upload failed', 'error');
      if (err.response?.data?.errors && err.response.data.errors.length > 0) {
        err.response.data.errors.forEach(e => toast(e, 'error'));
      }
      
      // Even if it failed completely, record it in the history so the user knows an attempt was made
      setRecentUploads(prev => [{ name: file?.name || 'Unknown', date: new Date().toLocaleString(), success: 0, failed: true }, ...prev]);
      setFile(null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="card p-8 text-center animate-fade-in max-w-2xl mx-auto mt-8">
      <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-2">Upload Bulk Sales (CSV)</h3>
      <p className="text-sm text-slate-500 mb-6">Drag and drop your POS export file here to sync offline sales.</p>
      
      <label className="border-2 border-dashed border-slate-300 rounded-2xl p-12 hover:border-primary-500 hover:bg-primary-50 transition-colors cursor-pointer group block">
        <input type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
        {file ? (
          <p className="text-sm font-semibold text-primary-700">{file.name}</p>
        ) : (
          <p className="text-sm font-semibold text-slate-600 group-hover:text-primary-700">Click to browse or drag file here</p>
        )}
        <p className="text-xs text-slate-400 mt-2">Supports .csv (Max 5MB)</p>
      </label>
      
      {file && (
        <button 
          onClick={handleUpload} 
          disabled={uploading}
          className="btn-primary w-full mt-4 py-3 disabled:opacity-60"
        >
          {uploading ? 'Uploading...' : 'Process Upload'}
        </button>
      )}
      
      <div className="mt-8 text-left">
        <h4 className="text-sm font-semibold text-slate-900 mb-3">Recent Uploads</h4>
        {recentUploads.length === 0 ? (
          <div className="text-sm text-slate-500 border border-slate-200 rounded-lg p-4 bg-slate-50 text-center">
            No recent uploads found.
          </div>
        ) : (
          <div className="space-y-2">
            {recentUploads.map((u, i) => (
              <div key={i} className={`flex justify-between items-center text-sm p-3 border rounded-lg ${u.failed ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-slate-50'}`}>
                <div>
                  <span className={`font-semibold ${u.failed ? 'text-red-800' : 'text-slate-800'}`}>{u.name}</span>
                  <div className={`${u.failed ? 'text-red-500' : 'text-slate-500'} text-xs mt-1`}>
                    {u.failed ? 'Upload completely failed' : `${u.success} rows imported`} • {u.date}
                  </div>
                </div>
                {!u.failed && (
                  <button 
                    onClick={() => setActiveTab('Analytics')} 
                    className="text-primary-600 text-xs font-semibold hover:text-primary-800 transition-colors bg-primary-50 px-3 py-1.5 rounded-md hover:bg-primary-100"
                  >
                    View Analysis →
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
