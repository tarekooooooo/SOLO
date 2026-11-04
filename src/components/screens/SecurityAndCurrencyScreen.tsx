import React, { useState } from 'react';
import { 
  ShieldCheck, 
  KeyRound, 
  Smartphone, 
  History, 
  Coins, 
  CreditCard, 
  Building2, 
  Wallet, 
  Check, 
  Lock, 
  UserCheck, 
  DollarSign, 
  ArrowLeftRight 
} from 'lucide-react';
import { CURRENCIES } from '../../data/mockData';
import { useStore } from '../../context/StoreContext';
import { CurrencyCode } from '../../types';

export const SecurityAndCurrencyScreen: React.FC = () => {
  const { currency, setCurrencyCode, showToast } = useStore();

  const [pin, setPin] = useState('••••');
  const [is2FAEnabled, setIs2FAEnabled] = useState(true);
  const [showPinModal, setShowPinModal] = useState(false);
  const [newPin, setNewPin] = useState('');

  const registeredDevices = [
    { name: 'iPhone 15 Pro Max', location: 'الرياض، السعودية', date: 'نشط الآن', current: true },
    { name: 'Windows PC (Chrome)', location: 'جدة، السعودية', date: 'منذ يومين', current: false },
    { name: 'iPad Pro M2', location: 'دبي، الإمارات', date: 'منذ أسبوع', current: false },
  ];

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length !== 4) {
      showToast('يجب أن يتكون رمز الـ PIN من 4 أرقام.');
      return;
    }
    setPin('••••');
    setShowPinModal(false);
    showToast('تم تغيير رمز الأمان PIN بنجاح.');
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      
      {/* Top Header matching Screen 13 in mockup */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-950 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">إدارة العملات ونظام الأمان وطرق الدفع</h2>
            <p className="text-xs text-slate-400">تحكم بأسعار الصرف، بوابات الدفع الإلكتروني وتأمين الحساب</p>
          </div>
        </div>
        <span className="font-mono text-xs text-cyan-400 px-2 py-1 rounded bg-slate-900 border border-slate-800">
          PAGE 13 // SECURITY & CURRENCY
        </span>
      </div>

      {/* 3 Pillars Grid: نظام العملات | نظام الأمان | طرق الدفع (Screen 13 in mockup) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Panel 1: نظام العملات (Currencies) */}
        <div className="p-5 rounded-3xl bg-[#0f1523] border border-cyan-500/20 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Coins className="w-4 h-4 text-cyan-400" />
                نظام العملات
              </h3>
              <span className="text-[10px] text-cyan-400 font-mono">سعر الصرف</span>
            </div>

            <div className="space-y-2.5 pt-3">
              {Object.values(CURRENCIES).map((c) => {
                const isSelected = currency.code === c.code;
                return (
                  <button
                    key={c.code}
                    onClick={() => {
                      setCurrencyCode(c.code as CurrencyCode);
                      showToast(`تم تعيين العملة الافتراضية إلى ${c.name} (${c.symbol})`);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-right transition-all ${
                      isSelected
                        ? 'bg-cyan-950/60 border-cyan-500/60 text-white shadow-md'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{c.flag}</span>
                      <div>
                        <span className="text-xs font-bold block">{c.code}</span>
                        <span className="text-[10px] text-slate-400">{c.name}</span>
                      </div>
                    </div>

                    <div className="text-left font-mono">
                      <span className="text-xs text-slate-300 block">{c.rate.toFixed(2)}</span>
                      {isSelected ? (
                        <span className="text-[10px] text-cyan-400 font-bold">نشط الآن</span>
                      ) : (
                        <span className="text-[10px] text-slate-500">تفعيل</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-center">
            <span className="text-[11px] text-slate-400 block mb-2">تحديث فوري لأسعار الصرف</span>
            <button
              onClick={() => showToast('تم تحديث أسعار الصرف بنجاح.')}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-cyan-400 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>إدارة وتحديث العملات</span>
            </button>
          </div>
        </div>

        {/* Panel 2: نظام الأمان (Security System) */}
        <div className="p-5 rounded-3xl bg-[#0f1523] border border-cyan-500/20 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                نظام الأمان والخصوصية
              </h3>
              <span className="text-[10px] text-emerald-400 font-semibold">حماية 100%</span>
            </div>

            <div className="space-y-3 pt-3 text-xs">
              
              {/* PIN Code */}
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <KeyRound className="w-4 h-4 text-cyan-400" />
                  <div>
                    <span className="font-bold text-white block">رمز الـ PIN للمحفظة</span>
                    <span className="text-[10px] text-slate-400 font-mono">مفعل ({pin})</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowPinModal(true)}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-semibold"
                >
                  تغيير PIN
                </button>
              </div>

              {/* 2FA Toggle */}
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Lock className="w-4 h-4 text-purple-400" />
                  <div>
                    <span className="font-bold text-white block">التحقق الثنائي (2FA)</span>
                    <span className="text-[10px] text-slate-400">تطبيق Authenticator</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIs2FAEnabled(!is2FAEnabled);
                    showToast(is2FAEnabled ? 'تم تعطيل التحقق الثنائي.' : 'تم تفعيل التحقق الثنائي بنجاح.');
                  }}
                  className={`w-10 h-5 rounded-full transition-colors relative ${
                    is2FAEnabled ? 'bg-cyan-500' : 'bg-slate-700'
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${
                    is2FAEnabled ? 'left-1' : 'right-1'
                  }`} />
                </button>
              </div>

              {/* Registered Devices */}
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <span className="font-bold text-white block flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  الأجهزة المسجلة
                </span>
                <div className="space-y-1.5 pt-1">
                  {registeredDevices.map((d, i) => (
                    <div key={i} className="flex items-center justify-between text-[11px]">
                      <div>
                        <span className="text-slate-200 block font-semibold">{d.name}</span>
                        <span className="text-slate-500 text-[10px]">{d.location}</span>
                      </div>
                      <span className={`text-[10px] ${d.current ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                        {d.date}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-center">
            <button
              onClick={() => showToast('عرض سجل النشاطات الكامل قيد الإرسال إلى بريدك.')}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
            >
              <History className="w-3.5 h-3.5 text-slate-400" />
              <span>سجل نشاط الحساب</span>
            </button>
          </div>
        </div>

        {/* Panel 3: طرق الدفع (Payment Gateways) */}
        <div className="p-5 rounded-3xl bg-[#0f1523] border border-cyan-500/20 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-400" />
                طرق الدفع المتوفرة
              </h3>
              <span className="text-[10px] text-blue-400 font-mono">5 بوابات</span>
            </div>

            <div className="space-y-2.5 pt-3 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-4 h-4 text-cyan-400" />
                  <span className="font-semibold text-slate-200">بطاقة بنكية (مدى / فيزا)</span>
                </div>
                <span className="text-emerald-400 text-[10px] font-bold">فوري ⚡</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <span className="font-semibold text-slate-200">عملات رقمية (USDT-TRC20)</span>
                </div>
                <span className="text-emerald-400 text-[10px] font-bold">فوري ⚡</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 text-blue-400" />
                  <span className="font-semibold text-slate-200">تحويل بنكي رسمي (IBAN)</span>
                </div>
                <span className="text-slate-400 text-[10px]">خلال 1-2 ساعة</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Wallet className="w-4 h-4 text-purple-400" />
                  <span className="font-semibold text-slate-200">محفظة إلكترونية (STC/فودافون)</span>
                </div>
                <span className="text-emerald-400 text-[10px] font-bold">فوري ⚡</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <UserCheck className="w-4 h-4 text-teal-400" />
                  <span className="font-semibold text-slate-200">دفع يدوي عبر المشرف المباشر</span>
                </div>
                <span className="text-slate-400 text-[10px]">دعم 24/7</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-center">
            <span className="text-[11px] text-emerald-400 font-semibold block">
              جميع العمليات محمية بتشفير SSL عالي المستوى
            </span>
          </div>
        </div>

      </div>

      {/* Change PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#0f172a] border border-cyan-500/30 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-cyan-400" />
              تغيير رمز PIN للمحفظة
            </h3>
            <form onSubmit={handleSavePin} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 block mb-1">أدخل الرمز الجديد (4 أرقام):</label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="****"
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-center font-mono text-lg text-cyan-400 tracking-widest"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg"
                >
                  حفظ الرمز
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
