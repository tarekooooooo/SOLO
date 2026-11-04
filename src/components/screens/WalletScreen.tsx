import React, { useState } from 'react';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Clock, 
  CreditCard, 
  Plus, 
  Send, 
  CheckCircle,
  Building2,
  Smartphone,
  Coins
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { WalletTransaction } from '../../types';

export const WalletScreen: React.FC = () => {
  const { 
    customerBalanceUSD, 
    depositToWallet, 
    withdrawFromWallet, 
    transactions, 
    formatPrice, 
    setActiveScreen 
  } = useStore();

  const [showBalance, setShowBalance] = useState(true);
  const [activeTab, setActiveTab] = useState<'history' | 'methods' | 'security'>('history');
  
  // Deposit modal state
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('50');
  const [depositMethod, setDepositMethod] = useState('بطاقة مدى / فيزا');

  // Withdraw modal state
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('20');
  const [iban, setIban] = useState('SA0380000000608010167519');

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(depositAmount);
    if (amt > 0) {
      depositToWallet(amt, depositMethod);
      setShowDepositModal(false);
    }
  };

  const handleWithdrawSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(withdrawAmount);
    if (amt > 0) {
      withdrawFromWallet(amt, `تحويل بنكي IBAN: ${iban.slice(0, 8)}...`);
      setShowWithdrawModal(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      
      {/* Top Bar matching Screen 6 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-bold text-white">المحفظة الرقمية (My Wallet)</h2>
        </div>
        <span className="font-mono text-xs text-cyan-400">PAGE 06 // WALLET</span>
      </div>

      {/* Main Balance Card (Exact look from Screen 6 in mockup) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-900/60 via-slate-900 to-[#0b1220] border border-cyan-500/40 p-6 sm:p-8 shadow-2xl shadow-cyan-950/40">
        <div className="relative z-10 flex flex-col justify-between space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-cyan-300 tracking-wide uppercase">
              الرصيد المتاح للاستخدام الفوري
            </span>
            <button
              onClick={() => setShowBalance(!showBalance)}
              className="p-1.5 rounded-lg bg-black/40 text-slate-300 hover:text-white transition-colors"
              title="إظهار / إخفاء الرصيد"
            >
              {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div>
            <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white">
              {showBalance ? formatPrice(customerBalanceUSD) : '••••••••••'}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              مربوط بمحفظة اللاعب الموثقة • أمان مشفر 256-bit
            </p>
          </div>

          {/* Quick Action Buttons: شحن & سحب */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => setShowDepositModal(true)}
              className="py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition-all hover:scale-105"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>شحن المحفظة</span>
            </button>

            <button
              onClick={() => setShowWithdrawModal(true)}
              className="py-3 px-4 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-100 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 border border-slate-700 transition-colors"
            >
              <ArrowDownLeft className="w-4 h-4 text-cyan-400" />
              <span>سحب الرصيد</span>
            </button>
          </div>
        </div>

        {/* Ambient glow in background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -z-0 pointer-events-none" />
      </div>

      {/* Tabs: سجل العمليات | طرق الدفع | الأمان (Screen 6 in mockup) */}
      <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'history'
              ? 'bg-cyan-500 text-black shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>سجل العمليات</span>
        </button>

        <button
          onClick={() => setActiveTab('methods')}
          className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'methods'
              ? 'bg-cyan-500 text-black shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>طرق الدفع</span>
        </button>

        <button
          onClick={() => setActiveScreen('security')}
          className="flex-1 py-2 rounded-lg text-slate-400 hover:text-white transition-all flex items-center justify-center gap-1.5"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>إعدادات الأمان</span>
        </button>
      </div>

      {/* Tab 1: Transactions History (أحدث العمليات) */}
      {activeTab === 'history' && (
        <div className="p-5 rounded-2xl bg-[#0f1523] border border-cyan-500/20 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">أحدث العمليات المالية</h3>
            <span className="text-xs text-slate-400 font-mono">{transactions.length} حركات</span>
          </div>

          <div className="space-y-2.5">
            {transactions.map((tx: WalletTransaction) => {
              const isPositive = tx.amountUSD > 0;
              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      isPositive
                        ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                        : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                    }`}>
                      {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-white">{tx.title}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                        {tx.date} • {tx.method}
                      </p>
                    </div>
                  </div>

                  <div className="text-left font-mono">
                    <span className={`text-xs font-bold block ${
                      isPositive ? 'text-emerald-400' : 'text-slate-200'
                    }`}>
                      {isPositive ? '+' : ''}{formatPrice(Math.abs(tx.amountUSD))}
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase">ناجحة</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Payment Methods */}
      {activeTab === 'methods' && (
        <div className="p-5 rounded-2xl bg-[#0f1523] border border-cyan-500/20 space-y-4">
          <h3 className="text-sm font-bold text-white">طرق الدفع والوسائل المربوطة</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-5 h-5 text-cyan-400" />
                <div>
                  <span className="font-bold text-white block">بطاقة فيزا •••• 4022</span>
                  <span className="text-[10px] text-slate-400 font-mono">تنتهي 10/28</span>
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-semibold">
                افتراضي
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-5 h-5 text-emerald-400" />
                <div>
                  <span className="font-bold text-white block">Apple Pay & STC Pay</span>
                  <span className="text-[10px] text-slate-400">دفع فوري بلمسة واحدة</span>
                </div>
              </div>
              <span className="text-[10px] text-emerald-400 font-semibold">مفعل</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Coins className="w-5 h-5 text-amber-400" />
                <div>
                  <span className="font-bold text-white block">العملات الرقمية (USDT-TRC20)</span>
                  <span className="text-[10px] text-slate-400 font-mono">شبكة Tron السريعة</span>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold">جاهز</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-5 h-5 text-blue-400" />
                <div>
                  <span className="font-bold text-white block">التحويل البنكي المباشر (IBAN)</span>
                  <span className="text-[10px] text-slate-400">كافة البنوك الخليجية والمصرية</span>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold">جاهز</span>
            </div>
          </div>
        </div>
      )}

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0f172a] border border-cyan-500/30 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-400" />
              شحن رصيد المحفظة
            </h3>
            <form onSubmit={handleDepositSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 block mb-1 font-semibold">المبلغ المراد شحنه (USD):</label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {['10', '25', '50', '100'].map((amt) => (
                    <button
                      type="button"
                      key={amt}
                      onClick={() => setDepositAmount(amt)}
                      className={`py-1.5 rounded-lg border font-mono font-bold ${
                        depositAmount === amt ? 'bg-cyan-500 text-black border-cyan-400' : 'bg-slate-900 text-slate-300 border-slate-800'
                      }`}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">طريقة الدفع:</label>
                <select
                  value={depositMethod}
                  onChange={(e) => setDepositMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                >
                  <option value="بطاقة مدى / فيزا">بطاقة مدى / Visa / MasterCard</option>
                  <option value="Apple Pay">Apple Pay</option>
                  <option value="STC Pay">STC Pay</option>
                  <option value="عملات رقمية USDT">USDT (Tether TRC20)</option>
                  <option value="فودافون كاش">فودافون كاش (مصر)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDepositModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-md"
                >
                  تأكيد الشحن
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0f172a] border border-cyan-500/30 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ArrowDownLeft className="w-4 h-4 text-cyan-400" />
              سحب رصيد من المحفظة
            </h3>
            <form onSubmit={handleWithdrawSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 block mb-1 font-semibold">المبلغ المراد سحبه (USD):</label>
                <input
                  type="number"
                  min="5"
                  step="1"
                  required
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">رقم الآيبان البنكي (IBAN):</label>
                <input
                  type="text"
                  required
                  value={iban}
                  onChange={(e) => setIban(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg shadow-md"
                >
                  تأكيد طلب السحب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
