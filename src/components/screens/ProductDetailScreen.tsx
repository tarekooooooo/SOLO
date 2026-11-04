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
  Info
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Product, ProductPackage } from '../../types';

export const ProductDetailScreen: React.FC = () => {
  const { 
    products, 
    selectedProductId, 
    setActiveScreen, 
    formatPrice, 
    createOrder, 
    customerBalanceUSD, 
    showToast 
  } = useStore();

  const product: Product = products.find((p: Product) => p.id === selectedProductId) || products[0];

  const [selectedPackage, setSelectedPackage] = useState<ProductPackage>(
    product.packages[2] || product.packages[0]
  );
  const [playerId, setPlayerId] = useState('519284710');
  const [playerName, setPlayerName] = useState('Sniper_KSA');
  const [isVerifyingId, setIsVerifyingId] = useState(false);
  const [idVerified, setIdVerified] = useState(true);

  const isDirectRecharge = product.deliveryType === 'direct_id_recharge';

  const handleVerifyPlayerId = () => {
    if (!playerId) return;
    setIsVerifyingId(true);
    setTimeout(() => {
      setIsVerifyingId(false);
      setIdVerified(true);
      setPlayerName('Sniper_KSA');
      showToast(`تم التحقق من الحساب بنجاح: Sniper_KSA (سيرفر الشرق الأوسط)`);
    }, 800);
  };

  const handleBuyNow = () => {
    if (isDirectRecharge && (!playerId || !idVerified)) {
      showToast('يرجى إدخال والتحقق من معرف اللاعب (Player ID) أولاً!');
      return;
    }

    // Check balance
    const cost = selectedPackage.priceUSD;
    if (customerBalanceUSD < cost) {
      showToast('رصيدك في المحفظة غير كافٍ. يمكنك شحن المحفظة أولاً من شاشة المحفظة.');
      setActiveScreen('wallet');
      return;
    }

    createOrder({
      customerId: 'usr-tarek',
      customerName: 'طارق الأحمد',
      customerPhone: '+966551234567',
      customerEmail: 'tarekai042@gmail.com',
      productId: product.id,
      productName: product.titleAr,
      packageId: selectedPackage.id,
      packageName: selectedPackage.name,
      platform: product.platform,
      priceUSD: selectedPackage.priceUSD,
      deliveryType: product.deliveryType,
      targetPlayerId: isDirectRecharge ? playerId : undefined,
      targetPlayerName: isDirectRecharge ? playerName : undefined,
      isGift: false,
      paymentMethod: 'المحفظة الإلكترونية',
    });

    // Navigate to admin fulfillment or wallet
    setActiveScreen('admin');
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
                      {pkg.availableCodes && (
                        <span className="text-[10px] font-mono text-cyan-400 block">
                          {pkg.availableCodes.length} كود متوفر
                        </span>
                      )}
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
                className="flex-1 sm:flex-none px-7 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-2 transition-all hover:scale-105"
              >
                <Zap className="w-4 h-4" />
                <span>شراء الآن</span>
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
