import React, { useState } from 'react';
import { 
  Gamepad2, 
  Wallet, 
  Smartphone, 
  Monitor, 
  Layers, 
  ChevronDown, 
  Globe, 
  Check, 
  ShieldCheck,
  UserCheck,
  User,
  Headphones,
  Crown,
  Truck,
  Zap,
  Key,
  LogIn
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { CurrencyCode, ScreenId } from '../types';
import { CURRENCIES } from '../data/mockData';

export const Header: React.FC = () => {
  const { 
    activeScreen, 
    setActiveScreen, 
    viewMode, 
    setViewMode, 
    currency,
    setCurrencyCode,
    customerBalanceUSD,
    formatPrice,
    orders,
    physicalOrders,
    supportTickets,
    playerProfile,
    storefrontMode,
    setStorefrontMode,
    setIsApiModalOpen,
    currentUser
  } = useStore();

  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);

  const pendingOrdersCount = orders.filter((o) => o.status === 'pending' || o.status === 'processing').length + 
    physicalOrders.filter((o) => o.status === 'pending' || o.status === 'cj_syncing' || o.status === 'processing').length;
  const openTicketsCount = supportTickets.filter((t) => t.status === 'open' || t.status === 'in_progress').length;

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0b0e14]/95 backdrop-blur-md border-b border-slate-800/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
        
        {/* Zone 1: Wordmark / Brand title */}
        <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
          <button 
            onClick={() => setActiveScreen('home')}
            className="flex items-center gap-2.5 text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 p-0.5 shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-all">
              <div className="w-full h-full bg-[#0b0e14] rounded-[10px] flex items-center justify-center">
                <Gamepad2 className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-wider bg-gradient-to-r from-white via-slate-100 to-cyan-400 bg-clip-text text-transparent">
                TAREK STOR
              </span>
              <span className="text-[10px] block font-mono text-cyan-400/80 tracking-widest font-semibold uppercase">
                SOLO GAMING PLATFORM
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Navigation links */}
        <nav className="hidden lg:flex items-center gap-4 text-sm font-medium text-slate-300">
          {/* المتجر الرقمي (Digital Store) */}
          <button
            onClick={() => {
              setStorefrontMode('digital');
              setActiveScreen('home');
            }}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 border-b-2 flex items-center gap-1.5 ${
              (activeScreen === 'home' || activeScreen === 'product' || activeScreen === 'gift') && storefrontMode === 'digital'
                ? 'text-cyan-400 border-cyan-400 font-bold'
                : 'text-slate-400 hover:text-white border-transparent'
            }`}
          >
            <Zap className="w-4 h-4 text-cyan-400" />
            <span>المتجر الرقمي</span>
          </button>

          {/* متجر المنتجات المادية (CJ Dropshipping Physical Store) */}
          <button
            onClick={() => {
              setStorefrontMode('physical');
              setActiveScreen('physical_store');
            }}
            className={`whitespace-nowrap shrink-0 transition-all py-1 border-b-2 flex items-center gap-1.5 ${
              activeScreen === 'physical_store' || (activeScreen === 'home' && storefrontMode === 'physical')
                ? 'text-cyan-300 border-cyan-400 font-bold'
                : 'text-slate-300 hover:text-white border-transparent'
            }`}
          >
            <Truck className="w-4 h-4 text-cyan-400" />
            <span>منتجات CJ المادية</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
              شحن
            </span>
          </button>

          {/* لوحة الإدمن وتعيين المساعدين (Admin Panel) */}
          <button
            onClick={() => setActiveScreen('admin')}
            className={`whitespace-nowrap shrink-0 transition-all py-1 border-b-2 flex items-center gap-1.5 ${
              activeScreen === 'admin'
                ? 'text-cyan-300 border-cyan-400 font-bold'
                : 'text-slate-300 hover:text-white border-transparent'
            }`}
          >
            <span className="px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-300 border border-cyan-700/80 text-xs font-bold flex items-center gap-1 shadow-sm">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              لوحة الإدمن والمساعدين
            </span>
            {pendingOrdersCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-cyan-500 text-black text-[10px] font-mono font-black flex items-center justify-center">
                {pendingOrdersCount}
              </span>
            )}
          </button>

          {/* خدمة العملاء (Customer Support) */}
          <button
            onClick={() => setActiveScreen('support')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 border-b-2 flex items-center gap-1.5 ${
              activeScreen === 'support'
                ? 'text-cyan-400 border-cyan-400 font-semibold'
                : 'text-slate-400 hover:text-white border-transparent'
            }`}
          >
            <Headphones className="w-3.5 h-3.5 text-cyan-400" />
            <span>خدمة العملاء</span>
            {openTicketsCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-500/80 text-white text-[10px] font-mono font-bold flex items-center justify-center">
                {openTicketsCount}
              </span>
            )}
          </button>

          {/* إدارة المنتجات (لوحة التاجر) */}
          <button
            onClick={() => setActiveScreen('merchant')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 border-b-2 ${
              activeScreen === 'merchant'
                ? 'text-cyan-400 border-cyan-400 font-semibold'
                : 'text-slate-400 hover:text-white border-transparent'
            }`}
          >
            إدارة المنتجات
          </button>

          {/* المحفظة */}
          <button
            onClick={() => setActiveScreen('wallet')}
            className={`whitespace-nowrap shrink-0 transition-colors py-1 border-b-2 ${
              activeScreen === 'wallet'
                ? 'text-cyan-400 border-cyan-400 font-semibold'
                : 'text-slate-400 hover:text-white border-transparent'
            }`}
          >
            المحفظة
          </button>
        </nav>

        {/* Zone 3: 1 primary action & utility controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* زر مفاتيح الربط والـ API */}
          <button
            onClick={() => setIsApiModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-cyan-500/30 text-cyan-400 hover:bg-slate-800 text-xs font-bold transition-all shadow-sm"
            title="مفاتيح ربط CJ Dropshipping و Google و Telegram"
          >
            <Key className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">مفاتيح الـ API</span>
          </button>

          {/* زر تسجيل الدخول والحساب (Auth Screen) */}
          <button
            onClick={() => setActiveScreen('auth')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
              activeScreen === 'auth'
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                : 'bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-700'
            }`}
            title="تسجيل الدخول / إنشاء حساب"
          >
            {currentUser ? (
              <>
                <img src={currentUser.avatar || ''} alt="" className="w-4 h-4 rounded-full object-cover" />
                <span className="hidden sm:inline truncate max-w-[80px]">{currentUser.name.split(' ')[0]}</span>
              </>
            ) : (
              <>
                <LogIn className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">تسجيل الدخول</span>
              </>
            )}
          </button>

          {/* صفحة الملف الشخصي (Profile Button) */}
          <button
            onClick={() => setActiveScreen('profile')}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all ${
              activeScreen === 'profile'
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold shadow-md shadow-cyan-950/40'
                : 'bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-700 hover:bg-slate-800'
            }`}
            title="فتح صفحة الملف الشخصي"
          >
            <div className="w-5 h-5 rounded-md bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-[10px]">
              🕹️
            </div>
            <span className="text-xs font-bold hidden sm:inline text-white">{playerProfile.username}</span>
          </button>

          {/* Currency Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-200 hover:border-slate-700 transition-colors"
              title="تغيير العملة"
            >
              <span>{currency.flag}</span>
              <span className="font-mono">{currency.code}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showCurrencyDropdown && (
              <div className="absolute left-0 mt-2 w-36 bg-slate-900 border border-slate-800 rounded-xl shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2">
                {Object.values(CURRENCIES).map((c) => (
                  <button
                    key={c.code}
                    onClick={() => {
                      setCurrencyCode(c.code as CurrencyCode);
                      setShowCurrencyDropdown(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-cyan-400 transition-colors text-right"
                  >
                    <span className="flex items-center gap-2">
                      <span>{c.flag}</span>
                      <span>{c.code}</span>
                    </span>
                    {currency.code === c.code && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* View Mode Toggle (Desktop vs Mobile Simulation) */}
          <div className="hidden sm:flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => setViewMode('desktop')}
              className={`p-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
                viewMode === 'desktop'
                  ? 'bg-slate-800 text-cyan-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="العرض المكتبي الشامل"
            >
              <Monitor className="w-4 h-4" />
              <span className="text-[11px] hidden md:inline">مكتبي</span>
            </button>
            <button
              onClick={() => setViewMode('mobile_simulator')}
              className={`p-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
                viewMode === 'mobile_simulator'
                  ? 'bg-slate-800 text-cyan-400 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="محاكي شاشات الموبايل الـ 12"
            >
              <Smartphone className="w-4 h-4" />
              <span className="text-[11px] hidden md:inline">جوال</span>
            </button>
          </div>

          {/* Quick Balance indicator */}
          <button
            onClick={() => setActiveScreen('wallet')}
            className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/40 transition-colors"
          >
            <Wallet className="w-3.5 h-3.5 text-cyan-400" />
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block leading-none">الرصيد</span>
              <span className="text-xs font-mono font-bold text-slate-200">
                {formatPrice(customerBalanceUSD)}
              </span>
            </div>
          </button>

        </div>

      </div>
    </header>
  );
};
