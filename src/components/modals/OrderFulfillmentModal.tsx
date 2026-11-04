import React, { useState } from 'react';
import { 
  X, 
  CheckCircle, 
  AlertCircle, 
  Send, 
  Key, 
  Smartphone, 
  User, 
  Clock, 
  Zap, 
  ShieldCheck, 
  Copy, 
  Check, 
  RotateCcw,
  Sparkles,
  Gift
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Order } from '../../types';

export const OrderFulfillmentModal: React.FC = () => {
  const { 
    selectedOrderForFulfillment, 
    setSelectedOrderForFulfillment,
    fulfillDirectRecharge,
    fulfillInstantCode,
    startProcessingOrder,
    cancelOrder,
    products,
    formatPrice,
    showToast
  } = useStore();

  const [activeStep, setActiveStep] = useState<number>(1);
  const [fulfillmentNote, setFulfillmentNote] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [apiSimulating, setApiSimulating] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [rechargeSuccess, setRechargeSuccess] = useState(false);

  if (!selectedOrderForFulfillment) return null;

  const order = selectedOrderForFulfillment;
  const isDirectRecharge = order.deliveryType === 'direct_id_recharge';
  const targetProduct = products.find((p) => p.id === order.productId);
  const targetPackage = targetProduct?.packages.find((p) => p.id === order.packageId);
  const availableStockCodes = targetPackage?.availableCodes || [];

  const handleSimulateApiRecharge = () => {
    setApiSimulating(true);
    setTimeout(() => {
      setApiSimulating(false);
      setRechargeSuccess(true);
      setFulfillmentNote(`تم الشحن التلقائي بنجاح لمعرف اللاعب: ${order.targetPlayerId} عبر سيرفر الشرق الأوسط.`);
      showToast('تم التحقق من معرف اللاعب وشحن الشدات بنجاح عبر API! ⚡');
    }, 1200);
  };

  const handleCompleteRecharge = () => {
    fulfillDirectRecharge(order.id, fulfillmentNote);
    setSelectedOrderForFulfillment(null);
  };

  const handleCompleteCode = (codeToUse?: string) => {
    const finalCode = codeToUse || manualCode || (availableStockCodes.length > 0 ? availableStockCodes[0] : '');
    if (!finalCode) {
      showToast('يرجى تحديد أو إدخال كود رقمي للتسليم!');
      return;
    }
    fulfillInstantCode(order.id, finalCode, fulfillmentNote);
    setSelectedOrderForFulfillment(null);
  };

  const handleCancel = () => {
    if (confirm(`هل أنت متأكد من إلغاء الطلب ${order.orderNumber} واسترجاع المبلغ للعميل؟`)) {
      cancelOrder(order.id, 'تم إلغاء الطلب بواسطة إدارة المتجر واسترجاع المبلغ للمحفظة.');
      setSelectedOrderForFulfillment(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-[#0f172a] border border-cyan-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0a0f1d] border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">تجهيز طلب العميل الفعال</h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  {order.orderNumber}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isDirectRecharge ? 'شحن فوري ومباشر لمعرف اللعبة (Player ID)' : 'تسليم كود رقمي فوري من بنك الأكواد'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSelectedOrderForFulfillment(null)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4-Step Interactive Progress Bar */}
        <div className="px-6 py-3 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              activeStep >= 1 ? 'bg-cyan-500 text-black' : 'bg-slate-800 text-slate-400'
            }`}>1</span>
            <span className={activeStep >= 1 ? 'text-cyan-300 font-semibold' : 'text-slate-400'}>التحقق من الطلب</span>
          </div>
          <span className="text-slate-600">←</span>
          <div className="flex items-center gap-2">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              activeStep >= 2 ? 'bg-cyan-500 text-black' : 'bg-slate-800 text-slate-400'
            }`}>2</span>
            <span className={activeStep >= 2 ? 'text-cyan-300 font-semibold' : 'text-slate-400'}>
              {isDirectRecharge ? 'شحن الآيدي' : 'تجهيز الكود'}
            </span>
          </div>
          <span className="text-slate-600">←</span>
          <div className="flex items-center gap-2">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              activeStep >= 3 ? 'bg-cyan-500 text-black' : 'bg-slate-800 text-slate-400'
            }`}>3</span>
            <span className={activeStep >= 3 ? 'text-cyan-300 font-semibold' : 'text-slate-400'}>التسليم والإشعار</span>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[65vh]">
          
          {/* Order Details Card */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-300">تفاصيل المنتج المطلوب:</span>
              <span className="font-mono text-cyan-400 font-bold text-sm">{formatPrice(order.priceUSD)}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">{order.productName}</h4>
                <p className="text-xs text-cyan-400 font-semibold mt-0.5">{order.packageName}</p>
              </div>
              <div className="text-left text-xs text-slate-400">
                <span>طريقة الدفع: </span>
                <span className="text-slate-200 font-semibold">{order.paymentMethod}</span>
              </div>
            </div>

            {/* Customer & Delivery specifics */}
            <div className="pt-3 border-t border-slate-800 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block">العميل:</span>
                <span className="text-slate-200 font-semibold flex items-center gap-1.5 mt-0.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  {order.customerName}
                </span>
                {order.customerPhone && (
                  <span className="text-slate-400 font-mono text-[11px] block mt-0.5">{order.customerPhone}</span>
                )}
              </div>

              {isDirectRecharge ? (
                <div>
                  <span className="text-slate-400 block">معرّف اللعبة (Player ID):</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono font-bold text-cyan-300 text-sm bg-cyan-950/80 px-2.5 py-1 rounded border border-cyan-800">
                      {order.targetPlayerId || '519284710'}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(order.targetPlayerId || '519284710');
                        setCopiedCode(true);
                        setTimeout(() => setCopiedCode(false), 2000);
                      }}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                      title="نسخ الآيدي"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {order.targetPlayerName && (
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      اسم اللاعب: <strong className="text-slate-300">{order.targetPlayerName}</strong>
                    </span>
                  )}
                </div>
              ) : (
                <div>
                  <span className="text-slate-400 block">نوع التسليم:</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1.5 mt-0.5">
                    <Key className="w-3.5 h-3.5" />
                    كود تفعيل رقمي فوري
                  </span>
                  {order.isGift && (
                    <span className="text-purple-300 text-[11px] flex items-center gap-1 mt-1">
                      <Gift className="w-3 h-3" /> هدية للمستلم: {order.giftRecipient}
                    </span>
                  )}
                </div>
              )}
            </div>

            {order.giftNote && (
              <div className="p-2.5 rounded-lg bg-purple-950/40 border border-purple-800/40 text-xs text-purple-200">
                <strong>رسالة الهدية المرفقة:</strong> {order.giftNote}
              </div>
            )}
          </div>

          {/* Fulfillment Execution Box */}
          {isDirectRecharge ? (
            /* Direct Game ID Recharge Workflow */
            <div className="p-4 rounded-xl bg-slate-900 border border-cyan-500/20 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  خيارات شحن حساب اللاعب الفعال:
                </h4>
                <span className="text-[11px] text-slate-400 font-mono">PUBG API Direct</span>
              </div>

              {/* Automated Option */}
              <div className="p-3.5 rounded-lg bg-cyan-950/30 border border-cyan-800/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs">
                    <span className="font-bold text-white block">1. الشحن التلقائي السريع عبر خادم الـ API</span>
                    <span className="text-slate-400 text-[11px]">يتم إرسال {order.packageName} مباشرة إلى حساب اللاعب {order.targetPlayerId}</span>
                  </div>
                  <button
                    onClick={handleSimulateApiRecharge}
                    disabled={apiSimulating || rechargeSuccess}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      rechargeSuccess
                        ? 'bg-emerald-600 text-white'
                        : apiSimulating
                        ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                        : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/30'
                    }`}
                  >
                    {rechargeSuccess ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        تم الشحن بنجاح!
                      </>
                    ) : apiSimulating ? (
                      <>
                        <Clock className="w-3.5 h-3.5 animate-spin" />
                        جاري الإرسال...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        تنفيذ الشحن الآن
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Notes or verification screenshot */}
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  ملاحظات التجهيز أو رقم العملية المرجعي (اختياري للعميل):
                </label>
                <input
                  type="text"
                  value={fulfillmentNote}
                  onChange={(e) => setFulfillmentNote(e.target.value)}
                  placeholder="مثال: تم الشحن بنجاح عبر سيرفر الشرق الأوسط برقم مرجعي #99281"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          ) : (
            /* Digital Code Pool Fulfillment */
            <div className="p-4 rounded-xl bg-slate-900 border border-cyan-500/20 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <Key className="w-4 h-4 text-cyan-400" />
                  بنك الأكواد الرقمية المتاحة للتسليم:
                </h4>
                <span className="text-[11px] text-cyan-400 font-mono">
                  {availableStockCodes.length} كود متوفر بالمخزن
                </span>
              </div>

              {availableStockCodes.length > 0 ? (
                <div className="space-y-2">
                  <span className="text-[11px] text-slate-400 block">اختر كوداً لتسليمه للعميل بنقرة واحدة:</span>
                  <div className="grid grid-cols-1 gap-2">
                    {availableStockCodes.slice(0, 3).map((c, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-cyan-500/50 transition-colors"
                      >
                        <span className="font-mono text-xs font-bold text-cyan-300">{c}</span>
                        <button
                          onClick={() => handleCompleteCode(c)}
                          className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded transition-colors"
                        >
                          تسليم هذا الكود
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/40 text-xs text-amber-200">
                  لا توجد أكواد مسبقة في المخزن لهذه الباقة. يمكنك كتابة أو توليد كود مخصص أدناه:
                </div>
              )}

              {/* Manual code entry */}
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  أو أدخل كود تفعيل مخصص / تسليم فوري:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="مثال: STM-9912-4412-KLP9"
                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    onClick={() => {
                      const gen = `TRK-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
                      setManualCode(gen);
                    }}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg"
                  >
                    توليد كود
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer with Actions */}
        <div className="px-6 py-4 bg-[#0a0f1d] border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={handleCancel}
            className="px-3.5 py-2 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            إلغاء واسترجاع للمحفظة
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedOrderForFulfillment(null)}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              إغلاق
            </button>

            {isDirectRecharge ? (
              <button
                onClick={handleCompleteRecharge}
                className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg shadow-lg shadow-cyan-600/30 flex items-center gap-1.5 transition-all"
              >
                <CheckCircle className="w-4 h-4" />
                تأكيد اكتمال الشحن وتسليم الطلب
              </button>
            ) : (
              <button
                onClick={() => handleCompleteCode()}
                className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg shadow-lg shadow-cyan-600/30 flex items-center gap-1.5 transition-all"
              >
                <Send className="w-4 h-4" />
                إرسال الكود وإكمال الطلب
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
