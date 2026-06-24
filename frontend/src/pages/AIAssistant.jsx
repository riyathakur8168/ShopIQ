import { useState, useRef, useEffect } from 'react';
import { getSalesAnalytics, getProducts, getCustomers } from '../services/api';

const BOT_AVATAR = <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center text-white font-black text-xs flex-shrink-0 shadow-sm">AI</div>;

const SUGGESTIONS = [
  "What's my best-selling product?",
  "Which products need reorder?",
  "How were sales this week?",
  "Who has pending udhar?",
  "What's today's revenue?",
  "Show me a business summary",
];

export default function AIAssistant() {
  const [messages, setMessages] = useState([{
    from: 'bot',
    text: "**Namaste! 👋 I'm your ShopIQ AI Assistant.**\n\nI can answer questions about your sales, inventory, and customer credits. What would you like to know?",
    time: new Date()
  }]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    getSalesAnalytics().then(r => setAnalytics(r.data)).catch(err => console.error(err));
    getProducts().then(r => setProducts(r.data)).catch(err => console.error(err));
    getCustomers().then(r => setCustomers(r.data)).catch(err => console.error(err));
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, typing]);

  const getBotReply = (msg) => {
    const m = msg.toLowerCase();

    if (m.includes('best') || m.includes('top product')) {
      if (analytics?.top_products?.length > 0) {
        const top = analytics.top_products[0];
        return `**📊 Best-Selling Product: ${top.name}**\n\nWith ₹${top.revenue.toLocaleString()} in revenue and ${top.qty} units sold.\n\n**Top 5 Products:**\n${analytics.top_products.map((p, i) => `${i + 1}. ${p.name} — ₹${p.revenue.toLocaleString()}`).join('\n')}`;
      }
      return "I don't have enough sales data yet. Record some sales first!";
    }

    if (m.includes('reorder') || m.includes('stock') || m.includes('low')) {
      const low = products.filter(p => p.is_low_stock);
      if (low.length === 0) return '✅ All products are well-stocked! No reorders needed right now.';
      return `**⚠️ ${low.length} Products Need Reorder:**\n\n${low.map(p => `• **${p.name}** — Only ${p.stock_quantity} units left (threshold: ${p.low_stock_threshold})`).join('\n')}\n\nI recommend ordering at least 50 units of each immediately.`;
    }

    if (m.includes('week') || m.includes('sales') || m.includes('revenue')) {
      if (!analytics) return 'Loading sales data...';
      const total = analytics.chart_data?.reduce((s, d) => s + d.revenue, 0) || 0;
      const best = analytics.chart_data?.reduce((a, b) => b.revenue > a.revenue ? b : a, { day: '?', revenue: 0 });
      return `**📈 Weekly Sales Summary:**\n\n• Total Revenue: **₹${total.toLocaleString()}**\n• Total Transactions: **${analytics.monthly.count}** this month\n• Best Day: **${best.day}** with ₹${best.revenue.toLocaleString()}\n\nYour monthly revenue is ₹${analytics.monthly.revenue.toLocaleString()}.`;
    }

    if (m.includes('udhar') || m.includes('credit') || m.includes('pending') || m.includes('customer')) {
      const pending = customers.filter(c => c.balance > 0);
      const totalPending = pending.reduce((s, c) => s + c.balance, 0);
      if (pending.length === 0) return '✅ No pending udhar! All customers have cleared their balances.';
      return `**💳 Pending Udhar:**\n\n• ${pending.length} customers owe you money\n• Total Pending: **₹${totalPending.toLocaleString()}**\n\n${pending.map(c => `• **${c.name}** — ₹${c.balance} pending`).join('\n')}\n\nConsider sending payment reminders!`;
    }

    if (m.includes("today") || m.includes('today revenue')) {
      if (!analytics) return 'Loading...';
      return `**💰 Today's Performance:**\n\n• Revenue: **₹${analytics.today.revenue.toLocaleString()}**\n• Transactions: **${analytics.today.count}**\n\nMonthly Revenue: ₹${analytics.monthly.revenue.toLocaleString()}`;
    }

    if (m.includes('summary') || m.includes('overview')) {
      if (!analytics) return 'Loading your data...';
      const lowCount = products.filter(p => p.is_low_stock).length;
      const pendingCustomers = customers.filter(c => c.balance > 0).length;
      return `**📊 Business Summary:**\n\n**Sales:**\n• Today's Revenue: ₹${analytics.today.revenue.toLocaleString()}\n• Monthly Revenue: ₹${analytics.monthly.revenue.toLocaleString()}\n\n**Inventory:**\n• Total Products: ${products.length}\n• Low Stock Items: ${lowCount}\n\n**Udhar:**\n• Pending Customers: ${pendingCustomers}\n\n${lowCount > 0 ? `⚠️ Action needed: ${lowCount} products need reorder!` : '✅ All stock levels are good!'}`;
    }

    return "I can answer questions about your **sales, inventory, udhar**, and more. Try asking:\n\n• What's my best-selling product?\n• Which products need reorder?\n• How were sales this week?\n• Who has pending udhar?";
  };

  /**
   * SEC-4: Safe text renderer — converts **bold** markers to <strong> React elements
   * WITHOUT using dangerouslySetInnerHTML. User input is never treated as HTML.
   */
  const renderText = (text) => {
    return text.split('\n').map((line, lineIdx) => {
      // Split on **...** pattern and alternate between plain and bold
      const parts = line.split(/\*\*(.*?)\*\*/g);
      const nodes = parts.map((part, i) =>
        i % 2 === 1
          ? <strong key={i} className="font-bold text-slate-900">{part}</strong>
          : part
      );
      return (
        <p key={lineIdx} className="mb-1 last:mb-0">
          {nodes.length > 0 ? nodes : <>&nbsp;</>}
        </p>
      );
    });
  };

  const send = (text) => {
    const msg = text || input.trim();
    if (!msg) return;
    setMessages(prev => [...prev, { from: 'user', text: msg, time: new Date() }]);
    setInput('');
    setTyping(true);
    setTimeout(() => {
      setMessages(prev => [...prev, { from: 'bot', text: getBotReply(msg), time: new Date() }]);
      setTyping(false);
    }, 800 + Math.random() * 600);
  };

  return (
    <div className="space-y-4 animate-fade-in h-full flex flex-col" style={{ height: 'calc(100vh - 160px)' }}>
      <div className="flex items-center justify-between">
        <div><h2 className="page-title">AI Assistant</h2><p className="page-subtitle">Ask anything about your business</p></div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full shadow-sm">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-green-700 font-bold">AI Online</span>
        </div>
      </div>

      {/* Suggestions */}
      <div className="flex gap-2 flex-wrap">
        {SUGGESTIONS.map(s => (
          <button key={s} onClick={() => send(s)}
            className="text-xs bg-white border border-slate-200 text-slate-600 font-medium hover:text-primary-700 hover:border-primary-300 hover:bg-primary-50 shadow-sm px-4 py-2 rounded-full transition-all duration-200">
            {s}
          </button>
        ))}
      </div>

      {/* Chat */}
      <div className="card flex-1 flex flex-col overflow-hidden shadow-sm border-slate-200">
        <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-slate-50/50">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.from === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
              {msg.from === 'bot' && BOT_AVATAR}
              <div className={`max-w-[75%] rounded-2xl px-5 py-4 text-sm leading-relaxed shadow-sm ${
                msg.from === 'user'
                  ? 'bg-primary-600 text-white rounded-br-sm shadow-primary-500/20'
                  : 'bg-white text-slate-700 rounded-bl-sm border border-slate-200'
              }`}>
                {renderText(msg.text)}
                <p className={`text-[10px] mt-2 font-medium ${msg.from === 'user' ? 'text-primary-200' : 'text-slate-400'}`}>
                  {msg.time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          {typing && (
            <div className="flex gap-3 animate-fade-in">
              {BOT_AVATAR}
              <div className="bg-white border border-slate-200 px-5 py-4 rounded-2xl rounded-bl-sm shadow-sm">
                <div className="flex gap-1.5 items-center h-4">
                  {[0, 150, 300].map(d => (
                    <span key={d} className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-200 flex gap-3 bg-white">
          <input
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
            className="input flex-1 bg-slate-50 border-slate-200 focus:bg-white"
            placeholder="Ask anything... e.g. What is my best-selling product?"
          />
          <button onClick={() => send()} className="btn-primary px-6 shadow-md">Send →</button>
        </div>
      </div>
    </div>
  );
}
