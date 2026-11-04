import React from 'react';
import { 
  Home, 
  ShoppingBag, 
  Wallet, 
  Users, 
  User, 
  Wifi, 
  Battery, 
  Signal, 
  Smartphone,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Briefcase,
  Monitor
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { ScreenId } from '../types';

interface MobileFrameProps {
  children: React.ReactNode;
}

export const MobileFrame: React.FC<MobileFrameProps> = ({ children }) => {
  const { activeScreen, setActiveScreen } = useStore();

  const screens = [
    { id: 'splash', num: '1', title: 'شاشة البداية' },
    { id: 'login', num: '2', title: 'تسجيل الدخول' },
    { id: 'auth', num: '2B', title: 'دخول Google وتيليجرام' },
    { id: 'home', num: '3', title: 'الرئيسية الرقمية' },
    { id: 'physical_store', num: '3B', title: 'متجر عتاد CJ المادي' },
    { id: 'product', num: '4', title: 'صفحة المنتج' },
    { id: 'gift', num: '5', title: 'شاشة الهدية' },
    { id: 'wallet', num: '6', title: 'المحفظة' },
    { id: 'community', num: '7', title: 'المجتمع' },
    { id: 'tournaments', num: '8', title: 'البطولات' },
    { id: 'profile', num: '9', title: 'الملف الشخصي' },
    { id: 'merchant', num: '10', title: 'لوحة التاجر' },
    { id: 'admin', num: '11', title: 'لوحة الإدمن والمساعدين' },
    { id: 'support', num: '12', title: 'خدمة العملاء والدعم' },
    { id: 'security', num: '13', title: 'الأمان والعملات' },
  ];

  const currentIdx = screens.findIndex((s) => s.id === activeScreen);

  const handlePrev = () => {
    const prevIdx = (currentIdx - 1 + screens.length) % screens.length;
    setActiveScreen(screens[prevIdx].id as ScreenId);
  };

  const handleNext = () => {
    const nextIdx = (currentIdx + 1) % screens.length;
    setActiveScreen(screens[nextIdx].id as ScreenId);
  };

  return (
    <div className="flex flex-col items-center justify-center py-4 space-y-4">
      
      {/* 12-Screen Quick Navigation Bar */}
      <div className="w-full max-w-4xl bg-slate-900/90 border border-slate-800 p-2.5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-white">محاكي شاشات التطبيق الـ 12:</span>
          <span className="font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800 font-bold">
            الشاشة {currentIdx >= 0 ? currentIdx + 1 : 1} من 12
          </span>
        </div>

        {/* Scrollable screen buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 md:pb-0 scrollbar-none">
          {screens.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveScreen(s.id as ScreenId)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeScreen === s.id
                  ? 'bg-cyan-500 text-black font-bold shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <span className="font-mono ml-1">{s.num}.</span>
              <span>{s.title}</span>
            </button>
          ))}
        </div>

        {/* Next / Prev arrows */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handlePrev}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
            title="الشاشة السابقة"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleNext}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
            title="الشاشة التالية"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Smartphone Device Frame */}
      <div className="relative w-full max-w-[420px] h-[840px] bg-[#000000] rounded-[50px] p-3 shadow-2xl border-[4px] border-slate-700 shadow-cyan-950/40 flex flex-col overflow-hidden">
        
        {/* Dynamic Island / Speaker */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-40 flex items-center justify-between px-3 border border-slate-800">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-700" />
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-500/40" />
        </div>

        {/* Status Bar */}
        <div className="w-full h-8 flex items-center justify-between px-6 pt-2 text-[11px] font-mono text-slate-300 z-30 select-none">
          <span>9:41</span>
          <div className="flex items-center gap-2">
            <Signal className="w-3.5 h-3.5" />
            <Wifi className="w-3.5 h-3.5" />
            <Battery className="w-4 h-4" />
          </div>
        </div>

        {/* Mobile Viewport Screen Content */}
        <div className="flex-1 w-full bg-[#0b0e14] rounded-[38px] overflow-y-auto px-4 py-4 scrollbar-none relative">
          {children}
        </div>

        {/* Bottom Floating Navigation Bar (Exact 5 Tabs from user's mockup):
            الرئيسية | المتجر | المحفظة | المجتمع | الحساب
        */}
        <div className="w-full bg-[#0f1523]/95 backdrop-blur-md border-t border-slate-800/80 rounded-b-[40px] py-2 px-3 flex items-center justify-around z-30">
          <button
            onClick={() => setActiveScreen('home')}
            className={`flex flex-col items-center gap-1 transition-colors ${
              activeScreen === 'home' || activeScreen === 'product' || activeScreen === 'gift'
                ? 'text-cyan-400 font-bold'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Home className="w-4 h-4" />
            <span className="text-[10px]">الرئيسية</span>
          </button>

          <button
            onClick={() => setActiveScreen('merchant')}
            className={`flex flex-col items-center gap-1 transition-colors ${
              activeScreen === 'merchant' ? 'text-cyan-400 font-bold' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="text-[10px]">المتجر</span>
          </button>

          <button
            onClick={() => setActiveScreen('wallet')}
            className={`flex flex-col items-center gap-1 transition-colors ${
              activeScreen === 'wallet' ? 'text-cyan-400 font-bold' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span className="text-[10px]">المحفظة</span>
          </button>

          <button
            onClick={() => setActiveScreen('community')}
            className={`flex flex-col items-center gap-1 transition-colors ${
              activeScreen === 'community' || activeScreen === 'tournaments'
                ? 'text-cyan-400 font-bold'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="text-[10px]">المجتمع</span>
          </button>

          <button
            onClick={() => setActiveScreen('profile')}
            className={`flex flex-col items-center gap-1 transition-colors ${
              activeScreen === 'profile' ? 'text-cyan-400 font-bold' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <User className="w-4 h-4" />
            <span className="text-[10px]">الحساب</span>
          </button>
        </div>

        {/* iPhone Home Indicator bar */}
        <div className="w-32 h-1 bg-slate-600 rounded-full mx-auto my-1 shrink-0" />

      </div>

    </div>
  );
};
