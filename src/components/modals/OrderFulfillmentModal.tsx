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
    formatPrice,
    showToast
  } = useStore();

  const activeStep = 1;
  const [copiedCode, setCopiedCode] = useState(false);

  if (!selectedOrderForFulfillment) return null;

  const order = selectedOrderForFulfillment;
  const isDirectRecharge = order.deliveryType === 'direct_id_recharge';
  const handleSimulateApiRecharge = () => {
    showToast('المحاكاة والشحن المباشر متوقفان؛ لم يتم الاتصال بمزود أو شحن الحساب.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-[#0f172a] border border-cyan-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        <div role="status" className="mx-4 mt-4 rounded-xl border border-amber-500/40 bg-amber-950/30 px-3 py-2 text-xs leading-relaxed text-amber-200">
          نافذة تجهيز المعاينة فقط. الشحن المباشر وتسليم الأكواد والإلغاء/الاسترداد غير موصولة بقاعدة البيانات، فلا تعتمد الأزرار كتنفيذ فعلي.
        </div>
        
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
                      {order.targetPlayerId || 'غير مسجل'}
                    </span>
                    <button
                      onClick={() => {
                        if (!order.targetPlayerId) return;
                        navigator.clipboard?.writeText(order.targetPlayerId);
                        setCopiedCode(true);
                        setTimeout(() => setCopiedCode(false), 2000);
                      }}
                      disabled={!order.targetPlayerId}
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
                  شحن حساب اللاعب:
                  </h4>
                <span className="text-[11px] text-slate-400 font-mono">غير مهيأ</span>
              </div>

              {/* Automated Option */}
              <div className="p-3.5 rounded-lg bg-cyan-950/30 border border-cyan-800/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs">
                    <span className="font-bold text-white block">الشحن المباشر غير متاح</span>
                  <span className="text-slate-400 text-[11px]">خدمة الشحن المباشر غير مهيأة أو موصولة بمزود فعلي.</span>
                  </div>
                  <button
                    onClick={handleSimulateApiRecharge}
                    disabled
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-slate-700 text-slate-400 cursor-not-allowed"
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    غير متاح
                  </button>
                </div>
              </div>

              <div className="text-xs text-amber-200">لا توجد خدمة شحن موصولة؛ لم يتم إرسال عملية.</div>
            </div>
          ) : (
            /* Digital Code Pool Fulfillment */
            <div className="p-4 rounded-xl bg-slate-900 border border-cyan-500/20 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <Key className="w-4 h-4 text-cyan-400" />
                  تسليم الأكواد الرقمية:
                </h4>
                <span className="text-[11px] text-amber-300 font-mono">غير مهيأ</span>
              </div>
              <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/40 text-xs text-amber-200">
                لا يوجد مخزون أكواد آمن مرتبط بالخادم. لا تُعرض أكواد المعاينة ولا يمكن تسليمها.
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer with Actions */}
        <div className="px-6 py-4 bg-[#0a0f1d] border-t border-slate-800 flex items-center justify-between">
          <button
            disabled
            className="px-3.5 py-2 text-xs font-medium text-slate-500 rounded-lg cursor-not-allowed flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            إلغاء/استرداد غير مفعّل
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
                disabled
                className="px-5 py-2 text-xs font-bold text-slate-400 bg-slate-700 rounded-lg flex items-center gap-1.5 cursor-not-allowed"
              >
                <CheckCircle className="w-4 h-4" />
                تأكيد اكتمال الشحن وتسليم الطلب
              </button>
            ) : (
              <button
                disabled
                className="px-5 py-2 text-xs font-bold text-slate-400 bg-slate-700 rounded-lg flex items-center gap-1.5 cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
                التسليم غير مفعّل
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
