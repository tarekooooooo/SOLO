import React, { useState } from 'react';
import { 
  Monitor, 
  Users, 
  ShoppingBag, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Zap, 
  Search, 
  Filter, 
  ChevronRight, 
  Eye, 
  ShieldCheck, 
  DollarSign, 
  UserCheck, 
  TrendingUp, 
  RotateCcw,
  ExternalLink,
  Gift,
  UserPlus,
  Headphones,
  Shield,
  Trash2,
  Mail,
  Phone,
  MessageSquare,
  Truck,
  Copy,
  MapPin,
  Key,
  CheckCircle2,
  XCircle,
  Smartphone,
  Coins,
  Building2,
  CreditCard
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Order, OrderStatus, PhysicalOrderStatus } from '../../types';
import { AddAssistantModal } from '../modals/AddAssistantModal';
import { CustomerSupportScreen } from './CustomerSupportScreen';

export const AdminFulfillmentScreen: React.FC = () => {
  const { 
    orders, 
    physicalOrders,
    updatePhysicalOrderStatus,
    syncWithCJ,
    setSelectedOrderForFulfillment, 
    startProcessingOrder, 
    formatPrice, 
    assistants,
    updateAssistant,
    deleteAssistant,
    supportTickets,
    apiConfig,
    setIsApiModalOpen,
    showToast,
    reviewManualPayment
  } = useStore();

  const [activeAdminTab, setActiveAdminTab] = useState<'orders' | 'cj_orders' | 'manual_reviews' | 'assistants' | 'support'>('orders');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddAssistantOpen, setIsAddAssistantOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [submittingReviewId, setSubmittingReviewId] = useState<string | null>(null);

  const awaitingManualDigital = orders.filter((o) => o.status === 'awaiting_manual_review');
  const awaitingManualPhysical = physicalOrders.filter((o) => o.status === 'awaiting_manual_review');
  const totalAwaitingManual = awaitingManualDigital.length + awaitingManualPhysical.length;

  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    const matchesSearch = 
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.targetPlayerId && o.targetPlayerId.includes(searchQuery));
    return matchesStatus && matchesSearch;
  });

  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const processingCount = orders.filter((o) => o.status === 'processing').length;
  const completedCount = orders.filter((o) => o.status === 'completed').length;
  const openTicketsCount = supportTickets.filter((t) => t.status === 'open' || t.status === 'in_progress').length;

  const handleStartProcessing = (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    startProcessingOrder(order.id);
  };

  const handleOpenFulfillment = (order: Order) => {
    setSelectedOrderForFulfillment(order);
  };

  const permissionLabels: Record<string, string> = {
    fulfill_orders: 'تجهيز الطلبات ⚡',
    customer_support: 'خدمة العملاء 🎧',
    manage_products: 'إدارة المنتجات 📦',
    manage_wallet: 'المحفظة 💳',
    view_analytics: 'الإحصائيات 📊',
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Header matching Screen 11 in mockup */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-950 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Monitor className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white">لوحة تحكم الإدمن وإدارة المتجر</h2>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                ADMIN & STORE CONTROL CENTER
              </span>
            </div>
            <p className="text-xs text-slate-400">
              تجهيز وشحن طلبات العملاء، تعيين المساعدين وفريق العمل، ومركز خدمة العملاء 24/7
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeAdminTab === 'assistants' && (
            <button
              onClick={() => setIsAddAssistantOpen(true)}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-600/20"
            >
              <UserPlus className="w-4 h-4" />
              <span>تعيين مساعد جديد</span>
            </button>
          )}
          <span className="font-mono text-xs text-cyan-400 px-2 py-1 rounded bg-slate-900 border border-slate-800">
            PAGE 11 // ADMIN
          </span>
        </div>
      </div>

      {/* 4 Stats Cards (Exact metrics from Screen 11 in mockup) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#0f1523] border border-cyan-500/20 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>عدد المستخدمين</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-white">880</div>
          <span className="text-[10px] text-slate-400 block font-mono">+42 مستخدم جديد هذا الأسبوع</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#0f1523] border border-cyan-500/20 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>فريق المساعدين النشط</span>
            <UserCheck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-amber-400">
            {assistants.filter((a) => a.status === 'active').length} مساعدين
          </div>
          <span className="text-[10px] text-amber-400/80 block">تغطية تجهيز على مدار الساعة</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#0f1523] border border-cyan-500/20 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>الطلبات اليوم</span>
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400">1,200</div>
          <span className="text-[10px] text-emerald-400/80 block">معدل تنفيذ 99.4%</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#0f1523] border border-cyan-500/20 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>تذاكر خدمة العملاء</span>
            <Headphones className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-indigo-400">
            {openTicketsCount} نشطة
          </div>
          <span className="text-[10px] text-cyan-400 block font-semibold">متوسط الرد: أقل من دقيقة</span>
        </div>
      </div>

      {/* 4 Main Admin Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-semibold">
        <button
          onClick={() => setActiveAdminTab('orders')}
          className={`flex-1 min-w-[140px] py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeAdminTab === 'orders'
              ? 'bg-cyan-500 text-black font-bold shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>طلبات المنتجات الرقمية ({orders.length})</span>
          {pendingCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-black/30 text-[10px] flex items-center justify-center font-bold font-mono">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveAdminTab('cj_orders')}
          className={`flex-1 min-w-[140px] py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeAdminTab === 'cj_orders'
              ? 'bg-cyan-500 text-black font-bold shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>طلبات CJ Dropshipping المادية ({physicalOrders.length})</span>
          {physicalOrders.filter(o => o.status === 'cj_syncing' || o.status === 'processing').length > 0 && (
            <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700 text-[10px] flex items-center justify-center font-bold font-mono">
              {physicalOrders.filter(o => o.status === 'cj_syncing' || o.status === 'processing').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveAdminTab('manual_reviews')}
          className={`flex-1 min-w-[140px] py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeAdminTab === 'manual_reviews'
              ? 'bg-amber-400 text-black font-bold shadow-md shadow-amber-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>مراجعة الحوالات ({totalAwaitingManual})</span>
          {totalAwaitingManual > 0 && (
            <span className="w-5 h-5 rounded-full bg-amber-500 text-black text-[10px] flex items-center justify-center font-bold font-mono">
              {totalAwaitingManual}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveAdminTab('assistants')}
          className={`flex-1 min-w-[140px] py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeAdminTab === 'assistants'
              ? 'bg-cyan-500 text-black font-bold shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>المساعدين وفريق العمل ({assistants.length})</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('support')}
          className={`flex-1 min-w-[140px] py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeAdminTab === 'support'
              ? 'bg-cyan-500 text-black font-bold shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Headphones className="w-4 h-4" />
          <span>خدمة العملاء ({supportTickets.length})</span>
          {openTicketsCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] flex items-center justify-center font-bold font-mono">
              {openTicketsCount}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: ORDER FULFILLMENT */}
      {activeAdminTab === 'orders' && (
        <div className="space-y-4">
          
          {/* Orders Pipeline Filters & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-slate-900/90 rounded-2xl border border-slate-800">
            
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                  statusFilter === 'all'
                    ? 'bg-cyan-500 text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                جميع الطلبات ({orders.length})
              </button>

              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1 ${
                  statusFilter === 'pending'
                    ? 'bg-amber-500 text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>جديدة بانتظار التجهيز</span>
                {pendingCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px] font-mono">
                    {pendingCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setStatusFilter('processing')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1 ${
                  statusFilter === 'processing'
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>قيد المعالجة</span>
                {processingCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px] font-mono">
                    {processingCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setStatusFilter('completed')}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all ${
                  statusFilter === 'completed'
                    ? 'bg-emerald-500 text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                المكتملة ({completedCount})
              </button>
            </div>

            <div className="relative min-w-[220px]">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث برقم الطلب، العميل، أو الآيدي..."
                className="w-full pl-3 pr-9 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            </div>

          </div>

          {/* Orders Table */}
          <div className="rounded-3xl bg-[#0f1523] border border-cyan-500/20 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">جدول تجهيز الطلبات الفعال</h3>
                <p className="text-xs text-slate-400">انقر على أي طلب لتنفيذ الشحن المباشر أو تسليم الكود الفوري</p>
              </div>
              <span className="text-xs font-mono text-cyan-400">
                {filteredOrders.length} طلب معروض
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="py-3.5 px-4">رقم الطلب</th>
                    <th className="py-3.5 px-4">المنتج والباقة</th>
                    <th className="py-3.5 px-4">العميل / المعرّف (ID)</th>
                    <th className="py-3.5 px-4">السعر</th>
                    <th className="py-3.5 px-4">الحالة</th>
                    <th className="py-3.5 px-4 text-left">إجراءات التجهيز الفعال</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredOrders.map((order) => {
                    const isPending = order.status === 'pending';
                    const isProcessing = order.status === 'processing';
                    const isCompleted = order.status === 'completed';
                    const isCancelled = order.status === 'cancelled';

                    return (
                      <tr
                        key={order.id}
                        onClick={() => handleOpenFulfillment(order)}
                        className="hover:bg-slate-800/40 cursor-pointer transition-colors group"
                      >
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-cyan-400 block group-hover:underline">
                            {order.orderNumber}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">{order.date}</span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{order.productName}</span>
                            {order.isGift && (
                              <span title="طلب هدية">
                                <Gift className="w-3.5 h-3.5 text-purple-400" />
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-cyan-400/90 font-semibold block">
                            {order.packageName}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="text-slate-200 font-semibold block">{order.customerName}</span>
                          {order.targetPlayerId ? (
                            <span className="font-mono text-[11px] text-cyan-300 bg-cyan-950/70 px-1.5 py-0.5 rounded border border-cyan-800 inline-block mt-0.5">
                              ID: {order.targetPlayerId}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500 block">كود رقمي فوري</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-mono font-extrabold text-white">
                          {formatPrice(order.priceUSD)}
                        </td>

                        <td className="py-3.5 px-4">
                          {isPending && (
                            <span className="px-2.5 py-1 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800 text-[11px] font-semibold inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" /> بانتظار البدء
                            </span>
                          )}
                          {isProcessing && (
                            <span className="px-2.5 py-1 rounded-full bg-blue-950/80 text-blue-300 border border-blue-800 text-[11px] font-semibold inline-flex items-center gap-1 animate-pulse">
                              <Zap className="w-3 h-3" /> قيد التجهيز
                            </span>
                          )}
                          {isCompleted && (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800 text-[11px] font-semibold inline-flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> مكتمل ومسلّم
                            </span>
                          )}
                          {isCancelled && (
                            <span className="px-2.5 py-1 rounded-full bg-rose-950/80 text-rose-300 border border-rose-800 text-[11px] font-semibold inline-flex items-center gap-1">
                              <RotateCcw className="w-3 h-3" /> ملغى ومسترجع
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-left">
                          <div className="flex items-center justify-end gap-2">
                            {isPending && (
                              <button
                                onClick={(e) => handleStartProcessing(order, e)}
                                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors flex items-center gap-1 shadow-sm"
                              >
                                <Zap className="w-3.5 h-3.5" />
                                <span>بدء التجهيز</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleOpenFulfillment(order)}
                              className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-all shadow-md shadow-cyan-600/20 flex items-center gap-1"
                            >
                              <span>{isCompleted ? 'تفاصيل التسليم' : 'معالجة وشحن'}</span>
                              <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                            </button>
                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

      {/* TAB 2: STAFF & ASSISTANTS MANAGEMENT (تعيين مساعدين وموظفين) */}
      {activeAdminTab === 'assistants' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#0f1523] border border-cyan-500/20">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-cyan-400" />
                إدارة وتعيين المساعدين في المتجر
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                يمكنك إضافة مساعدين لتجهيز وشحن الطلبات، والرد على خدمة العملاء مع تحديد صلاحيات دقيقة لكل موظف.
              </p>
            </div>
            <button
              onClick={() => setIsAddAssistantOpen(true)}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-600/20 shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>إضافة وتعيين مساعد جديد</span>
            </button>
          </div>

          {/* Assistants Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assistants.map((assistant) => {
              const isActive = assistant.status === 'active';
              return (
                <div
                  key={assistant.id}
                  className="p-5 rounded-3xl bg-[#0f1523] border border-slate-800 hover:border-cyan-500/40 transition-all space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-bold text-sm">
                          {assistant.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{assistant.name}</h4>
                          <span className="text-xs text-cyan-400 font-semibold block">{assistant.roleTitle}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          updateAssistant(assistant.id, { status: isActive ? 'suspended' : 'active' });
                        }}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors ${
                          isActive
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : 'bg-rose-950 text-rose-300 border-rose-800'
                        }`}
                      >
                        {isActive ? 'نشط بالخدمة' : 'معلق'}
                      </button>
                    </div>

                    {/* Contact Details */}
                    <div className="space-y-1 text-xs text-slate-400 font-mono pt-1">
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-slate-300 truncate">{assistant.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-slate-300">{assistant.phone}</span>
                      </div>
                    </div>

                    {/* Permissions Badges */}
                    <div className="pt-2 border-t border-slate-800">
                      <span className="text-[10px] text-slate-500 block mb-1.5 font-semibold">الصلاحيات الممنوحة:</span>
                      <div className="flex flex-wrap gap-1">
                        {assistant.permissions.map((p) => (
                          <span
                            key={p}
                            className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300"
                          >
                            {permissionLabels[p] || p}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Assistant Stats & Footer */}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="text-[10px] text-slate-500 block">شحنات منجزة</span>
                        <span className="font-mono font-bold text-emerald-400">{assistant.ordersHandled}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">تذاكر محلولة</span>
                        <span className="font-mono font-bold text-cyan-400">{assistant.ticketsHandled}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (confirm(`هل أنت متأكد من حذف المساعد ${assistant.name}؟`)) {
                          deleteAssistant(assistant.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-900 transition-colors"
                      title="حذف المساعد"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB: CJ DROPSHIPPING PHYSICAL ORDERS */}
      {activeAdminTab === 'cj_orders' && (
        <div className="space-y-4">
          {/* CJ Integration Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 via-cyan-950/30 to-slate-900 border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>إدارة ومزامنة طلبات الشحن مع CJ Dropshipping</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${apiConfig.cjConnected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400'}`}>
                    {apiConfig.cjConnected ? 'الاتصال نشط 🟢' : 'بانتظار المفاتيح 🟡'}
                  </span>
                </h3>
                <p className="text-xs text-slate-300">
                  الحساب المرتبط: <span className="font-mono text-cyan-300">{apiConfig.cjAccountEmail}</span> • المعرف: <span className="font-mono text-cyan-300">{apiConfig.cjAppId}</span>
                </p>
                <div className="mt-1 text-[11px] text-amber-300/90 font-mono" dir="ltr">
                  📍 Path on CJ: cjdropshipping.com &gt; My CJ &gt; Orders &gt; Store Orders
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsApiModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md transition-all shrink-0"
              >
                <Key className="w-4 h-4" />
                <span>إعدادات وفحص CJ &gt;</span>
              </button>
            </div>
          </div>

          {/* CJ Orders List */}
          <div className="space-y-3">
            {physicalOrders.length === 0 ? (
              <div className="text-center py-12 rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400 text-xs">
                لا توجد طلبات منتجات مادية حالياً.
              </div>
            ) : (
              physicalOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="p-5 rounded-2xl bg-[#0f1523] border border-slate-800 hover:border-cyan-500/40 transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="font-mono text-sm font-bold text-cyan-400">{ord.orderNumber}</div>
                      <span className="text-xs text-slate-400">• {ord.createdAt}</span>
                      <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold border ${
                        ord.status === 'shipped' 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : ord.status === 'cj_syncing'
                          ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30 animate-pulse'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}>
                        {ord.status === 'shipped' ? 'تم الشحن بالناقل 🚚' : ord.status === 'cj_syncing' ? 'جاري المزامنة مع CJ ⚡' : 'قيد المعالجة والتجهيز'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => syncWithCJ(ord.id)}
                        className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <Zap className="w-3.5 h-3.5 text-cyan-400" />
                        <span>مزامنة بوليصة CJ</span>
                      </button>

                      <select
                        value={ord.status}
                        onChange={(e) => updatePhysicalOrderStatus(ord.id, e.target.value as PhysicalOrderStatus)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
                      >
                        <option value="pending">معلق (Pending)</option>
                        <option value="cj_syncing">جاري المزامنة (CJ Sync)</option>
                        <option value="processing">قيد التجهيز بالمستودع</option>
                        <option value="shipped">تم الشحن (Shipped)</option>
                        <option value="delivered">تم التوصيل (Delivered)</option>
                      </select>
                    </div>
                  </div>

                  {/* Order Details Body */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs">
                    {/* Product & Variant */}
                    <div className="md:col-span-5 flex items-start gap-3">
                      <img src={ord.productImage} alt="" className="w-16 h-16 rounded-xl object-cover border border-slate-700 shrink-0" />
                      <div className="space-y-1">
                        <div className="font-bold text-white text-sm">{ord.productTitle}</div>
                        <div className="text-cyan-400 text-[11px] font-medium">{ord.selectedVariant}</div>
                        <div className="text-slate-400 text-[11px]">
                          الكمية: <strong className="text-white">{ord.quantity}</strong> • الإجمالي: <strong className="text-cyan-400 font-mono text-xs">{formatPrice(ord.totalUSD)}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Shipping Address */}
                    <div className="md:col-span-4 p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between text-slate-300 font-bold">
                        <span className="flex items-center gap-1 text-cyan-400">
                          <MapPin className="w-3.5 h-3.5" />
                          عنوان التوصيل:
                        </span>
                        <button
                          onClick={() => {
                            const addr = `${ord.shippingAddress.fullName} - ${ord.shippingAddress.phone} - ${ord.shippingAddress.country} - ${ord.shippingAddress.city} - ${ord.shippingAddress.streetAddress}`;
                            navigator.clipboard.writeText(addr);
                            showToast('تم نسخ عنوان التوصيل كاملاً إلى الحافظة!');
                          }}
                          className="p-1 text-slate-400 hover:text-white"
                          title="نسخ العنوان للمندوب"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-slate-200 font-semibold">{ord.shippingAddress.fullName} ({ord.shippingAddress.phone})</div>
                      <div className="text-slate-400 text-[11px] leading-tight">
                        {ord.shippingAddress.country}، {ord.shippingAddress.city}، {ord.shippingAddress.district || ''}
                        <br />
                        {ord.shippingAddress.streetAddress}
                      </div>
                      {ord.shippingAddress.notes && (
                        <div className="text-amber-400/90 text-[10px] mt-1">ملاحظة: {ord.shippingAddress.notes}</div>
                      )}
                    </div>

                    {/* CJ Tracking Info */}
                    <div className="md:col-span-3 p-3 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2">
                      <div className="text-slate-300 font-bold flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5 text-cyan-400" />
                        <span>بيانات تتبع CJ:</span>
                      </div>
                      <div className="space-y-1 font-mono text-[11px]">
                        <div className="text-slate-400">CJ Order: <span className="text-white">{ord.cjOrderId || 'بانتظار الإصدار'}</span></div>
                        <div className="text-slate-400">Tracking: <span className="text-cyan-400 font-bold">{ord.cjTrackingNumber || 'قيد التوليد'}</span></div>
                        <div className="text-slate-400">Carrier: <span className="text-slate-200">{ord.shippingCarrier || 'CJ Packet'}</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB: MANUAL PAYMENT REVIEWS (ليبيانا / المدار / تحويل مصرفي / Payoneer / ATLOS) */}
      {activeAdminTab === 'manual_reviews' && (
        <div className="space-y-4">
          {/* Security Notice Banner */}
          <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 flex items-start gap-3 text-xs">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-amber-300 text-sm">
                مركز مراجعة وتدقيق الحوالات اليدوية وبوابة ATLOS
              </h4>
              <p className="text-slate-300 leading-relaxed">
                قاعدة الأمان الصارمة: الطلبات اليدوية لا يتم شحنها تلقائياً ولا تُرسل لـ CJ Dropshipping إلا بعد أن يقوم المشرف المعتمد بالتحقق من استلام الرصيد والضغط على <strong className="text-emerald-400">اعتماد الدفع</strong>. كل قرار يسجل في سجل تدقيق الإدارة (Admin Audit Log) مع هوية المشرف وتوقيت العملية.
              </p>
            </div>
          </div>

          {/* List of Pending Reviews */}
          <div className="space-y-4">
            {totalAwaitingManual === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold text-white">لا توجد طلبات دفع يدوي بانتظار المراجعة</h4>
                <p className="text-xs text-slate-400">جميع الحوالات وإشعارات الدفع تمت مراجعتها واعتمادها بنجاح.</p>
              </div>
            ) : (
              <>
                {/* 1. Digital Orders Awaiting Review */}
                {awaitingManualDigital.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-5 rounded-2xl bg-[#0f1523] border border-amber-500/30 shadow-lg space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-bold text-amber-400">{ord.orderNumber}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-semibold">
                          منتج رقمي
                        </span>
                        <span className="text-xs text-slate-400">• {ord.date}</span>
                      </div>
                      <div className="text-xs font-mono font-bold text-cyan-400">
                        المبلغ المطلوب: {formatPrice(ord.priceUSD)}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs">
                      {/* Product & Customer */}
                      <div className="md:col-span-5 space-y-2">
                        <div>
                          <span className="text-slate-400 block text-[11px]">المنتج والباقة:</span>
                          <span className="font-bold text-white text-sm">{ord.productName} ({ord.packageName})</span>
                        </div>
                        <div className="text-slate-300">
                          العميل: <strong>{ord.customerName}</strong> • {ord.customerPhone || 'بدون هاتف'}
                        </div>
                        {ord.targetPlayerId && (
                          <div className="font-mono text-cyan-300 text-[11px]">
                            معرف اللاعب (ID): {ord.targetPlayerId} {ord.targetPlayerName ? `(${ord.targetPlayerName})` : ''}
                          </div>
                        )}
                      </div>

                      {/* Payment Verification Info */}
                      <div className="md:col-span-4 p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                        <div className="text-slate-400 text-[11px] font-semibold">طريقة الدفع المرسلة:</div>
                        <div className="text-amber-300 font-bold flex items-center gap-1.5">
                          <Smartphone className="w-4 h-4 text-amber-400" />
                          <span>{ord.paymentMethod}</span>
                        </div>
                        <div className="pt-1 text-slate-300">
                          <span className="text-slate-400 block text-[11px]">رقم الحوالة / كود الكرت:</span>
                          <span className="font-mono font-bold text-white bg-slate-950 px-2.5 py-1 rounded border border-slate-800 inline-block mt-0.5">
                            {ord.paymentReference || 'لم يدخل العميل رقماً'}
                          </span>
                        </div>
                      </div>

                      {/* Admin Actions */}
                      <div className="md:col-span-3 flex flex-col justify-between space-y-2">
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">ملاحظات المشرف:</label>
                          <input
                            type="text"
                            placeholder="ملاحظات الاعتماد أو سبب الرفض..."
                            value={reviewNotes[ord.id] || ''}
                            onChange={(e) => setReviewNotes({ ...reviewNotes, [ord.id]: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:border-cyan-500 focus:outline-none"
                          />
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            disabled={submittingReviewId === ord.id}
                            onClick={async () => {
                              setSubmittingReviewId(ord.id);
                              await reviewManualPayment(ord.id, 'approve', reviewNotes[ord.id], false);
                              setSubmittingReviewId(null);
                            }}
                            className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-md shadow-emerald-950"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>اعتماد ✅</span>
                          </button>

                          <button
                            type="button"
                            disabled={submittingReviewId === ord.id}
                            onClick={async () => {
                              setSubmittingReviewId(ord.id);
                              await reviewManualPayment(ord.id, 'reject', reviewNotes[ord.id], false);
                              setSubmittingReviewId(null);
                            }}
                            className="flex-1 py-2 px-3 rounded-xl bg-rose-600/80 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>رفض ❌</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* 2. Physical Orders Awaiting Review */}
                {awaitingManualPhysical.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-5 rounded-2xl bg-[#0f1523] border border-amber-500/30 shadow-lg space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-bold text-amber-400">{ord.orderNumber}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-semibold">
                          شحنة مادية (CJ Dropshipping)
                        </span>
                        <span className="text-xs text-slate-400">• {ord.createdAt}</span>
                      </div>
                      <div className="text-xs font-mono font-bold text-cyan-400">
                        المجموع مع الشحن: {formatPrice(ord.totalUSD)}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs">
                      {/* Product Info */}
                      <div className="md:col-span-5 flex items-start gap-3">
                        <img src={ord.productImage} alt="" className="w-14 h-14 rounded-xl object-cover border border-slate-700 shrink-0" />
                        <div className="space-y-1">
                          <span className="font-bold text-white text-sm block">{ord.productTitle}</span>
                          <span className="text-cyan-400 text-[11px] block">{ord.selectedVariant}</span>
                          <span className="text-slate-400 text-[11px] block">
                            العميل: {ord.customerName} ({ord.customerPhone})
                          </span>
                        </div>
                      </div>

                      {/* Payment Verification Info */}
                      <div className="md:col-span-4 p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                        <div className="text-slate-400 text-[11px] font-semibold">طريقة الدفع المرسلة:</div>
                        <div className="text-amber-300 font-bold flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-amber-400" />
                          <span>{ord.paymentMethod}</span>
                        </div>
                        <div className="pt-1 text-slate-300">
                          <span className="text-slate-400 block text-[11px]">رقم الحوالة / كود الكرت:</span>
                          <span className="font-mono font-bold text-white bg-slate-950 px-2.5 py-1 rounded border border-slate-800 inline-block mt-0.5">
                            {ord.paymentReference || 'لم يدخل العميل رقماً'}
                          </span>
                        </div>
                      </div>

                      {/* Admin Actions */}
                      <div className="md:col-span-3 flex flex-col justify-between space-y-2">
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">ملاحظات المشرف:</label>
                          <input
                            type="text"
                            placeholder="ملاحظات الاعتماد أو سبب الرفض..."
                            value={reviewNotes[ord.id] || ''}
                            onChange={(e) => setReviewNotes({ ...reviewNotes, [ord.id]: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-xs focus:border-cyan-500 focus:outline-none"
                          />
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            disabled={submittingReviewId === ord.id}
                            onClick={async () => {
                              setSubmittingReviewId(ord.id);
                              await reviewManualPayment(ord.id, 'approve', reviewNotes[ord.id], true);
                              setSubmittingReviewId(null);
                            }}
                            className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-md shadow-emerald-950"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>اعتماد الشحنة ✅</span>
                          </button>

                          <button
                            type="button"
                            disabled={submittingReviewId === ord.id}
                            onClick={async () => {
                              setSubmittingReviewId(ord.id);
                              await reviewManualPayment(ord.id, 'reject', reviewNotes[ord.id], true);
                              setSubmittingReviewId(null);
                            }}
                            className="flex-1 py-2 px-3 rounded-xl bg-rose-600/80 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>رفض ❌</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: CUSTOMER SUPPORT & TICKETS (خدمة العملاء) */}
      {activeAdminTab === 'support' && (
        <CustomerSupportScreen />
      )}

      {/* Add Assistant Modal */}
      <AddAssistantModal
        isOpen={isAddAssistantOpen}
        onClose={() => setIsAddAssistantOpen(false)}
      />

    </div>
  );
};
