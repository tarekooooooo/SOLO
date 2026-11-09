import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { 
  Key, 
  Mail, 
  Lock, 
  User, 
  Send, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Sparkles, 
  HelpCircle,
  ArrowRight,
  Gamepad2
} from 'lucide-react';

export const AuthScreen: React.FC = () => {
  const { 
    currentUser, 
    loginWithGoogle, 
    loginWithTelegram, 
    loginWithEmail, 
    registerWithEmail, 
    logout,
    setIsApiModalOpen,
    setActiveScreen,
    apiConfig
  } = useStore();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [telegramUsernameInput, setTelegramUsernameInput] = useState('');
  const [showTelegramPrompt, setShowTelegramPrompt] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        if (!email || !password) return;
        await loginWithEmail(email, password);
      } else if (mode === 'register') {
        if (!name || !email || !password) return;
        await registerWithEmail(name, email, password);
      } else {
        setAuthError('استعادة كلمة المرور غير موصولة بعد. لم نرسل رسالة وهمية.');
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'تعذر إتمام المصادقة.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTelegramLoginClick = () => {
    setShowTelegramPrompt(true);
  };

  const confirmTelegramLogin = async () => {
    try {
      await loginWithTelegram(telegramUsernameInput);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'تسجيل Telegram غير متاح.');
    } finally {
      setShowTelegramPrompt(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError('');
    try {
      await loginWithGoogle();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'تعذر بدء تسجيل Google.');
    }
  };

  return (
    <div className="max-w-xl mx-auto py-6 px-4 space-y-6 font-sans text-right animate-fadeIn" dir="rtl">
      {/* If already logged in, show profile card and option to switch or logout */}
      {currentUser && (
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-cyan-500/30 space-y-4 shadow-xl">
          <div className="flex items-center gap-4">
            <img 
              src={currentUser.avatar || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80'} 
              alt="" 
              className="w-16 h-16 rounded-2xl border-2 border-cyan-400 object-cover shadow-[0_0_15px_rgba(6,182,212,0.4)]"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">{currentUser.name}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase font-mono">
                  {currentUser.role}
                </span>
              </div>
              <p className="text-xs text-slate-400">{currentUser.email}</p>
              <p className="text-[11px] text-cyan-400 mt-0.5">
                مسجل عبر: {currentUser.provider === 'google' ? 'Google OAuth 2.0' : currentUser.provider === 'telegram' ? `Telegram (${currentUser.telegramUsername})` : 'البريد الإلكتروني'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => setActiveScreen('home')}
              className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors"
            >
              الذهاب للتسوق في المتجر
            </button>
            <button
              onClick={() => { void logout().catch((error) => setAuthError(error instanceof Error ? error.message : 'تعذر تسجيل الخروج.')); }}
              className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-colors"
            >
              تسجيل الخروج
            </button>
          </div>
        </div>
      )}

      {/* Main Auth Card */}
      <div className="rounded-3xl bg-[#0f1422] border border-cyan-500/30 p-6 sm:p-8 shadow-[0_0_40px_rgba(6,182,212,0.12)] space-y-6">
        {/* Branding header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto shadow-inner">
            <Gamepad2 className="w-6 h-6" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            {mode === 'login' ? 'مرحباً بك مجدداً في SOLO' : mode === 'register' ? 'إنشاء حساب في SOLO' : 'استعادة كلمة المرور'}
          </h2>
          <p className="text-xs text-slate-400">
            {mode === 'login' 
              ? 'سجل دخولك لإدارة حسابك. الشراء والتسليم غير متاحين حتى اكتمال الربط.'
              : 'أنشئ حسابًا في SOLO. قد تحتاج إلى تأكيد بريدك الإلكتروني قبل تسجيل الدخول.'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-900 border border-slate-800">
          <button
            onClick={() => setMode('login')}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              mode === 'login'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            تسجيل الدخول
          </button>
          <button
            onClick={() => setMode('register')}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              mode === 'register'
                ? 'bg-cyan-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            إنشاء حساب جديد
          </button>
        </div>

        {/* Social 1-Click Login Buttons */}
        <div className="space-y-3">
          {/* Google Sign In */}
          <button
            type="button"
            onClick={() => { void handleGoogleLogin(); }}
            className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center gap-3 shadow-md transition-transform active:scale-[0.99]"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span>متابعة الدخول عبر حساب Google الرسمي</span>
          </button>

          {/* Telegram Login */}
          <button
            type="button"
            onClick={handleTelegramLoginClick}
            className="w-full py-3 px-4 rounded-2xl bg-[#2AABEE] hover:bg-[#229ED9] text-white font-bold text-xs flex items-center justify-center gap-3 shadow-md transition-transform active:scale-[0.99]"
          >
            <Send className="w-4 h-4 shrink-0" />
            <span>تسجيل الدخول السريع عبر Telegram</span>
          </button>
        </div>

        {/* Telegram Prompt Modal/Inline for username */}
        {showTelegramPrompt && (
          <div className="p-4 rounded-2xl bg-[#0b1320] border border-[#2AABEE]/40 space-y-3 animate-fadeIn">
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <Send className="w-3.5 h-3.5 text-[#2AABEE]" />
              <span>تسجيل الدخول عبر بوت تيليجرام ({apiConfig.telegramBotUsername})</span>
            </div>
            <p className="text-[11px] text-slate-300">
              أدخل اسم المستخدم الخاص بك على تيليجرام لربط حسابك وتلقي إشعارات الشحن:
            </p>
            <div className="flex gap-2">
              <input 
                type="text"
                value={telegramUsernameInput}
                onChange={(e) => setTelegramUsernameInput(e.target.value)}
                placeholder="@Username"
                className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:border-[#2AABEE] focus:outline-none"
              />
              <button
                type="button"
                onClick={confirmTelegramLogin}
                className="px-4 py-2 rounded-xl bg-[#2AABEE] hover:bg-[#229ED9] text-white text-xs font-bold transition-colors"
              >
                تأكيد الدخول
              </button>
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-slate-800 w-full" />
          <span className="bg-[#0f1422] px-3 text-[11px] text-slate-400 font-semibold absolute">
            أو عبر البريد الإلكتروني
          </span>
        </div>

        {authError && (
          <div role="alert" className="rounded-xl border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-xs text-rose-200">
            {authError}
          </div>
        )}

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">الاسم الكامل *</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="اسمك"
                  className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white text-xs focus:border-cyan-500 focus:outline-none"
                />
                <User className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">البريد الإلكتروني *</label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white text-xs focus:border-cyan-500 focus:outline-none"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-slate-300">كلمة المرور *</label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-[11px] text-cyan-400 hover:underline"
                >
                  نسيت كلمة المرور؟
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required={mode !== 'forgot'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-white text-xs focus:border-cyan-500 focus:outline-none"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1 text-slate-400 hover:text-white absolute left-3 top-2.5"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

              <button
                type="submit"
                disabled={isSubmitting}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'جارٍ التحقق…' : mode === 'login' ? 'دخول إلى المتجر' : 'تأكيد إنشاء الحساب'}</span>
          </button>
        </form>

        {/* API Credentials Info Banner */}
        {import.meta.env.DEV && (
        <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 text-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-cyan-400" />
              <span>حالة مفاتيح الربط (Google &amp; Telegram &amp; CJ):</span>
            </span>
            <button
              onClick={() => setIsApiModalOpen(true)}
              className="text-[11px] text-cyan-400 hover:underline font-bold"
            >
              إدارة المفاتيح &gt;
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
            <div className="p-2 rounded-xl bg-black/40 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Google:</span>
              <span className={apiConfig.googleClientId ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                {apiConfig.googleClientId ? 'متصل 🟢' : 'جاهز'}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-black/40 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">Telegram:</span>
              <span className={apiConfig.telegramBotUsername ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                {apiConfig.telegramBotUsername || 'جاهز'} 🟢
              </span>
            </div>
            <div className="p-2 rounded-xl bg-black/40 border border-slate-800 flex items-center justify-between">
              <span className="text-slate-400">CJ API:</span>
              <span className={apiConfig.cjConnected ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                {apiConfig.cjConnected ? 'تم التحقق 🟢' : 'غير متحقق'}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            مفاتيح التكامل السرية لا تُحفظ في المتصفح؛ تُدار على الخادم فقط.
          </p>
        </div>
        )}
      </div>
    </div>
  );
};
