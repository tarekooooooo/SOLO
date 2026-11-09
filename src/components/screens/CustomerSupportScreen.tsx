import React, { useState } from 'react';
import { 
  Headphones, 
  MessageSquare, 
  Send, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  User, 
  Plus, 
  Search, 
  ChevronRight, 
  ShieldCheck,
  ShoppingBag,
  Sparkles
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { SupportTicket } from '../../types';

export const CustomerSupportScreen: React.FC = () => {
  const { 
    supportTickets, 
    sendTicketReply, 
    updateTicketStatus, 
    createCustomerTicket, 
    orders, 
    userRole,
    assistants,
    assignTicket,
    showToast 
  } = useStore();

  const [selectedTicketId, setSelectedTicketId] = useState<string>(supportTickets[0]?.id || '');
  const [replyText, setReplyText] = useState('');
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);

  // New ticket state
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newCustName, setNewCustName] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [relatedOrderId, setRelatedOrderId] = useState('');

  const currentTicket = supportTickets.find((t) => t.id === selectedTicketId) || supportTickets[0];

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !currentTicket) return;

    const isAdminOrAssistant = userRole === 'admin' || userRole === 'merchant';
    const senderName = isAdminOrAssistant ? 'فريق SOLO' : currentTicket.customerName;

    sendTicketReply(currentTicket.id, replyText, senderName, isAdminOrAssistant);
    setReplyText('');
  };

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newMessage.trim()) return;

    createCustomerTicket({
      customerName: newCustName,
      customerEmail: newCustEmail,
      subject: newSubject,
      message: newMessage,
      relatedOrderId: relatedOrderId || undefined,
    });

    setShowNewTicketForm(false);
    setNewSubject('');
    setNewMessage('');
  };

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-950 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white">مركز مساعدة SOLO — قيد الإعداد</h2>
              <span className="px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 text-[11px] font-bold">
                غير متصل
              </span>
            </div>
            <p className="text-xs text-slate-400">
              نظام التذاكر غير موصول بالخادم. لا ترسل بيانات شخصية هنا؛ لن يتم حفظ أي طلب دعم.
            </p>
          </div>
        </div>

        <button
          disabled
          className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-500 font-bold text-xs flex items-center gap-1.5 cursor-not-allowed self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>فتح تذكرة — غير متاح</span>
        </button>
      </div>

      {/* New Ticket Form */}
      {showNewTicketForm && (
        <form onSubmit={handleCreateTicket} className="p-6 rounded-3xl bg-[#0f1523] border border-cyan-500/30 space-y-4 shadow-xl text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-cyan-400" />
              إنشاء تذكرة دعم واستفسار جديدة
            </h3>
            <span className="text-[11px] text-amber-300">لن تُرسل التذكرة حتى ربط نظام الدعم بالخادم</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">اسم العميل:</label>
              <input
                type="text"
                required
                value={newCustName}
                onChange={(e) => setNewCustName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="text-slate-300 font-semibold block mb-1">البريد الإلكتروني:</label>
              <input
                type="email"
                required
                value={newCustEmail}
                onChange={(e) => setNewCustEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">عنوان الاستفسار أو المشكلة:</label>
              <input
                type="text"
                required
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="مثال: استفسار عن حالة شحن PUBG 600 UC"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="text-slate-300 font-semibold block mb-1">رقم الطلب المرتبط (اختياري):</label>
              <select
                value={relatedOrderId}
                onChange={(e) => setRelatedOrderId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono"
              >
                <option value="">بدون طلب محدد</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.orderNumber}>
                    {o.orderNumber} - {o.productName} ({o.packageName})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">تفاصيل الرسالة:</label>
            <textarea
              rows={3}
              required
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="اكتب استفسارك بالتفصيل وسيقوم فريق الدعم بمساعدتك فوراً..."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowNewTicketForm(false)}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg shadow-md"
            >
              إرسال التذكرة الآن
            </button>
          </div>
        </form>
      )}

      {/* Ticket Desk Layout: List on Right, Conversation on Left */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Tickets List */}
        <div className="p-4 rounded-3xl bg-[#0f1523] border border-cyan-500/20 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-cyan-400" />
              تذاكر العملاء النشطة ({supportTickets.length})
            </h3>
          </div>

          <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
            {supportTickets.map((t) => {
              const isSelected = t.id === currentTicket?.id;
              const isResolved = t.status === 'resolved';
              const isInProgress = t.status === 'in_progress';

              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTicketId(t.id)}
                  className={`p-3.5 rounded-2xl border text-right cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-cyan-950/60 border-cyan-500/60 shadow-lg shadow-cyan-950/40'
                      : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-bold text-cyan-400">{t.ticketNumber}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      isResolved
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : isInProgress
                        ? 'bg-blue-950 text-blue-300 border border-blue-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}>
                      {isResolved ? 'محلولة' : isInProgress ? 'جاري الرد' : 'جديدة'}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-white line-clamp-1">{t.subject}</h4>
                  
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-800/60">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {t.customerName}
                    </span>
                    <span className="font-mono text-[10px]">{t.createdAt}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Ticket Conversation View */}
        {currentTicket ? (
          <div className="lg:col-span-2 p-5 rounded-3xl bg-[#0f1523] border border-cyan-500/20 flex flex-col justify-between space-y-4 shadow-xl">
            
            {/* Conversation Header */}
            <div className="pb-3 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-cyan-400">{currentTicket.ticketNumber}</span>
                  <h3 className="text-sm font-bold text-white">{currentTicket.subject}</h3>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                  <span>العميل: <strong className="text-slate-200">{currentTicket.customerName}</strong></span>
                  {currentTicket.relatedOrderId && (
                    <span className="font-mono text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800 text-[11px]">
                      طلب رقم: {currentTicket.relatedOrderId}
                    </span>
                  )}
                  {currentTicket.assignedToAssistantName && (
                    <span className="text-emerald-400 text-[11px] font-semibold">
                      المسؤول: {currentTicket.assignedToAssistantName}
                    </span>
                  )}
                </div>
              </div>

              {/* Status & Assign Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateTicketStatus(
                    currentTicket.id, 
                    currentTicket.status === 'resolved' ? 'in_progress' : 'resolved'
                  )}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    currentTicket.status === 'resolved'
                      ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
                  }`}
                >
                  {currentTicket.status === 'resolved' ? 'إعادة فتح التذكرة' : 'تحديد كمحلولة ✅'}
                </button>
              </div>
            </div>

            {/* Messages Feed */}
            <div className="flex-1 space-y-3 overflow-y-auto max-h-[380px] p-2 pr-1">
              {currentTicket.messages.map((m) => {
                const isCust = m.sender === 'customer';
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col ${isCust ? 'items-start' : 'items-end'}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-[11px] text-slate-400">
                      <span className="font-semibold text-slate-300">{m.senderName}</span>
                      <span>•</span>
                      <span className="font-mono text-[10px]">{m.time}</span>
                    </div>

                    <div className={`p-3.5 rounded-2xl max-w-lg text-xs leading-relaxed ${
                      isCust
                        ? 'bg-slate-900 border border-slate-800 text-slate-200 rounded-br-sm'
                        : 'bg-cyan-950/80 border border-cyan-500/40 text-cyan-100 rounded-bl-sm'
                    }`}>
                      {m.text}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Canned Responses (Very helpful for support staff) */}
            <div className="pt-2 border-t border-slate-800/80">
              <span className="text-[10px] text-slate-400 block mb-1.5 font-semibold">
                ردود سريعة جاهزة لخدمة العملاء:
              </span>
              <div className="flex flex-wrap gap-1.5 text-xs">
                {[
                  'طلبك قيد المعالجة الآن وسيتم الشحن في أقل من دقيقة ⚡',
                  'تم إرسال كود التفعيل الرقمي إلى بريدك الإلكتروني بنجاح 🔑',
                  'يرجى تزويدنا بمعرف الحساب (Player ID) الصحيح للتحقق 🎮',
                ].map((quick, i) => (
                  <button
                    key={i}
                    onClick={() => setReplyText(quick)}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] border border-slate-800 hover:border-slate-700 transition-colors"
                  >
                    {quick.slice(0, 36)}...
                  </button>
                ))}
              </div>
            </div>

            {/* Reply Input Box */}
            <form onSubmit={handleSendReply} className="flex gap-2 pt-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="اكتب ردك للعميل أو استفسارك هنا..."
                className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-cyan-600/30"
              >
                <Send className="w-3.5 h-3.5" />
                <span>إرسال الرد</span>
              </button>
            </form>

          </div>
        ) : (
          <div className="lg:col-span-2 p-12 rounded-3xl bg-[#0f1523] border border-slate-800 flex items-center justify-center text-slate-500 text-xs">
            اختر تذكرة من القائمة الجانبية لمعاينة المحادثة والرد على العميل
          </div>
        )}

      </div>

    </div>
  );
};
