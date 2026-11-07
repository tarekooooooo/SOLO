import React, { useState } from 'react';
import { 
  ArrowRight, 
  Star, 
  ShieldCheck, 
  Zap, 
  Gift, 
  ShoppingCart, 
  Check, 
  User, 
  Layers, 
  Flame,
  Info,
  CreditCard,
  Smartphone,
  Coins,
  Building2,
  Sparkles,
  AlertCircle,
  Wallet
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Product, ProductPackage, PaymentMethod } from '../../types';

export const ProductDetailScreen: React.FC = () => {
  const { 
    products, 
    selectedProductId, 
    setActiveScreen, 
    formatPrice, 
    customerBalanceUSD, 
    showToast
  } = useStore();

  const product: Product = products.find((p: Product) => p.id === selectedProductId) || products[0];

  const [selectedPackage, setSelectedPackage] = useState<ProductPackage>(
    product.packages[2] || product.packages[0]
  );
  const [playerId, setPlayerId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isVerifyingId, setIsVerifyingId] = useState(false);
  const [idVerified, setIdVerified] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('libyana');
  const isDirectRecharge = product.deliveryType === 'direct_id_recharge';
  const isManualPayment = ['libyana', 'almadar', 'bank_transfer', 'payoneer'].includes(paymentMethod);

  const handleVerifyPlayerId = () => {
    if (!playerId) return;
    setIsVerifyingId(false);
    setIdVerified(false);
    showToast('التحقق المباشر من معرف اللاعب غير مربوط بمزوّد اللعبة؛ لم يتم تأكيد الحساب.');
  };

  const handleBuyNow = () => {
    showToast('الشراء متوقف مؤقتًا. لا تحول أموالًا ولا تدخل بيانات دفع؛ لم يكتمل ربط المخزون والتسليم بعد.');
  };

  const handleSendAsGift = () => {
    setActiveScreen('gift');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      
      {/* Top back bar: matching Screen 4 in mockup */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setActiveScreen('home')}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة للمتجر</span>
        </button>
        <span className="font-mono text-xs text-cyan-400">PAGE 04 // PRODUCT</span>
      </div>

      {/* Main Product Card */}
      <div className="rounded-3xl bg-[#0f1523] border border-cyan-500/20 overflow-hidden shadow-2xl">

        <div role="status" className="mx-4 mt-4 rounded-xl border border-amber-500/40 bg-amber-950/30 px-3 py-2 text-xs leading-relaxed text-amber-200">
          المتجر في وضع المعاينة. الشراء متوقف حاليًا لعدم اكتمال مخزون الأكواد والتسليم الآمن؛ لا تحوّل أموالًا ولا تدخل رقم حوالة.
        </div>
        
        {/* Product Media Header */}
        <div className="relative h-60 sm:h-72 bg-slate-950 overflow-hidden">
          <img
            src={product.image}
            alt={product.titleAr}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f1523] via-[#0f1523]/40 to-transparent" />
          
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-cyan-950/80 backdrop-blur-md text-xs font-bold text-cyan-300 border border-cyan-500/40">
              {product.platform.toUpperCase()}
            </span>
          </div>

          <div className="absolute bottom-4 right-4 left-4 flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-sm">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  {product.rating} (4.8k تقييم)
                </span>
                <span className="text-[11px] text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded-md border border-cyan-800/60">
                  {product.packages.length} باقات متوفرة
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">{product.titleAr}</h2>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {product.description}
          </p>

          {/* Quick trust metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span className="text-slate-300">تسليم فوري ومباشر</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300">شحن رسمي 100% مضمون</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-2 col-span-2 sm:col-span-1">
              <Flame className="w-4 h-4 text-amber-400" />
              <span className="text-slate-300">باقات مضاعفة وبونص</span>
            </div>
          </div>

          {/* اختر الكمية (Select Package / Quantity - Exact layout from Screen 4) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>اختر الكمية / الباقة:</span>
              </label>
              <span className="text-[11px] text-slate-400">أسعار شاملة الضريبة</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {product.packages.map((pkg: ProductPackage) => {
                const isSelected = selectedPackage.id === pkg.id;
                return (
                  <button
                    key={pkg.id}
                    onClick={() => setSelectedPackage(pkg)}
                    className={`relative p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-950/40 shadow-lg shadow-cyan-500/20'
                        : 'border-slate-800 bg-slate-900/70 hover:border-slate-700 hover:bg-slate-800/70'
                    }`}
                  >
                    {pkg.bonus && (
                      <span className="absolute -top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-black">
                        {pkg.bonus}
                      </span>
                    )}
                    <div>
                      <span className="text-xs font-bold text-white block mb-1">
                        {pkg.name}
                      </span>
                    </div>

                    <div className="pt-2 mt-2 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-xs font-mono font-extrabold text-cyan-400">
                        {formatPrice(pkg.priceUSD)}
                      </span>
                      {isSelected && (
                        <span className="w-4 h-4 rounded-full bg-cyan-500 text-black flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Player ID Input (Direct recharge requirement) */}
          {isDirectRecharge && (
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-cyan-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-cyan-400" />
                  <span>معرّف اللاعب (Player ID) المطلوب شحنه:</span>
                </label>
                <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> لا نطلب كلمة المرور أبداً
                </span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={playerId}
                  onChange={(e) => {
                    setPlayerId(e.target.value);
                    setIdVerified(false);
                  }}
                  placeholder="أدخل معرّف اللاعب (Player ID)"
                  className="flex-1 px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={handleVerifyPlayerId}
                  disabled={isVerifyingId}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
                >
                  {isVerifyingId ? 'جاري التحقق...' : 'تحقق من الآيدي'}
                </button>
              </div>

              {idVerified && (
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-xs text-emerald-300">
                  <span>اسم اللاعب في اللعبة: <strong>{playerName}</strong></span>
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                    <Check className="w-3.5 h-3.5" /> حساب موثق جاهز للشحن
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Payment Methods Selection */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-cyan-400" />
                <span>طريقة الدفع:</span>
              </span>
              {paymentMethod === 'wallet' && (
                <span className="text-[11px] text-cyan-300 font-mono">
                  رصيدك: {formatPrice(customerBalanceUSD)}
                </span>
              )}
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                disabled
                className={`p-2.5 rounded-xl border text-right opacity-50 cursor-not-allowed ${
                  paymentMethod === 'wallet'
                    ? 'border-cyan-400 bg-cyan-500/10 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                    : 'border-slate-800 bg-slate-800/60 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <Wallet className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[9px] text-slate-400">غير مفعلة</span>
                </div>
                <div className="font-bold">المحفظة الإلكترونية</div>
              </button>

              <button
                type="button"
                disabled
                className={`p-2.5 rounded-xl border text-right opacity-50 cursor-not-allowed ${
                  paymentMethod === 'atlos_crypto'
                    ? 'border-cyan-400 bg-cyan-500/10 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                    : 'border-slate-800 bg-slate-800/60 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[9px] text-slate-400">قريبًا</span>
                </div>
                <div className="font-bold">بوابة ATLOS المشفرة</div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('libyana')}
                className={`p-2.5 rounded-xl border text-right transition-all ${
                  paymentMethod === 'libyana'
                    ? 'border-cyan-400 bg-cyan-500/10 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                    : 'border-slate-800 bg-slate-800/60 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[9px] text-emerald-400">يدوي</span>
                </div>
                <div className="font-bold">ليبيانا (Libyana)</div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('almadar')}
                className={`p-2.5 rounded-xl border text-right transition-all ${
                  paymentMethod === 'almadar'
                    ? 'border-cyan-400 bg-cyan-500/10 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                    : 'border-slate-800 bg-slate-800/60 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-[9px] text-blue-400">يدوي</span>
                </div>
                <div className="font-bold">المدار الجديد</div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('bank_transfer')}
                className={`p-2.5 rounded-xl border text-right transition-all ${
                  paymentMethod === 'bank_transfer'
                    ? 'border-cyan-400 bg-cyan-500/10 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                    : 'border-slate-800 bg-slate-800/60 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <Building2 className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-[9px] text-purple-400">يدوي</span>
                </div>
                <div className="font-bold">تحويل مصرفي</div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('payoneer')}
                className={`p-2.5 rounded-xl border text-right transition-all ${
                  paymentMethod === 'payoneer'
                    ? 'border-cyan-400 bg-cyan-500/10 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                    : 'border-slate-800 bg-slate-800/60 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-[9px] text-orange-400">يدوي</span>
                </div>
                <div className="font-bold">Payoneer</div>
              </button>
            </div>

            {/* Manual Payment Reference Input */}
            {isManualPayment && (
              <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-2 text-xs">
                <div className="flex items-start gap-1.5 text-amber-300 text-[11px]">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                  <span>وسائل الدفع اليدوي معروضة للتجهيز فقط؛ لا تستخدمها الآن لأن إنشاء الطلب وتسليم المنتج غير مفعّلين.</span>
                </div>
              </div>
            )}

            {paymentMethod === 'atlos_crypto' && (
              <div className="p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-[11px] text-cyan-300 flex items-center gap-2">
                <Coins className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>ATLOS غير مفعّلة؛ لا يتم قبول أو تأكيد أي دفعة مشفرة حاليًا.</span>
              </div>
            )}
          </div>

          {/* Sticky Price & Action Bar (Screen 4 buttons: إرسال كهدية & شراء الآن) */}
          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs text-slate-400 block">السعر الإجمالي للباقة:</span>
              <span className="text-xl sm:text-2xl font-black font-mono text-cyan-400">
                {formatPrice(selectedPackage.priceUSD)}
              </span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleSendAsGift}
                className="flex-1 sm:flex-none px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 border border-slate-700 transition-colors"
              >
                <Gift className="w-4 h-4 text-purple-400" />
                <span>إرسال كهدية</span>
              </button>

              <button
                type="button"
                onClick={handleBuyNow}
                disabled
                className="flex-1 sm:flex-none px-7 py-3 rounded-xl bg-slate-700 text-slate-300 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 opacity-60 cursor-not-allowed"
              >
                <Zap className="w-4 h-4" />
                <span>الشراء غير متاح مؤقتًا</span>
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
