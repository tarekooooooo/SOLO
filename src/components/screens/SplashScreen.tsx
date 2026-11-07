import React from 'react';
import { Gamepad2, ArrowLeft, Shield, Zap, Trophy, Users } from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export const SplashScreen: React.FC = () => {
  const { setActiveScreen } = useStore();

  return (
    <div className="relative min-h-[750px] w-full flex flex-col items-center justify-between p-6 overflow-hidden rounded-3xl bg-[#090d16] border border-cyan-500/20 text-center">
      {/* Background glow and subtle graphics */}
      <div className="absolute inset-0 bg-radial from-cyan-950/40 via-transparent to-transparent pointer-events-none" />
      <div 
        className="absolute inset-0 opacity-20 bg-center bg-cover mix-blend-luminosity pointer-events-none"
        style={{ backgroundImage: `url('/assets/aistudio/file_000000007e1c81f5ba66efa05ab9f2e5_0ba40384.png')` }}
      />

      {/* Top indicator */}
      <div className="w-full flex justify-between items-center text-xs text-slate-400 relative z-10">
        <span className="font-mono text-cyan-400">PAGE 01 // START</span>
        <span className="px-2.5 py-1 rounded-full bg-slate-800/80 text-[11px] text-slate-300 border border-slate-700">
          النسخة المعتمدة 2026
        </span>
      </div>

      {/* Center Hero Lockup */}
      <div className="my-auto relative z-10 flex flex-col items-center max-w-md mx-auto space-y-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-cyan-600 via-blue-500 to-indigo-600 p-1 shadow-2xl shadow-cyan-500/30 animate-pulse">
            <div className="w-full h-full bg-[#0b0e14] rounded-[22px] flex items-center justify-center">
              <Gamepad2 className="w-12 h-12 text-cyan-400" />
            </div>
          </div>
          <div className="absolute -inset-2 rounded-3xl bg-cyan-500/20 blur-xl -z-10" />
        </div>

        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
            SOLO
          </h1>
          <p className="text-sm font-semibold text-cyan-400 tracking-wider uppercase mb-3">
            SOLO DIGITAL ECOSYSTEM
          </p>
          <p className="text-sm text-slate-300 leading-relaxed max-w-sm">
            منصة متكاملة لكل ما يحتاجه اللاعب العربي — متجر رقمي فوري، شحن شدات وألعاب، مجتمع لاعبين، وبطولات وجوائز قيّمة.
          </p>
        </div>

        {/* Feature Badges list */}
        <div className="grid grid-cols-2 gap-3 w-full text-right text-xs pt-2">
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-slate-300">تسليم رقمي فوري</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-slate-300">محفظة آمنة ومضمونة</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-slate-300">بطولات حصرية يومية</span>
          </div>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <Users className="w-4 h-4 text-purple-400 shrink-0" />
            <span className="text-slate-300">مجتمع لاعبين نشط</span>
          </div>
        </div>
      </div>

      {/* Bottom CTA Actions */}
      <div className="w-full max-w-md relative z-10 space-y-3 pt-6">
        <button
          onClick={() => setActiveScreen('home')}
          className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-sm tracking-wide shadow-xl shadow-cyan-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
        >
          <span>إبدأ الآن</span>
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
          <span>لديك حساب بالفعل؟</span>
          <button
            onClick={() => setActiveScreen('login')}
            className="text-cyan-400 hover:underline font-semibold"
          >
            تسجيل الدخول
          </button>
        </div>
      </div>

    </div>
  );
};
