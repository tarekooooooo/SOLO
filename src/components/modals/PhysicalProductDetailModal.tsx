import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { 
  X, 
  Truck, 
  ShieldCheck, 
  Star, 
  CheckCircle2, 
  MapPin, 
  Package, 
  CreditCard, 
  Wallet, 
  Info,
  ChevronRight,
  Clock,
  Sparkles
} from 'lucide-react';
import { PhysicalProduct, ShippingAddress } from '../../types';

interface PhysicalProductDetailModalProps {
  product: PhysicalProduct | null;
  onClose: () => void;
}

const ARAB_COUNTRIES = [
  { code: 'SA', name: 'المملكة العربية السعودية', baseShipping: 6.50, days: '4 - 7 أيام' },
  { code: 'AE', name: 'الإمارات العربية المتحدة', baseShipping: 5.80, days: '4 - 6 أيام' },
  { code: 'KW', name: 'دولة الكويت', baseShipping: 5.00, days: '4 - 7 أيام' },
  { code: 'QA', name: 'دولة قطر', baseShipping: 6.00, days: '5 - 7 أيام' },
  { code: 'BH', name: 'مملكة البحرين', baseShipping: 5.50, days: '4 - 6 أيام' },
  { code: 'OM', name: 'سلطنة عمان', baseShipping: 6.20, days: '5 - 8 أيام' },
  { code: 'EG', name: 'جمهورية مصر العربية', baseShipping: 7.50, days: '6 - 10 أيام' },
  { code: 'JO', name: 'المملكة الأردنية الهاشمية', baseShipping: 7.00, days: '6 - 9 أيام' },
];

