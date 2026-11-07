import React from 'react';
import { X, ExternalLink, CheckCircle2, Smartphone, Monitor, ShieldCheck, ShoppingCart, Award, Users, Wallet, PackageCheck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { ScreenId } from '../types';

export const OriginalDesignsModal: React.FC = () => {
  const { showOriginalDesigns, setShowOriginalDesigns, setActiveScreen, setViewMode } = useStore();

  if (!showOriginalDesigns) return null;

  const screensGuide: { id: ScreenId; num: string; title: string; desc: string; icon: React.ReactNode }[] = [
    { id: 'splash', num: '1', title: 'شاشة البداية (Splash)', desc: 'شاشة الترحيب والشعار مع زر إبدأ الآن', icon: <Smartphone className="w-4 h-4 text-cyan-400" /> },
    { id: 'login', num: '2', title: 'تسجيل الدخول (Sign in)', desc: 'بوابة الدخول مع دعم الدخول الموحد وإنشاء حساب', icon: <ShieldCheck className="w-4 h-4 text-blue-400" /> },
    { id: 'home', num: '3', title: 'الصفحة الرئيسية (Home)', desc: 'الأقسام المميزة، لافتة العروض والمنتجات المقترحة', icon: <ShoppingCart className="w-4 h-4 text-emerald-400" /> },
    { id: 'product', num: '4', title: 'صفحة المنتج (Product Page)', desc: 'شحن PUBG UC، اختيار الباقات، السعر والشراء', icon: <PackageCheck className="w-4 h-4 text-amber-400" /> },
    { id: 'gift', num: '5', title: 'شاشة الهدية (Gift Sending)', desc: 'إرسال الشدات كهدية لمعرف لاعب آخر أو إيميل', icon: <Award className="w-4 h-4 text-purple-400" /> },
    { id: 'wallet', num: '6', title: 'شاشة المحفظة (Wallet)', desc: 'الرصيد، الشحن، السحب وسجل العمليات المالية', icon: <Wallet className="w-4 h-4 text-cyan-400" /> },
    { id: 'community', num: '7', title: 'شاشة المجتمع (Community)', desc: 'أفضل اللاعبين، ألعاب المجتمع ومنشورات التفاعل', icon: <Users className="w-4 h-4 text-pink-400" /> },
    { id: 'tournaments', num: '8', title: 'شاشة البطولات (Tournaments)', desc: 'بطولات ببجي وفري فاير وبلايستيشن والجوائز', icon: <Award className="w-4 h-4 text-amber-400" /> },
    { id: 'profile', num: '9', title: 'الملف الشخصي (Profile)', desc: 'المستوى 50، النقاط، الحسابات المرتبطة والألعاب', icon: <Users className="w-4 h-4 text-cyan-400" /> },
    { id: 'merchant', num: '10', title: 'لوحة التاجر (Merchant)', desc: 'إدارة المنتجات، الأرباح، المخزون وبنك الأكواد', icon: <PackageCheck className="w-4 h-4 text-indigo-400" /> },
    { id: 'admin', num: '11', title: 'لوحة الإدارة وتجهيز الطلبات', desc: 'سير العمل الفعال لتجهيز وشحن طلبات العملاء', icon: <Monitor className="w-4 h-4 text-red-400" /> },
    { id: 'security', num: '12', title: 'الأمان والعملات وطرق الدفع', desc: 'التحقق الثنائي، بوابات الدفع وتبديل العملات', icon: <ShieldCheck className="w-4 h-4 text-teal-400" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-6xl max-h-[92vh] bg-[#0f172a] border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0b0f19]">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Monitor className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                صورة التصميم المرجعية الكاملة (أكثر من 12 صفحة وشاشة)
                <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono">12+ SCREENS</span>
              </h3>
              <p className="text-xs text-slate-400">
                يمكنك معاينة الصورة المرفقة كاملة والانتقال المباشر لأي شاشة تفاعلية في المتجر لتجربتها
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowOriginalDesigns(false)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick jump grid */}
          <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800">
            <div className="text-sm font-semibold text-cyan-400 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              انقر للانتقال المباشر وتجربة أي شاشة في المتجر التفاعلي:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {screensGuide.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setActiveScreen(s.id);
                    setShowOriginalDesigns(false);
                  }}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-800/60 hover:bg-cyan-500/15 hover:border-cyan-500/40 border border-slate-700/50 text-right transition-all group"
                >
                  <div className="w-6 h-6 rounded bg-slate-700/60 flex items-center justify-center text-xs font-mono font-bold text-cyan-300 group-hover:bg-cyan-500 group-hover:text-black">
                    {s.num}
                  </div>
                  <div className="overflow-hidden">
                    <div className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 truncate">
                      {s.title}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">{s.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Full Reference Image Display */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-300">الصورة الكاملة المرفقة من المستخدم:</span>
              <a
                href="/assets/aistudio/b2841289253a6422c4534fc8bdc27d18be92dbf4d078db97fbe0df454e78441f_13ca06bc.png"
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 hover:underline flex items-center gap-1"
              >
                فتح الصورة بالحجم الكامل <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <div className="rounded-xl overflow-hidden border border-slate-800 bg-black/50 p-2">
              <img
                src="/assets/aistudio/b2841289253a6422c4534fc8bdc27d18be92dbf4d078db97fbe0df454e78441f_13ca06bc.png"
                alt="12 Screens Design Architecture"
                className="w-full h-auto rounded-lg object-contain shadow-2xl"
                loading="lazy"
              />
            </div>
          </div>

          {/* Additional visual branding assets provided */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-4">
              <img
                src="/assets/aistudio/file_000000007e1c81f5ba66efa05ab9f2e5_0ba40384.png"
                alt="SOLO Store Identity"
                className="w-20 h-20 rounded-xl object-contain bg-black/40 p-2 border border-cyan-500/20"
              />
              <div>
                <h4 className="text-sm font-bold text-white">هوية المتجر SOLO</h4>
                <p className="text-xs text-slate-400 mt-1">متجرك للمنتجات والخدمات الرقمية وشحن الألعاب والبطاقات</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-4">
              <img
                src="/assets/aistudio/file_000000009e88820a92b3001435684c14_3392de31.png"
                alt="Digital Ecosystem"
                className="w-20 h-20 rounded-xl object-contain bg-black/40 p-2 border border-blue-500/20"
              />
              <div>
                <h4 className="text-sm font-bold text-white">المنظومة الرقمية الشاملة</h4>
                <p className="text-xs text-slate-400 mt-1">بطاقات شحن، اشتراكات، خدمات رقمية، دفع آمن وتسليم فوري</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-[#0b0f19] flex items-center justify-between text-xs">
          <span className="text-slate-400">
            تم تطبيق كامل الشاشات الـ 12 بنظام تفاعلي متكامل مع إدارة المنتجات وتجهيز الطلبات الفعال.
          </span>
          <button
            onClick={() => setShowOriginalDesigns(false)}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors"
          >
            إغلاق ومتابعة التجربة
          </button>
        </div>

      </div>
    </div>
  );
};
