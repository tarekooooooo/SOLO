import React, { useState } from 'react';
import { 
  Users, 
  Trophy, 
  Flame, 
  MessageSquare, 
  Heart, 
  Share2, 
  Send, 
  Crown, 
  Medal, 
  Gamepad2, 
  Sparkles 
} from 'lucide-react';
import { LEADERBOARD } from '../../data/mockData';
import { useStore } from '../../context/StoreContext';

export const CommunityScreen: React.FC = () => {
  const { setActiveScreen } = useStore();
  const [activeTab, setActiveTab] = useState<'players' | 'tournaments' | 'groups'>('players');
  const [posts, setPosts] = useState([
    {
      id: 'p-1',
      author: 'Ahmed Gamer',
      handle: '@ahmed_pro',
      avatar: '🎮',
      time: 'منذ ساعتين',
      content: 'مستعد للمنافسة بقوة في بطولة PUBG Mobile القادمة! هل من فريق يحتاج لاعب رابع مساند؟ 🔥',
      likes: 24,
      liked: false,
      comments: 6,
    },
    {
      id: 'p-2',
      author: 'Sara Play',
      handle: '@sara_val',
      avatar: '👑',
      time: 'منذ 4 ساعات',
      content: 'منشور تجريبي داخل واجهة المجتمع؛ لا يمثل تقييمًا أو عملية شراء حقيقية.',
      likes: 48,
      liked: true,
      comments: 12,
    },
    {
      id: 'p-3',
      author: 'Sniper_KSA',
      handle: '@sniper_ksa',
      avatar: '🎯',
      time: 'منذ 6 ساعات',
      content: 'من يتحدى اليوم في روم بلايستيشن EA FC 26؟ الفائز يحصل على بطاقة PSN هدية! ⚽',
      likes: 35,
      liked: false,
      comments: 18,
    },
  ]);

  const [newPostText, setNewPostText] = useState('');

  const handleLike = (id: string) => {
    setPosts(
      posts.map((p) =>
        p.id === id
          ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }
          : p
      )
    );
  };

  const handleAddPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostText.trim()) return;

    const newP = {
      id: `p-${Date.now()}`,
      author: 'Demo Player',
      handle: '@demo',
      avatar: '🕹️',
      time: 'الآن',
      content: newPostText,
      likes: 1,
      liked: true,
      comments: 0,
    };

    setPosts([newP, ...posts]);
    setNewPostText('');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      
      {/* Top Header matching Screen 7 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-bold text-white">مجتمع اللاعبين (Community Hub)</h2>
        </div>
        <span className="font-mono text-xs text-cyan-400">PAGE 07 // COMMUNITY</span>
      </div>

      {/* 3 Tabs: اللاعبون | البطولات | المجموعات */}
      <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('players')}
          className={`flex-1 py-2 rounded-lg transition-all ${
            activeTab === 'players' ? 'bg-cyan-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          اللاعبون الأفضل
        </button>
        <button
          onClick={() => setActiveScreen('tournaments')}
          className="flex-1 py-2 rounded-lg text-slate-400 hover:text-white transition-all"
        >
          البطولات
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          className={`flex-1 py-2 rounded-lg transition-all ${
            activeTab === 'groups' ? 'bg-cyan-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          المجموعات والرومات
        </button>
      </div>

      {/* أفضل اللاعبين (Top Leaderboard - Exact layout from Screen 7) */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-[#0d1424] to-slate-900 border border-cyan-500/20 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">أفضل اللاعبين المتصدرين</h3>
          </div>
          <span className="text-[11px] text-cyan-400 font-semibold">تحديث أسبوعي</span>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          {LEADERBOARD.map((item, idx) => {
            const isFirst = item.rank === 1;
            return (
              <div
                key={item.rank}
                className={`relative p-3 rounded-2xl border transition-all ${
                  isFirst
                    ? 'bg-amber-950/30 border-amber-500/50 shadow-lg shadow-amber-900/20'
                    : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                {isFirst && (
                  <Crown className="w-5 h-5 text-amber-400 absolute -top-2.5 left-1/2 -translate-x-1/2 animate-bounce" />
                )}
                
                <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 p-0.5 mb-2 mt-1">
                  <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center font-bold text-base text-cyan-300">
                    {item.name.charAt(0)}
                  </div>
                </div>

                <div className="font-bold text-xs text-white truncate">{item.name}</div>
                <div className="text-[10px] text-cyan-400 mt-0.5">{item.tag}</div>
                <div className="text-[11px] font-mono font-bold text-amber-300 mt-1">{item.score}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ألعاب المجتمع الشائعة (Screen 7 in mockup) */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-300">ألعاب المجتمع النشطة</h3>
        <div className="grid grid-cols-4 gap-2">
          {['PUBG Mobile', 'Steam PC', 'PlayStation', 'Xbox Live'].map((g, i) => (
            <div key={i} className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center text-xs font-semibold text-slate-300 hover:border-cyan-500/40 cursor-pointer">
              {g}
            </div>
          ))}
        </div>
      </div>

      {/* New Post Input */}
      <form onSubmit={handleAddPost} className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-sm">
          🕹️
        </div>
        <input
          type="text"
          value={newPostText}
          onChange={(e) => setNewPostText(e.target.value)}
          placeholder="شارك فوزك أو ابحث عن كلان أو تحدث مع اللاعبين..."
          className="flex-1 bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
        />
        <button
          type="submit"
          className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-colors flex items-center gap-1"
        >
          <Send className="w-3.5 h-3.5" />
          <span>نشر</span>
        </button>
      </form>

      {/* Community Feed Posts */}
      <div className="space-y-3">
        {posts.map((post) => (
          <div key={post.id} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-base">
                  {post.avatar}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">{post.author}</h4>
                  <span className="text-[10px] text-slate-400 font-mono">{post.handle} • {post.time}</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-200 leading-relaxed">
              {post.content}
            </p>

            <div className="pt-2 border-t border-slate-800/60 flex items-center gap-6 text-xs text-slate-400">
              <button
                onClick={() => handleLike(post.id)}
                className={`flex items-center gap-1.5 transition-colors ${
                  post.liked ? 'text-rose-400 font-bold' : 'hover:text-white'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${post.liked ? 'fill-rose-400' : ''}`} />
                <span>{post.likes}</span>
              </button>

              <button className="flex items-center gap-1.5 hover:text-white transition-colors">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{post.comments} تعليق</span>
              </button>

              <button className="flex items-center gap-1.5 hover:text-white transition-colors">
                <Share2 className="w-3.5 h-3.5" />
                <span>مشاركة</span>
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
