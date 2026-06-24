import { useState } from 'react';
import { getSales, getProducts } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function SalesReports() {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);

  const generateReport = async (type) => {
    setGenerating(true);
    try {
      let content = '';
      if (type === 'weekly' || type === 'monthly') {
        const days = type === 'weekly' ? 7 : 30;
        const d = new Date();
        d.setDate(d.getDate() - days);
        const startDate = d.toISOString().split('T')[0];
        
        const res = await getSales({ per_page: 1000, start_date: startDate });
        const sales = res.data.sales || [];
        
        const totalRev = sales.reduce((sum, s) => sum + s.total_amount, 0);
        
        content = `
          <h2>${type === 'weekly' ? 'Weekly' : 'Monthly'} Sales Report</h2>
          <p><strong>Generated on:</strong> ${new Date().toLocaleDateString()}</p>
          <p><strong>Total Revenue:</strong> ₹${totalRev.toLocaleString()}</p>
          <p><strong>Total Transactions:</strong> ${sales.length}</p>
          <hr/>
          <table>
            <thead>
              <tr><th>Date</th><th>Product</th><th>Qty</th><th>Total</th></tr>
            </thead>
            <tbody>
              ${sales.map(s => `<tr><td>${s.sale_date}</td><td>${s.product_name}</td><td>${s.quantity}</td><td>₹${s.total_amount}</td></tr>`).join('')}
            </tbody>
          </table>
        `;
      } else if (type === 'inventory') {
        const res = await getProducts();
        const products = res.data || [];
        
        const totalVal = products.reduce((sum, p) => sum + (p.buy_price * p.stock_quantity), 0);
        
        content = `
          <h2>Inventory Valuation Report</h2>
          <p><strong>Generated on:</strong> ${new Date().toLocaleDateString()}</p>
          <p><strong>Total Inventory Value:</strong> ₹${totalVal.toLocaleString()}</p>
          <hr/>
          <table>
            <thead>
              <tr><th>Product</th><th>Stock</th><th>Buy Price</th><th>Total Value</th></tr>
            </thead>
            <tbody>
              ${products.map(p => `<tr><td>${p.name}</td><td>${p.stock_quantity}</td><td>₹${p.buy_price}</td><td>₹${(p.buy_price * p.stock_quantity).toFixed(2)}</td></tr>`).join('')}
            </tbody>
          </table>
        `;
      }
      
      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
          <head>
            <title>ShopIQ Report - ${type}</title>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; }
              h2 { color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; }
              th, td { border: 1px solid #cbd5e1; padding: 12px; text-align: left; }
              th { background-color: #f8fafc; font-weight: 600; color: #334155; }
              tr:nth-child(even) { background-color: #f8fafc; }
              hr { border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0; }
            </style>
          </head>
          <body>${content}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
      
    } catch (err) {
      toast('Failed to generate report', 'error');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="card animate-fade-in max-w-4xl mx-auto mt-4">
      <div className="section-header">
        <h3 className="section-title">Generate Reports</h3>
      </div>
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div onClick={() => !generating && generateReport('weekly')} className="border border-slate-200 rounded-xl p-5 hover:border-primary-500 cursor-pointer transition-colors bg-white hover:shadow-md">
            <div className="w-10 h-10 bg-primary-100 text-primary-700 rounded-lg flex items-center justify-center mb-3">📅</div>
            <h4 className="font-semibold text-slate-900 mb-1">Weekly Summary</h4>
            <p className="text-xs text-slate-500">Sales, revenue, and top products for the past 7 days.</p>
            <button disabled={generating} className="text-sm text-primary-600 font-semibold mt-4 disabled:opacity-50">Export PDF →</button>
          </div>
          <div onClick={() => !generating && generateReport('monthly')} className="border border-slate-200 rounded-xl p-5 hover:border-primary-500 cursor-pointer transition-colors bg-white hover:shadow-md">
            <div className="w-10 h-10 bg-green-100 text-green-700 rounded-lg flex items-center justify-center mb-3">📈</div>
            <h4 className="font-semibold text-slate-900 mb-1">Monthly Report</h4>
            <p className="text-xs text-slate-500">Comprehensive overview of the entire month's performance.</p>
            <button disabled={generating} className="text-sm text-primary-600 font-semibold mt-4 disabled:opacity-50">Export PDF →</button>
          </div>
          <div onClick={() => !generating && generateReport('inventory')} className="border border-slate-200 rounded-xl p-5 hover:border-primary-500 cursor-pointer transition-colors bg-white hover:shadow-md">
            <div className="w-10 h-10 bg-orange-100 text-orange-700 rounded-lg flex items-center justify-center mb-3">📦</div>
            <h4 className="font-semibold text-slate-900 mb-1">Inventory Value</h4>
            <p className="text-xs text-slate-500">Current valuation of all stock based on buy/sell prices.</p>
            <button disabled={generating} className="text-sm text-primary-600 font-semibold mt-4 disabled:opacity-50">Export PDF →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
