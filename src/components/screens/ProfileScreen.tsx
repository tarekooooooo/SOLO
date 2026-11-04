import React, { useState } from 'react';
import { 
  User, 
  Trophy, 
  Award, 
  Gamepad2, 
  Settings, 
  Check, 
  ExternalLink, 
  Edit3, 
  Sparkles,
  ShieldCheck,
  Flame
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export const ProfileScreen: React.FC = () => {
  const { playerProfile, updatePlayerProfile, showToast, setActiveScreen } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(playerProfile.username);
  const [pubgId, setPubgId] = useState(playerProfile.connectedPlatforms.pubgId || '519284710');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updatePlayerProfile({
      username,
      connectedPlatforms: {
        ...playerProfile.connectedPlatforms,
        pubgId,
      },
    });
    setIsEditing(false);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      
      {/* Top Header matching Screen 9 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-bold text-white">الملف الشخصي للاعب (Player Profile)</h2>
        </div>
        <span className="font-mono text-xs text-cyan-400">PAGE 09 // PROFILE</span>
      </div>

      {/* Main Profile Card (Exact layout from Screen 9) */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-[#0d1424] to-[#0a101d] border border-cyan-500/20 p-6 sm:p-8 shadow-2xl space-y-6">
        
        {/* User Identity Banner */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-right">
          <div className="relative">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-cyan-600 via-blue-500 to-indigo-600 p-1 shadow-xl shadow-cyan-500/30">
              <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center text-3xl">
                🕹️
              </div>
            </div>
            <span className="absolute -bottom-2 left-1/2 sm:left-auto sm:right-1/2 sm:translate-x-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-cyan-500 text-black text-[10px] font-black font-mono">
              LVL {playerProfile.level}
            </span>
          </div>

          <div className="space-y-1.5 flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h3 className="text-xl font-black text-white">{playerProfile.username}</h3>
              <span className="text-xs font-mono text-cyan-400 font-semibold">{playerProfile.tag}</span>
            </div>

            <p className="text-xs text-amber-400 font-semibold">
              {playerProfile.rank} • نقطة {playerProfile.points} / 1500
            </p>

            {/* Level progress bar */}
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mt-2">
              <div className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full w-[68%]" />
            </div>
          </div>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="تعديل الملف"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        </div>

        {/* 3 Metrics: المتابعون | المشاركات | الإنجازات (Screen 9 in mockup) */}
        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-800/80 text-center">
          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block">المتابعون</span>
            <span className="text-base font-black font-mono text-cyan-400">2.5k</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block">المشاركات</span>
            <span className="text-base font-black font-mono text-emerald-400">120</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-[10px] text-slate-400 block">الإنجازات</span>
            <span className="text-base font-black font-mono text-amber-400">8</span>
          </div>
        </div>

        {/* Edit profile drawer/form */}
        {isEditing && (
          <form onSubmit={handleSave} className="p-4 rounded-2xl bg-slate-950 border border-cyan-500/30 space-y-3 text-xs">
            <h4 className="font-bold text-white">تعديل بيانات اللاعب</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">اسم المستخدم</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">معرّف ببجي موبايل (PUBG ID)</label>
                <input
                  type="text"
                  value={pubgId}
                  onChange={(e) => setPubgId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-cyan-600 text-white font-bold"
              >
                حفظ التعديلات
              </button>
            </div>
          </form>
        )}

        {/* المنصات المرتبطة (Connected Platforms - Screen 9 in mockup) */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-200">المنصات وحسابات الألعاب المرتبطة:</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-white block">Steam</span>
                <span className="text-[10px] text-slate-400 font-mono">Tarek_Steam99</span>
              </div>
              <Check className="w-4 h-4 text-emerald-400" />
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-white block">PlayStation</span>
                <span className="text-[10px] text-slate-400 font-mono">Tarek_PSN</span>
              </div>
              <Check className="w-4 h-4 text-emerald-400" />
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-white block">Xbox</span>
                <span className="text-[10px] text-slate-400 font-mono">TarekLive</span>
              </div>
              <Check className="w-4 h-4 text-emerald-400" />
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="font-bold text-white block">PUBG ID</span>
                <span className="text-[10px] text-cyan-400 font-mono font-bold">{pubgId}</span>
              </div>
              <Check className="w-4 h-4 text-emerald-400" />
            </div>
          </div>
        </div>

        {/* الألعاب المفضلة (Screen 9 in mockup) */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-200">الألعاب المفضلة:</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs text-center">
            {playerProfile.favoriteGames.map((game: string, i: number) => (
              <div key={i} className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 font-semibold text-slate-300">
                {game}
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