export const PhysicalProductDetailModal: React.FC<PhysicalProductDetailModalProps> = ({
  product,
  onClose,
}) => {
  const { 
    formatPrice, 
    createPhysicalOrder, 
    customerBalanceUSD, 
    currentUser,
    showToast 
  } = useStore();

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [activeStep, setActiveStep] = useState<'details' | 'shipping' | 'success'>('details');

  // Shipping form state
  const [selectedCountry, setSelectedCountry] = useState(ARAB_COUNTRIES[0]);
  const [fullName, setFullName] = useState(currentUser?.name || 'طارق الأحمد');
  const [phone, setPhone] = useState(currentUser?.phone || '+966551234888');
  const [city, setCity] = useState('الرياض');
  const [district, setDistrict] = useState('حي الملقا');
  const [streetAddress, setStreetAddress] = useState('طريق أنس بن مالك، مبنى 22');
  const [postalCode, setPostalCode] = useState('13524');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'card' | 'apple_pay'>('wallet');
  const [placedOrderNumber, setPlacedOrderNumber] = useState('');

  if (!product) return null;

  // Initialize variants if empty
  const getSelectedVariantText = () => {
    if (!product.variants || product.variants.length === 0) return 'النسخة القياسية';
    return Object.entries(selectedVariants)
      .map(([name, opt]) => `${name}: ${opt}`)
      .join(' | ') || product.variants.map((v) => `${v.name}: ${v.options[0]}`).join(' | ');
  };

  const images = product.galleryImages && product.galleryImages.length > 0 
    ? product.galleryImages 
    : [product.image];

  const shippingCost = selectedCountry.baseShipping;
  const subtotal = product.priceUSD * quantity;
  const grandTotalUSD = subtotal + shippingCost;

  const handlePlaceOrder = () => {
    if (!fullName || !phone || !city || !streetAddress) {
      showToast('يرجى تعبئة جميع بيانات الشحن الإلزامية');
      return;
    }

    if (paymentMethod === 'wallet' && customerBalanceUSD < grandTotalUSD) {
      showToast('رصيدك في المحفظة غير كافٍ، يمكنك استخدام البطاقة البنكية أو شحن المحفظة.');
      return;
    }

    const shippingAddress: ShippingAddress = {
      fullName,
      phone,
      country: selectedCountry.name,
      city,
      district,
      streetAddress,
      postalCode,
      notes,
    };

    const newOrder = createPhysicalOrder({
      customerId: currentUser?.id || 'guest-user',
      customerName: fullName,
      customerEmail: currentUser?.email || 'customer@tarekstore.com',
      customerPhone: phone,
      productId: product.id,
      productTitle: product.titleAr,
      productImage: product.image,
      selectedVariant: getSelectedVariantText(),
      quantity,
      priceUSD: subtotal,
      shippingFeeUSD: shippingCost,
      totalUSD: grandTotalUSD,
      shippingAddress,
      paymentMethod: paymentMethod === 'wallet' 
        ? 'رصيد المحفظة الإلكترونية' 
        : paymentMethod === 'apple_pay' 
        ? 'Apple Pay' 
        : 'بطاقة مدى / ائتمانية',
    });

    setPlacedOrderNumber(newOrder.orderNumber);
    setActiveStep('success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative w-full max-w-4xl max-h-[92vh] overflow-hidden rounded-2xl bg-[#0e131f] border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.15)] flex flex-col text-right font-sans"
        dir="rtl"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>{product.titleAr}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-mono">
                  CJ SKU: {product.cjSku}
                </span>
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span className="flex items-center gap-1 text-amber-400">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  {product.rating}
                </span>
                <span>•</span>
                <span>{product.reviewsCount} تقييم مشترين</span>
                <span>•</span>
                <span className="text-emerald-400 font-medium">متوفر بالمخزون ({product.stock} قطعة)</span>
              </div>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeStep === 'details' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Left Column: Gallery Images */}
              <div className="md:col-span-5 space-y-3">
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-inner group">
                  <img 
                    src={images[activeImageIndex]} 
                    alt={product.titleAr}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                  />
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-[11px] font-bold text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                    <Truck className="w-3 h-3 text-cyan-400" />
                    <span>شحن جوي سريع</span>
                  </div>
                  <div className="absolute bottom-3 left-3 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-[10px] text-slate-300">
                    وزن الشحنة: {product.weightKg} كجم
                  </div>
                </div>

                {images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveImageIndex(idx)}
                        className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                          activeImageIndex === idx 
                            ? 'border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.5)]' 
                            : 'border-slate-800 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Guarantee Box */}
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 space-y-2">
                  <div className="flex items-center gap-2 text-cyan-300 font-semibold">
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    <span>ضمان الجودة والتوصيل من CJ:</span>
                  </div>
                  <ul className="space-y-1 text-[11px] text-slate-400 list-disc list-inside">
                    <li>تتبع لحظي بالرقم التسلسلي حتى باب منزلك</li>
                    <li>تغليف ألعاب مقاوم للصدمات والكسر</li>
                    <li>استبدال فوري في حال وجود أي عيب مصنعي</li>
                  </ul>
                </div>
              </div>

              {/* Right Column: Product Specs & Options */}
              <div className="md:col-span-7 space-y-5">
                {/* Price Display */}
                <div className="flex items-baseline gap-3 p-4 rounded-xl bg-slate-900/70 border border-slate-800">
                  <span className="text-3xl font-extrabold text-cyan-400">
                    {formatPrice(product.priceUSD)}
                  </span>
                  {product.originalPriceUSD > product.priceUSD && (
                    <span className="text-sm line-through text-slate-500">
                      {formatPrice(product.originalPriceUSD)}
                    </span>
                  )}
                  <span className="mr-auto text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    خصم {Math.round(((product.originalPriceUSD - product.priceUSD) / product.originalPriceUSD) * 100)}% لفترة محدودة
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-300 leading-relaxed">
                  {product.description}
                </p>

                {/* Key Features */}
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-200">المميزات الرئيسية:</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {product.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/50 border border-slate-800/80 text-slate-300 text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Variants Selection */}
                {product.variants.map((variant) => (
                  <div key={variant.id} className="space-y-2">
                    <div className="text-xs font-bold text-slate-200">
                      اختر {variant.name}:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {variant.options.map((opt) => {
                        const isSelected = (selectedVariants[variant.name] || variant.options[0]) === opt;
                        return (
                          <button
                            key={opt}
                            onClick={() => setSelectedVariants(prev => ({ ...prev, [variant.name]: opt }))}
                            className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                              isSelected
                                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                                : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-slate-500'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Shipping Estimator to Arab Countries */}
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-200 flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-cyan-400" />
                      حاسبة الشحن والتوصيل (CJ Packet Express):
                    </span>
                    <span className="text-cyan-400 font-mono text-[11px]">{selectedCountry.days}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">دولة الشحن والتوصيل:</label>
                      <select 
                        value={selectedCountry.code}
                        onChange={(e) => {
                          const found = ARAB_COUNTRIES.find(c => c.code === e.target.value);
                          if (found) setSelectedCountry(found);
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500"
                      >
                        {ARAB_COUNTRIES.map(c => (
                          <option key={c.code} value={c.code}>
                            {c.name} ({formatPrice(c.baseShipping)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">الكمية المطلوبة:</label>
                      <div className="flex items-center gap-3 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
                        <button 
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          className="w-6 h-6 rounded-lg bg-slate-700 text-white font-bold text-sm hover:bg-slate-600 flex items-center justify-center"
                        >
                          -
                        </button>
                        <span className="flex-1 text-center font-bold text-white text-sm">{quantity}</span>
                        <button 
                          onClick={() => setQuantity(quantity + 1)}
                          className="w-6 h-6 rounded-lg bg-slate-700 text-white font-bold text-sm hover:bg-slate-600 flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2">
                  <button
                    onClick={() => setActiveStep('shipping')}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm shadow-[0_0_25px_rgba(6,182,212,0.4)] transition-all flex items-center justify-center gap-2 group"
                  >
                    <span>متابعة الشراء وإدخال عنوان الشحن</span>
                    <ChevronRight className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: SHIPPING ADDRESS & PAYMENT */}
          {activeStep === 'shipping' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <button
                  onClick={() => setActiveStep('details')}
                  className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
                >
                  &larr; العودة لتفاصيل المنتج
                </button>
                <span className="text-xs text-slate-400">خطوة 2 من 2: بيانات التوصيل والدفع</span>
              </div>

              {/* Order Summary Pill */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center gap-3">
                  <img src={product.image} alt="" className="w-12 h-12 rounded-lg object-cover border border-slate-700" />
                  <div>
                    <div className="text-xs font-bold text-white">{product.titleAr}</div>
                    <div className="text-[11px] text-cyan-400">{getSelectedVariantText()} • عدد: {quantity}</div>
                  </div>
                </div>
                <div className="text-left font-mono">
                  <div className="text-xs text-slate-400">الإجمالي مع الشحن:</div>
                  <div className="text-base font-bold text-cyan-400">{formatPrice(grandTotalUSD)}</div>
                </div>
              </div>

              {/* Shipping Address Inputs */}
              <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-cyan-400" />
                  <span>عنوان استلام الشحنة:</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-300">الاسم الكامل للمستلم *</label>
                    <input 
                      type="text" 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="محمد عبد الله"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-300">رقم الهاتف (للتواصل مع المندوب) *</label>
                    <input 
                      type="tel" 
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+9665xxxxxxxx"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-300">الدولة</label>
                    <input 
                      type="text" 
                      disabled
                      value={selectedCountry.name}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700 text-slate-400 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-300">المدينة *</label>
                    <input 
                      type="text" 
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="الرياض / جدة / دبي"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-300">الحي / المنطقة</label>
                    <input 
                      type="text" 
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      placeholder="حي النرجس"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-300">الرمز البريدي</label>
                    <input 
                      type="text" 
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      placeholder="12345"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none font-mono"
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[11px] text-slate-300">الشارع ورقم المبنى / الشقة *</label>
                    <input 
                      type="text" 
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      placeholder="شارع الملك فهد، مبنى رقم 15، شقة 4"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[11px] text-slate-300">ملاحظات تسليم إضافية للمندوب (اختياري)</label>
                    <input 
                      type="text" 
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="يرجى الاتصال قبل الوصول بنصف ساعة"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-cyan-400" />
                  <span>طريقة الدفع:</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('wallet')}
                    className={`p-3 rounded-xl border text-right transition-all ${
                      paymentMethod === 'wallet'
                        ? 'border-cyan-400 bg-cyan-500/10 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                        : 'border-slate-800 bg-slate-800/60 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Wallet className="w-4 h-4 text-cyan-400" />
                      <span className="text-[10px] text-slate-400">رصيدك: {formatPrice(customerBalanceUSD)}</span>
                    </div>
                    <div className="font-bold">المحفظة الإلكترونية</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">خصم مباشر وفوري</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`p-3 rounded-xl border text-right transition-all ${
                      paymentMethod === 'card'
                        ? 'border-cyan-400 bg-cyan-500/10 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                        : 'border-slate-800 bg-slate-800/60 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <CreditCard className="w-4 h-4 text-emerald-400" />
                      <span className="text-[10px] text-emerald-400">مدى / فيزا</span>
                    </div>
                    <div className="font-bold">بطاقة بنكية / مدى</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">بوابة دفع آمنة 3D Secure</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('apple_pay')}
                    className={`p-3 rounded-xl border text-right transition-all ${
                      paymentMethod === 'apple_pay'
                        ? 'border-cyan-400 bg-cyan-500/10 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                        : 'border-slate-800 bg-slate-800/60 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Sparkles className="w-4 h-4 text-white" />
                      <span className="text-[10px] text-slate-400">سريع بنقرة</span>
                    </div>
                    <div className="font-bold">Apple Pay</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">الدفع الآمن للأجهزة</div>
                  </button>
                </div>
              </div>

              {/* Total Calculation & Checkout Button */}
              <div className="p-4 rounded-xl bg-slate-900 border border-cyan-500/30 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">المجموع النهائي المستحق:</div>
                  <div className="text-2xl font-extrabold text-cyan-400">{formatPrice(grandTotalUSD)}</div>
                </div>

                <button
                  type="button"
                  onClick={handlePlaceOrder}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-sm shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all flex items-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>تأكيد الطلب وشحنه الآن عبر CJ</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: ORDER SUCCESS */}
          {activeStep === 'success' && (
            <div className="max-w-md mx-auto py-8 text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-white mb-1">تم تأكيد طلبك بنجاح! 🎉</h3>
                <p className="text-xs text-slate-300">
                  تم إرسال الطلب أوتوماتيكياً إلى مستودعات <strong className="text-cyan-400">CJ Dropshipping</strong> لتجهيز الطرد وإصدار بوليصة الشحن السريع.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-right space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>رقم الطلب:</span>
                  <span className="font-mono text-cyan-400 font-bold">{placedOrderNumber}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>شركة التوصيل:</span>
                  <span className="text-white">CJ Packet Fast Line</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>مدة الشحن المتوقعة:</span>
                  <span className="text-emerald-400 font-medium">{selectedCountry.days}</span>
                </div>
                <div className="flex justify-between text-slate-400 border-t border-slate-800 pt-2">
                  <span>العنوان:</span>
                  <span className="text-white truncate max-w-[200px]">{selectedCountry.name} - {city} - {streetAddress}</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors"
                >
                  العودة لتصفح المنتجات المادية
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
