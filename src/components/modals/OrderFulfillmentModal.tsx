import React, { useEffect, useState } from 'react';
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
    showToast,
    fulfillPaidOrder
  } = useStore();

  const [copiedCode, setCopiedCode] = useState(false);
  const [fulfillmentNotes, setFulfillmentNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setCopiedCode(false);
    setFulfillmentNotes('');
    setIsSubmitting(false);
  }, [selectedOrderForFulfillment?.id]);

  if (!selectedOrderForFulfillment) return null;

  const order = selectedOrderForFulfillment;
  const isDirectRecharge = order.deliveryType === 'direct_id_recharge';
  const isInstantCode = order.deliveryType === 'instant_code';
  const activeStep = order.status === 'completed' ? 3 : order.status === 'processing' ? 2 : 1;
  const handleFulfill = async () => {
    if (order.status !== 'processing') {
      showToast('لا يمكن التنفيذ قبل أن يسجل الخادم تأكيد الدفع.');
      return;
    }
    if (!isInstantCode && fulfillmentNotes.trim().length < 3) {
      showToast('أدخل ملاحظة موجزة تؤكد تنفيذ الخدمة خارج النظام.');
      return;
    }
    setIsSubmitting(true);
    const succeeded = await fulfillPaidOrder(order.id, fulfillmentNotes.trim() || undefined);
    setIsSubmitting(false);
    if (succeeded) setSelectedOrderForFulfillment(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-[#0f172a] border border-cyan-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        <div role="status" className="mx-4 mt-4 rounded-xl border border-amber-500/40 bg-amber-950/30 px-3 py-2 text-xs leading-relaxed text-amber-200">
          لا ينفّذ الخادم الطلب إلا بعد تأكيد الدفع. أكواد المنتجات تُسحب من الحجز الخاص، أما الشحن والخدمات اليدوية فتحتاج ملاحظة تؤكد إتمامها خارج النظام.
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
          <div className="p-4 rounded-xl bg-slate-900 border border-cyan-500/20 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                {isInstantCode ? <Key className="w-4 h-4 text-cyan-400" /> : <ShieldCheck className="w-4 h-4 text-cyan-400" />}
                {isInstantCode ? 'تسليم الأكواد الرقمية المحجوزة:' : isDirectRecharge ? 'تأكيد شحن حساب اللاعب:' : 'تأكيد تنفيذ الخدمة:'}
              </h4>
              <span className="text-[11px] text-slate-400 font-mono">{order.status === 'processing' ? 'الدفع مؤكّد' : order.status === 'completed' ? 'مكتمل' : 'بانتظار دفع مؤكّد'}</span>
            </div>

            {isInstantCode ? (
              order.status === 'completed' && order.assignedCode ? (
                <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/50 space-y-2">
                  <div className="text-xs font-semibold text-emerald-200">تم تسليم الكود إلى الطلب:</div>
                  <pre className="whitespace-pre-wrap break-all rounded bg-slate-950 p-3 text-sm font-mono text-white">{order.assignedCode}</pre>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-800/40 text-xs text-cyan-100">
                  {order.status === 'processing'
                    ? 'سيستخرج الخادم الأكواد المحجوزة لهذه الباقة ويضعها في سجل الطلب عند التأكيد.'
                    : 'لا تُسلّم الأكواد قبل أن تصبح حالة الطلب «قيد المعالجة» بعد تأكيد الدفع.'}
                </div>
              )
            ) : (
              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/40 text-xs text-amber-100">
                  {isDirectRecharge
                    ? 'لا يوجد مزود شحن مباشر متصل؛ نفّذ الشحن لدى المورد بنفسك ثم سجّل رقم العملية أو إثبات التنفيذ هنا.'
                    : 'نفّذ الخدمة خارج النظام أولًا ثم سجّل مرجع التنفيذ أو ملاحظة موجزة هنا.'}
                </div>
                {order.status !== 'completed' && (
                  <textarea
                    rows={3}
                    maxLength={1000}
                    value={fulfillmentNotes}
                    onChange={(event) => setFulfillmentNotes(event.target.value)}
                    placeholder="مرجع التنفيذ أو ملاحظة تؤكد إتمام الخدمة (مطلوب)"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white"
                  />
                )}
                {order.fulfillmentNotes && <p className="text-[11px] text-slate-400">ملاحظة التنفيذ: {order.fulfillmentNotes}</p>}
              </div>
            )}

            {order.status !== 'processing' && order.status !== 'completed' && (
              <div className="text-xs text-rose-200">الطلب غير قابل للتنفيذ حاليًا؛ لن يتغير أي شيء حتى يؤكد الخادم الدفع.</div>
            )}
          </div>

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

            <button
              onClick={handleFulfill}
              disabled={isSubmitting || order.status !== 'processing' || (!isInstantCode && fulfillmentNotes.trim().length < 3)}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-400 rounded-lg flex items-center gap-1.5 disabled:cursor-not-allowed"
            >
              <CheckCircle className="w-4 h-4" />
              {isSubmitting ? 'جارٍ التنفيذ…' : isInstantCode ? 'تسليم الأكواد وإكمال الطلب' : 'تأكيد التنفيذ وإكمال الطلب'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
