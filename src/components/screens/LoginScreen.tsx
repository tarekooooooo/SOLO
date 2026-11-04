import React, { useState } from 'react';
import { Gamepad2, Mail, Lock, Check, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { UserRole } from '../../types';

export const LoginScreen: React.FC = () => {
  const { setActiveScreen, setUserRole, userRole, showToast } = useStore();
  
  const [emailOrPhone, setEmailOrPhone] = useState('tarekai042@gmail.com');
  const [password, setPassword] = useState('••••••••••');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    showToast(`تم تسجيل الدخول بنجاح! مرحباً بك.`);
    setActiveScreen('home');
  };

  const handleQuickRole = (role: UserRole) => {
    setUserRole(role);
    if (role === 'admin') {
      setEmailOrPhone('admin@tarekstor.com');
      showToast('تم التبديل إلى حساب المشرف / مدير النظام.');
    } else if (role === 'merchant') {
      setEmailOrPhone('merchant@tarekstor.com');
      showToast('تم التبديل إلى حساب التاجر المعتمد.');
    } else {
      setEmailOrPhone('tarekai042@gmail.com');
      showToast('تم التبديل إلى حساب العميل / اللاعب.');
    }
  };

  return (
    <div className="min-h-[750px] w-full flex flex-col justify-between p-6 rounded-3xl bg-[#090d16] border border-cyan-500/20 max-w-md mx-auto">
      
      {/* Top Bar with back */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setActiveScreen('splash')}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
        <span className="font-mono text-xs text-cyan-400">PAGE 02 // AUTH</span>
      </div>

      {/* Main Login Form Container */}
      <div className="my-auto py-6 space-y-6">
        
        {/* Brand Lockup */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-500 p-0.5 shadow-lg shadow-cyan-500/30">
            <div className="w-full h-full bg-[#0b0e14] rounded-[14px] flex items-center justify-center">
              <Gamepad2 className="w-8 h-8 text-cyan-400" />
            </div>
          </div>
          <h2 className="text-xl font-extrabold text-white">مرحباً بك مجدداً</h2>
          <p className="text-xs text-slate-400">سجل الدخول إلى حسابك لمتابعة شحناتك ومحفظتك</p>
        </div>

        {/* Quick Role Tester (Super convenient for reviewing the app) */}
        <div className="p-2 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-400 text-[11px] px-1 font-semibold">الدخول بصلاحية:</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleQuickRole('customer')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                userRole === 'customer' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              عميل / لاعب
            </button>
            <button
              onClick={() => handleQuickRole('merchant')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                userRole === 'merchant' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              تاجر
            </button>
            <button
              onClick={() => handleQuickRole('admin')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                userRole === 'admin' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              مدير نظام
            </button>
          </div>
        </div>

        {/* Login Inputs */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs text-slate-300 block mb-1.5 font-medium">البريد الإلكتروني أو رقم الهاتف</label>
            <div className="relative">
              <input
                type="text"
                required
                value={emailOrPhone}
                onChange={(e) => setEmailOrPhone(e.target.value)}
                placeholder="email@example.com أو 05xxxxxxxx"
                className="w-full pl-3 pr-10 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-300 block mb-1.5 font-medium">كلمة المرور</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1 text-slate-400 hover:text-slate-200 absolute left-3 top-2.5"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-300">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0"
              />
              <span>تذكرني</span>
            </label>
            <button
              type="button"
              onClick={() => showToast('تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني.')}
              className="text-cyan-400 hover:underline"
            >
              نسيت كلمة المرور؟
            </button>
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs tracking-wide shadow-lg shadow-cyan-600/30 transition-all"
          >
            تسجيل الدخول
          </button>
        </form>

        {/* Social logins */}
        <div className="space-y-3 pt-2">
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-[#090d16] px-3 text-[11px] text-slate-400 absolute">أو تسجيل الدخول عبر</span>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                showToast('تم تسجيل الدخول بحساب Google');
                setActiveScreen('home');
              }}
              className="py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 flex items-center justify-center text-xs font-semibold text-slate-200 gap-1.5 transition-colors"
            >
              <span>Google</span>
            </button>

            <button
              type="button"
              onClick={() => {
                showToast('تم تسجيل الدخول بحساب Apple');
                setActiveScreen('home');
              }}
              className="py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 flex items-center justify-center text-xs font-semibold text-slate-200 gap-1.5 transition-colors"
            >
              <span>Apple</span>
            </button>

            <button
              type="button"
              onClick={() => {
                showToast('تم تسجيل الدخول عبر Discord / Chat');
                setActiveScreen('home');
              }}
              className="py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 flex items-center justify-center text-xs font-semibold text-slate-200 gap-1.5 transition-colors"
            >
              <span>Discord</span>
            </button>
          </div>
        </div>

      </div>

      {/* Bottom Signup Link */}
      <div className="text-center text-xs text-slate-400 pt-2 border-t border-slate-800/80">
        <span>ليس لديك حساب؟ </span>
        <button
          onClick={() => {
            showToast('تم نقلك إلى صفحة إنشاء حساب جديد.');
          }}
          className="text-cyan-400 hover:underline font-bold"
        >
          إنشاء حساب جديد
        </button>
      </div>

    </div>
  );
};
