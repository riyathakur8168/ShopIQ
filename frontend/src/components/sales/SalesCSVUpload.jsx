import { useState } from 'react';
import { uploadSalesCSV } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function SalesCSVUpload({ recentUploads, setRecentUploads, setActiveTab }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewError, setPreviewError] = useState(null);
  const { toast } = useToast();

  const parseCSV = (selectedFile) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n').map(line => line.trim()).filter(line => line !== '');
      
      if (lines.length === 0) {
        setPreviewError('CSV file contains no data.');
        return;
      }
      
      const splitLine = (line) => {
        const re = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
        return line.split(re).map(x => x.replace(/^"|"$/g, '').trim());
      };

      const headers = splitLine(lines[0]).map(h => h.toLowerCase());
      const required = ['product_name', 'quantity', 'unit_price'];
      const missing = required.filter(r => !headers.includes(r));
      
      if (missing.length > 0) {
        setPreviewError(`Missing required column: ${missing.join(', ')}`);
        return;
      }

      const parsedRows = [];
      for (let i = 1; i < Math.min(lines.length, 11); i++) {
        parsedRows.push(splitLine(lines[i]));
      }
      
      setPreviewData({
        headers,
        rows: parsedRows,
        totalRows: lines.length - 1,
        fileSize: (selectedFile.size / 1024).toFixed(1) + ' KB'
      });
      setPreviewError(null);
    };
    reader.readAsText(selectedFile);
  };

  const handleFileChange = (e) => {
    setPreviewData(null);
    setPreviewError(null);
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      parseCSV(selectedFile);
    } else {
      setFile(null);
    }
  };

  const cancelUpload = () => {
    setFile(null);
    setPreviewData(null);
    setPreviewError(null);
  };

  const sampleCSV = `product_name,quantity,unit_price,sale_date,note\nApple,5,20,2023-10-01,Walk-in\nMilk,2,50,2023-10-01,VIP Customer`;

  const downloadSample = () => {
    const blob = new Blob([sampleCSV], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', 'sample_sales.csv');
    a.click();
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
      
      {!file ? (
        <>
          {/* CSV Format Guide */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-6 text-left shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                <span>ℹ️</span> CSV Format Requirements
              </h4>
              <button onClick={downloadSample} className="text-xs bg-white border border-blue-200 text-blue-700 font-bold px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors shadow-sm">
                ⬇️ Download Sample CSV
              </button>
            </div>
            <p className="text-xs text-blue-800 mb-3">Your CSV file <b>must</b> include the following exact column headers:</p>
            <div className="bg-white rounded-lg border border-blue-100 overflow-hidden mb-3 text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-blue-100 text-slate-600">
                  <tr>
                    <th className="p-2 font-semibold">product_name</th>
                    <th className="p-2 font-semibold">quantity</th>
                    <th className="p-2 font-semibold">unit_price</th>
                    <th className="p-2 font-semibold">sale_date</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700">
                  <tr className="border-b border-slate-50">
                    <td className="p-2">Apple</td>
                    <td className="p-2">5</td>
                    <td className="p-2">20</td>
                    <td className="p-2 text-slate-400">2023-10-01 (Optional)</td>
                  </tr>
                  <tr>
                    <td className="p-2">Milk</td>
                    <td className="p-2">2</td>
                    <td className="p-2">50</td>
                    <td className="p-2 text-slate-400">2023-10-01 (Optional)</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <ol className="text-xs text-blue-800 list-decimal list-inside space-y-1 ml-1 opacity-90">
              <li>Download the sample CSV.</li>
              <li>Follow the exact column structure (case-sensitive).</li>
              <li>Upload your file below.</li>
              <li>Analytics will be generated automatically!</li>
            </ol>
          </div>
          
          <label className="border-2 border-dashed border-slate-300 rounded-2xl p-12 hover:border-primary-500 hover:bg-primary-50 transition-colors cursor-pointer group block">
            <input type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
            <p className="text-sm font-semibold text-slate-600 group-hover:text-primary-700">Click to browse or drag file here</p>
            <p className="text-xs text-slate-400 mt-2">Supports .csv (Max 5MB)</p>
          </label>
        </>
      ) : (
        <div className="text-left bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
            <div>
              <h4 className="text-base font-bold text-slate-900">{file.name}</h4>
              <p className="text-xs text-slate-500 mt-1">
                Size: {previewData?.fileSize || '...'} • Rows: {previewData?.totalRows || 0}
              </p>
            </div>
            <button onClick={cancelUpload} className="text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg">
              Change File
            </button>
          </div>

          {previewError ? (
            <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm font-semibold border border-red-100 mb-6 flex items-center gap-2">
              <span className="text-lg">❌</span> {previewError}
            </div>
          ) : !previewData ? (
            <div className="flex justify-center p-8"><span className="spinner"></span></div>
          ) : (
            <div className="mb-6">
              <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Data Preview (First 10 Rows)</h5>
              <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                    <tr>
                      {previewData.headers.map((h, i) => (
                        <th key={i} className="p-3 font-bold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-slate-600 divide-y divide-slate-100">
                    {previewData.rows.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        {row.map((cell, j) => (
                          <td key={j} className="p-3">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button 
              onClick={cancelUpload}
              disabled={uploading}
              className="btn-secondary w-1/3 py-3"
            >
              Cancel
            </button>
            <button 
              onClick={handleUpload} 
              disabled={uploading || !!previewError}
              className="btn-primary w-2/3 py-3 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploading ? (
                <><span className="spinner w-4 h-4 border-2"></span> Processing...</>
              ) : (
                <>Import Data ✨</>
              )}
            </button>
          </div>
        </div>
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
