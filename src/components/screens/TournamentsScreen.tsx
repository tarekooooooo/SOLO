import React, { useState } from 'react';
import { 
  Trophy, 
  Calendar, 
  Users, 
  Coins, 
  CheckCircle, 
  ArrowRight, 
  Flame, 
  Sparkles,
  Gamepad2
} from 'lucide-react';
import { INITIAL_TOURNAMENTS } from '../../data/mockData';
import { useStore } from '../../context/StoreContext';
import { Tournament } from '../../types';

export const TournamentsScreen: React.FC = () => {
  const { setActiveScreen, showToast } = useStore();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'ongoing' | 'past'>('upcoming');
  const [registeredTournaments, setRegisteredTournaments] = useState<{ [id: string]: boolean }>({});

  const handleRegister = (tr: Tournament) => {
    setRegisteredTournaments((prev) => ({
      ...prev,
      [tr.id]: true,
    }));
    showToast(`تم تأكيد تسجيلك في "${tr.title}" بنجاح! 🏆 بالتوفيق يا بطل.`);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      
      {/* Top Header matching Screen 8 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-bold text-white">بطولات الألعاب والجوائز (Tournaments)</h2>
        </div>
        <span className="font-mono text-xs text-cyan-400">PAGE 08 // TOURNAMENTS</span>
      </div>

      {/* Tabs: القادمة | الجارية | السابقة (Screen 8 in mockup) */}
      <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`flex-1 py-2 rounded-lg transition-all ${
            activeTab === 'upcoming' ? 'bg-cyan-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          البطولات القادمة
        </button>
        <button
          onClick={() => setActiveTab('ongoing')}
          className={`flex-1 py-2 rounded-lg transition-all ${
            activeTab === 'ongoing' ? 'bg-cyan-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          البطولات الجارية (Live)
        </button>
        <button
          onClick={() => setActiveTab('past')}
          className={`flex-1 py-2 rounded-lg transition-all ${
            activeTab === 'past' ? 'bg-cyan-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          السابقة والنتائج
        </button>
      </div>

      {/* Tournaments List Cards */}
      <div className="space-y-4">
        {INITIAL_TOURNAMENTS.map((tr) => {
          const isRegistered = registeredTournaments[tr.id];
          return (
            <div
              key={tr.id}
              className="rounded-3xl bg-[#0f1523] border border-cyan-500/20 overflow-hidden shadow-xl hover:border-cyan-500/40 transition-all space-y-4 p-5"
            >
              {/* Media header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-950 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Gamepad2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white">{tr.title}</h3>
                    <span className="text-xs text-cyan-400 font-semibold">{tr.game}</span>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-[10px] text-slate-400 block">مجموع الجوائز</span>
                  <span className="text-xs sm:text-sm font-extrabold text-amber-400 font-mono">
                    {tr.prizePool}
                  </span>
                </div>
              </div>

              {/* Tournament Specs Grid */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                  <Users className="w-3.5 h-3.5 text-cyan-400 mx-auto mb-1" />
                  <span className="text-[10px] text-slate-400 block">المشاركون</span>
                  <span className="font-mono font-bold text-slate-200">
                    {tr.participantsCount} / {tr.maxParticipants}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-1" />
                  <span className="text-[10px] text-slate-400 block">تاريخ البدء</span>
                  <span className="font-mono font-bold text-slate-200">{tr.startDate}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
                  <Coins className="w-3.5 h-3.5 text-amber-400 mx-auto mb-1" />
                  <span className="text-[10px] text-slate-400 block">رسوم الدخول</span>
                  <span className="font-bold text-slate-200 truncate block">{tr.entryFee}</span>
                </div>
              </div>

              {/* Action Button: التسجيل (Screen 8 in mockup) */}
              <div className="pt-2">
                <button
                  onClick={() => handleRegister(tr)}
                  disabled={isRegistered}
                  className={`w-full py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                    isRegistered
                      ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/60'
                      : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/20'
                  }`}
                >
                  {isRegistered ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span>أنت مسجل في البطولة ✅</span>
                    </>
                  ) : (
                    <>
                      <Trophy className="w-4 h-4 text-amber-400" />
                      <span>التسجيل في البطولة مجاناً</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};
