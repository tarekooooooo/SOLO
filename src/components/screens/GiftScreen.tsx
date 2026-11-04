import React, { useState } from 'react';
import { 
  ArrowRight, 
  Gift, 
  User, 
  Mail, 
  Phone, 
  Link, 
  Gamepad2, 
  Send, 
  Sparkles, 
  CheckCircle2, 
  Heart,
  MessageSquareQuote
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export const GiftScreen: React.FC = () => {
  const { 
    products, 
    selectedProductId, 
    setActiveScreen, 
    formatPrice, 
    createOrder, 
    customerBalanceUSD, 
    showToast 
  } = useStore();

  const product = products.find((p) => p.id === selectedProductId) || products[0];
  const pkg = product.packages[1] || product.packages[0];

  const [deliveryMethod, setDeliveryMethod] = useState<'id' | 'email' | 'phone' | 'link' | 'platform'>('id');
  const [recipientValue, setRecipientValue] = useState('519284710');
  const [giftNote, setGiftNote] = useState('كل عام وأنت بألف خير يا بطل! 🎮 هدية خاصة من طارق ستور.');
  const [senderName, setSenderName] = useState('صديقك المخلص');

  const methods = [
    { id: 'id', name: 'معرّف اللاعب (Player ID)', icon: <User className="w-4 h-4" />, placeholder: 'أدخل معرّف اللاعب (Player ID) للعبة' },
    { id: 'email', name: 'البريد الإلكتروني', icon: <Mail className="w-4 h-4" />, placeholder: 'أدخل بريد المستلم الإلكتروني' },
    { id: 'phone', name: 'رقم الهاتف / واتساب', icon: <Phone className="w-4 h-4" />, placeholder: '+966 5x xxx xxxx' },
    { id: 'link', name: 'توليد رابط هدية فوري', icon: <Link className="w-4 h-4" />, placeholder: 'سيتم إنشاء رابط خاص لمشاركته مع المستلم' },
    { id: 'platform', name: 'حساب المنصة (PSN / Steam)', icon: <Gamepad2 className="w-4 h-4" />, placeholder: 'أدخل اسم المستخدم على المنصة' },
  ];

  const handleConfirmGift = (e: React.FormEvent) => {
    e.preventDefault();

    if (customerBalanceUSD < pkg.priceUSD) {
      showToast('رصيد المحفظة غير كافٍ لإرسال الهدية. يرجى شحن الرصيد أولاً.');
      setActiveScreen('wallet');
      return;
    }

    createOrder({
      customerId: 'usr-tarek',
      customerName: `طارق (مرسل هدية إلى ${recipientValue})`,
      customerEmail: 'tarekai042@gmail.com',
      productId: product.id,
      productName: product.titleAr,
      packageId: pkg.id,
      packageName: pkg.name,
      platform: product.platform,
      priceUSD: pkg.priceUSD,
      deliveryType: product.deliveryType,
      targetPlayerId: deliveryMethod === 'id' ? recipientValue : undefined,
      isGift: true,
      giftRecipient: `${deliveryMethod.toUpperCase()}: ${recipientValue}`,
      giftNote: `${giftNote} (المرسل: ${senderName})`,
      paymentMethod: 'المحفظة الإلكترونية',
    });

    showToast('تم إرسال الهدية بنجاح! 🎁 سيصل الإشعار للمستلم فوراً.');
    setActiveScreen('admin');
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-12">
      
      {/* Top Bar matching Screen 5 */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setActiveScreen('product')}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة للمنتج</span>
        </button>
        <div className="flex items-center gap-2">
          <Gift className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-bold text-white">إرسال كهدية</span>
        </div>
        <span className="font-mono text-xs text-cyan-400">PAGE 05 // GIFT</span>
      </div>

      {/* Gift Preview Box */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 border border-purple-500/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl overflow-hidden bg-black/60 border border-purple-500/40 p-1">
            <img
              src={product.image}
              alt={product.titleAr}
              className="w-full h-full object-cover rounded-lg"
            />
          </div>
          <div>
            <span className="text-[10px] text-purple-300 font-semibold block uppercase">هدية رقمية فورية</span>
            <h3 className="text-sm font-bold text-white">{product.titleAr}</h3>
            <p className="text-xs text-cyan-400 font-mono font-semibold">{pkg.name}</p>
          </div>
        </div>

        <div className="text-left font-mono">
          <span className="text-[10px] text-slate-400 block">القيمة</span>
          <span className="text-base font-extrabold text-cyan-300">{formatPrice(pkg.priceUSD)}</span>
        </div>
      </div>

      {/* Gift Form */}
      <form onSubmit={handleConfirmGift} className="p-6 rounded-3xl bg-[#0f1523] border border-cyan-500/20 space-y-5 shadow-xl">
        
        {/* اختر طريقة الإرسال (Screen 5 in mockup) */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-200 block">اختر طريقة الإرسال:</label>
          <div className="grid grid-cols-1 gap-2">
            {methods.map((m) => {
              const isSelected = deliveryMethod === m.id;
              return (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setDeliveryMethod(m.id as any)}
                  className={`flex items-center justify-between p-3 rounded-xl border text-right transition-all ${
                    isSelected
                      ? 'border-purple-400 bg-purple-950/40 text-white shadow-md'
                      : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={isSelected ? 'text-purple-300' : 'text-slate-400'}>
                      {m.icon}
                    </span>
                    <span className="text-xs font-semibold">{m.name}</span>
                  </div>

                  <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    isSelected ? 'border-purple-400 bg-purple-500' : 'border-slate-700'
                  }`}>
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-black" />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Input for recipient value */}
        <div>
          <label className="text-xs font-bold text-slate-200 block mb-1.5">
            {methods.find((m) => m.id === deliveryMethod)?.name}:
          </label>
          <input
            type="text"
            required
            value={recipientValue}
            onChange={(e) => setRecipientValue(e.target.value)}
            placeholder={methods.find((m) => m.id === deliveryMethod)?.placeholder}
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 font-mono focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Sender Name */}
        <div>
          <label className="text-xs font-bold text-slate-200 block mb-1.5">اسمك كمرسل (ليظهر للمستلم):</label>
          <input
            type="text"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            placeholder="مثال: طارق، أو صديق مجهول"
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Gift Note */}
        <div>
          <label className="text-xs font-bold text-slate-200 block mb-1.5 flex items-center gap-1.5">
            <MessageSquareQuote className="w-4 h-4 text-purple-400" />
            <span>أدخل رسالة الهدية (اختياري):</span>
          </label>
          <textarea
            rows={2}
            value={giftNote}
            onChange={(e) => setGiftNote(e.target.value)}
            placeholder="اكتب تهنئة أو رسالة تشجيعية..."
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Action Button: تأكيد الإرسال */}
        <div className="pt-2">
          <button
            type="submit"
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold text-xs sm:text-sm tracking-wide shadow-xl shadow-purple-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
          >
            <Send className="w-4 h-4" />
            <span>تأكيد الإرسال الآن ({formatPrice(pkg.priceUSD)})</span>
          </button>
        </div>

      </form>

    </div>
  );
};
