import React, { useState } from 'react';
import { 
  Briefcase, 
  Package, 
  DollarSign, 
  TrendingUp, 
  ShoppingBag, 
  Plus, 
  Key, 
  Edit3, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  Zap, 
  Code2, 
  Settings, 
  BarChart3,
  ExternalLink
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { AddProductModal } from '../modals/AddProductModal';
import { Product } from '../../types';

export const MerchantDashboardScreen: React.FC = () => {
  const { 
    products, 
    updateProduct, 
    deleteProduct, 
    addCodesToPackage, 
    formatPrice, 
    orders,
    setActiveScreen,
    setSelectedOrderForFulfillment,
    showToast,
    checkoutEnabled,
    atlosEnabled
  } = useStore();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'products' | 'orders' | 'reports' | 'api'>('products');
  
  // Code bank modal state
  const [selectedProductForCodes, setSelectedProductForCodes] = useState<Product | null>(null);
  const [selectedPkgId, setSelectedPkgId] = useState<string>('');
  const [newCodesText, setNewCodesText] = useState<string>('');

  const completedOrders = orders.filter((o) => o.status === 'completed');
  const pendingOrders = orders.filter((o) => o.status === 'pending' || o.status === 'processing');
  const totalSalesCount = completedOrders.length;

  const handleOpenCodeBank = (prod: Product) => {
    if (prod.deliveryType !== 'instant_code') {
      showToast('بنك الأكواد مخصص للمنتجات التي نوع تسليمها كود فوري.');
      return;
    }
    setSelectedProductForCodes(prod);
    setSelectedPkgId(prod.packages[0]?.id || '');
  };

  const handleSaveCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForCodes || !selectedPkgId) return;

    const parsedCodes = newCodesText
      .split('\n')
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    if (parsedCodes.length === 0) {
      showToast('يرجى إدخال كود واحد على الأقل.');
      return;
    }

    if (parsedCodes.length > 500) {
      showToast('الحد الأقصى 500 كود في كل دفعة.');
      return;
    }

    const saved = await addCodesToPackage(selectedProductForCodes.id, selectedPkgId, parsedCodes);
    if (saved) {
      setNewCodesText('');
      setSelectedProductForCodes(null);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div role="status" className="rounded-xl border border-amber-500/40 bg-amber-950/30 px-4 py-3 text-xs leading-relaxed text-amber-200">
        {atlosEnabled
          ? 'تُحفظ المنتجات والأكواد في الخادم. يعتمد الدفع على تأكيد ATLOS الموقّع، ثم يكمل المدير تسليم الطلب من لوحة الطلبات.'
          : checkoutEnabled
            ? 'إعداد بوابة الدفع غير مكتمل؛ لا تنشر إعلاناً عن توفر الشراء حتى اجتياز المراجعة والتفعيل.'
            : 'الشراء مغلق في وضع المعاينة. تُحفظ الأكواد في مسار خادمي خاص، ولا تُنشئ طلبات حتى المراجعة والتفعيل.'}
      </div>
      
      {/* Top Header matching Screen 10 in mockup */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-950 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white">لوحة تحكم التاجر وإدارة المنتجات</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-800 text-xs font-bold flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> حساب تاجر مفعل
              </span>
            </div>
            <p className="text-xs text-slate-400">إدارة المخزون، تسعير الباقات وبنك الأكواد الرقمية</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-600/30 transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة منتج جديد</span>
          </button>
          <span className="font-mono text-xs text-cyan-400 px-2 py-1 rounded bg-slate-900 border border-slate-800 hidden sm:inline">
            PAGE 10 // MERCHANT
          </span>
        </div>
      </div>

      {/* لا تعرض هذه الواجهة أرصدة أو أرباحًا تقديرية غير موصولة بمحاسبة خادمية. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#0f1523] border border-cyan-500/20 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>الرصيد المتاح للسحب</span>
            <DollarSign className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-white">
            غير متاح
          </div>
          <span className="text-[10px] text-slate-400 block">المحفظة غير موصولة بالخادم</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#0f1523] border border-cyan-500/20 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>إجمالي المبيعات</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400">
            {totalSalesCount} عملية
          </div>
          <span className="text-[10px] text-slate-400 block">من سجل الطلبات المحمّل</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#0f1523] border border-cyan-500/20 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>صافي الأرباح</span>
            <BarChart3 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-amber-400">
            غير متاح
          </div>
          <span className="text-[10px] text-amber-400/80 block">لا يوجد نظام محاسبة موصول</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#0f1523] border border-cyan-500/20 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>إجمالي الطلبات</span>
            <ShoppingBag className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-indigo-400">
            {orders.length}
          </div>
          <span className="text-[10px] text-cyan-400 block font-semibold">
            {pendingOrders.length} طلبات قيد التجهيز
          </span>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('products')}
          className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'products' ? 'bg-cyan-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>المنتجات في المتجر ({products.length})</span>
        </button>

        <button
          onClick={() => setActiveScreen('admin')}
          className="flex-1 py-2 rounded-lg text-slate-400 hover:text-white transition-all flex items-center justify-center gap-1.5"
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>الطلبات وتجهيزها ({pendingOrders.length})</span>
        </button>

        <button
          style={{ display: import.meta.env.DEV ? undefined : 'none' }}
          onClick={() => setActiveTab('api')}
          className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'api' ? 'bg-cyan-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>API والتكامل التلقائي</span>
        </button>
      </div>

      {/* Tab 1: Products Management Table & Grid */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">إدارة المنتجات والباقات الرقمية</h3>
              <p className="text-xs text-slate-400">إدارة الإتاحة واستيراد الأكواد إلى مخزون خاص؛ التسليم لم يُفعّل بعد</p>
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="text-xs px-3 py-1.5 rounded-lg bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-600/40 font-semibold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> إضافة منتج جديد
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {products.map((prod) => {
              return (
                <div
                  key={prod.id}
                  className="p-5 rounded-2xl bg-[#0f1523] border border-slate-800 hover:border-slate-700 transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 p-1 shrink-0">
                        <img
                          src={prod.image}
                          alt={prod.titleAr}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{prod.titleAr}</h4>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {prod.platform.toUpperCase()}
                          </span>
                        </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {prod.deliveryType === 'direct_id_recharge'
                    ? 'شحن مباشر بمعرف اللاعب (Player ID)'
                    : prod.deliveryType === 'instant_code'
                      ? `كود تفعيل رقمي — المتاح المسجل: ${prod.stockCount ?? 0}`
                      : 'خدمة يدوية — تحقق من قدرتك الفعلية على التنفيذ'}
                </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenCodeBank(prod)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-cyan-300 flex items-center gap-1.5 border border-slate-700"
                      >
                        <Key className="w-3.5 h-3.5" />
                        <span>إدارة بنك الأكواد</span>
                      </button>

                      <button
                        onClick={() => updateProduct(prod.id, { inStock: !prod.inStock })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          prod.inStock
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                            : 'bg-rose-950/80 text-rose-300 border border-rose-800'
                        }`}
                      >
                        {prod.inStock ? 'متوفر للطلب' : 'معطل مؤقتاً'}
                      </button>

                      <button
                        onClick={() => {
                        if (confirm(`هل تريد إيقاف المنتج "${prod.titleAr}" عن البيع؟ سيبقى سجل المنتج محفوظًا.`)) {
                          deleteProduct(prod.id);
                        }
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                        title="إيقاف المنتج"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Packages Breakdown */}
                  <div className="pt-3 border-t border-slate-800/80">
                    <span className="text-[11px] text-slate-400 block mb-2 font-semibold">
                      الباقات التابعة للمنتج ({prod.packages.length} باقات):
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                      {prod.packages.map((pkg) => (
                        <div
                          key={pkg.id}
                          className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80 text-right"
                        >
                          <span className="text-xs font-bold text-white block truncate">{pkg.name}</span>
                          <span className="text-xs font-mono font-extrabold text-cyan-400 block mt-1">
                            {formatPrice(pkg.priceUSD)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: API & Automated Webhooks */}
      {import.meta.env.DEV && activeTab === 'api' && (
        <div className="p-6 rounded-3xl bg-[#0f1523] border border-cyan-500/20 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Code2 className="w-5 h-5 text-cyan-400" />
                تكامل الـ API والتسليم التلقائي (Developer API & Webhooks)
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                تكامل واجهة التاجر غير منشور؛ لا يوجد مفتاح أو مسار طلب صالح للاستخدام.
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-300 block mb-1 font-semibold">واجهة التاجر:</label>
              <div className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-amber-300">
                غير منشورة — لا تستخدم أي مفتاح أو مثال API من هذه الشاشة.
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 space-y-2">
              <div className="text-slate-400">لا توجد نقطة نهاية API عامة متاحة في هذه النسخة.</div>
            </div>

            <div className="flex items-center gap-2 text-amber-300 font-semibold pt-2">
              <AlertCircle className="w-4 h-4" />
              <span>واجهة API والتسليم غير مفعّلين</span>
            </div>
          </div>
        </div>
      )}

      {/* Code Bank Modal */}
      {selectedProductForCodes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-lg bg-[#0f172a] border border-cyan-500/30 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-cyan-400" />
              إدارة بنك الأكواد لـ {selectedProductForCodes.titleAr}
            </h3>

            <form onSubmit={handleSaveCodes} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 block mb-1 font-semibold">اختر الباقة المراد تزويدها:</label>
                <select
                  value={selectedPkgId}
                  onChange={(e) => setSelectedPkgId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                >
                  {selectedProductForCodes.packages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      {pkg.name} ({formatPrice(pkg.priceUSD)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">
                  أدخل الأكواد الجديدة (كل كود في سطر جديد):
                </label>
                <textarea
                  rows={4}
                  required
                  value={newCodesText}
                  onChange={(e) => setNewCodesText(e.target.value)}
                  placeholder="أدخل حتى 500 كود، كل كود في سطر مستقل"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedProductForCodes(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg shadow-md"
                >
                  استيراد إلى المخزون الخاص
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

    </div>
  );
};
