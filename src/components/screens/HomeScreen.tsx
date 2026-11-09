import React, { useState } from 'react';
import { 
  Search, 
  Sparkles, 
  Gamepad2, 
  CreditCard, 
  Coins, 
  Gift, 
  Trophy, 
  Wrench, 
  ChevronLeft, 
  Star, 
  ArrowLeft,
  Flame,
  CheckCircle,
  ExternalLink,
  Truck,
  Zap,
  Key
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { ProductCategory } from '../../types';

export const HomeScreen: React.FC = () => {
  const { 
    products, 
    setSelectedProductId, 
    setActiveScreen, 
    formatPrice, 
    currency,
    storefrontMode,
    setStorefrontMode,
    setIsApiModalOpen
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');

  const categories = [
    { id: 'all', name: 'الكل', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'game_currency', name: 'شحن العملات', icon: <Coins className="w-4 h-4" /> },
    { id: 'cards', name: 'البطاقات الرقمية', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'games', name: 'الألعاب الكاملة', icon: <Gamepad2 className="w-4 h-4" /> },
    { id: 'gifts', name: 'الهدايا الفورية', icon: <Gift className="w-4 h-4" /> },
    { id: 'tournaments', name: 'البطولات', icon: <Trophy className="w-4 h-4" /> },
    { id: 'services', name: 'خدمات اللاعبين', icon: <Wrench className="w-4 h-4" /> },
  ];

  const featuredPlatforms = [
    { id: 'pubg', name: 'PUBG', label: 'ببجي موبايل', color: 'from-amber-600 to-yellow-500' },
    { id: 'steam', name: 'Steam', label: 'ستيم بي سي', color: 'from-blue-600 to-indigo-700' },
    { id: 'playstation', name: 'PlayStation', label: 'بلايستيشن', color: 'from-blue-700 to-cyan-600' },
    { id: 'xbox', name: 'Xbox', label: 'إكس بوكس', color: 'from-emerald-600 to-green-700' },
  ];

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.titleAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesPlat = selectedPlatform === 'all' || p.platform === selectedPlatform;
    return matchesSearch && matchesCat && matchesPlat;
  });

  const handleProductClick = (id: string) => {
    setSelectedProductId(id);
    setActiveScreen('product');
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Dual Homepages Switcher Banner */}
      <div className="p-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-2 shadow-lg">
        <div className="flex items-center gap-2 flex-1">
          <button
            onClick={() => {
              setStorefrontMode('digital');
              setActiveScreen('home');
            }}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              storefrontMode === 'digital'
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.5)]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>🏪 المتجر الرقمي (شدات وبطاقات فمعية)</span>
          </button>

          <button
            onClick={() => {
              setStorefrontMode('physical');
              setActiveScreen('physical_store');
            }}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              storefrontMode === 'physical'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>📦 متجر عتاد الألعاب المادي (CJ Dropshipping)</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-extrabold mr-1">
              جديد
            </span>
          </button>
        </div>

        {/* API Settings Quick Access */}
        {import.meta.env.DEV && (
        <button
          onClick={() => setIsApiModalOpen(true)}
          className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 text-xs font-bold flex items-center gap-2 transition-colors shrink-0"
          title="إعداد مفاتيح CJ Dropshipping و Google و Telegram"
        >
          <Key className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">مفاتيح الربط والـ API</span>
        </button>
        )}
      </div>

      {/* Top Search Bar & Greeting */}
      <div className="relative">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن منتج، كود، لعبة، شدات PUBG، أو بطاقة ستيم..."
              className="w-full pl-4 pr-11 py-3 bg-slate-900/90 border border-slate-800 rounded-2xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 shadow-inner"
            />
            <Search className="w-5 h-5 text-slate-400 absolute right-3.5 top-3.5" />
          </div>
        </div>
      </div>

      {/* Hero Banner: Screen 3 & 12 */}
      <div className="relative rounded-3xl overflow-hidden border border-cyan-500/20 bg-gradient-to-r from-[#0d1527] via-[#091122] to-[#0d1e33] p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 max-w-xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>متجر SOLO قيد الإعداد</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight">
            نجهّز كتالوج SOLO <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-300">
              لعرض منتجات موثّقة فقط
            </span>
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md">
            لا توجد منتجات منشورة حاليًا. الدفع والتسليم متوقفان حتى اكتمال ربط المخزون وبوابات الدفع؛ لا تحوّل أموالًا.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => {
                setActiveScreen('auth');
              }}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-cyan-600/30 flex items-center gap-2 transition-all hover:scale-105"
            >
              <span>تسجيل الدخول أو إنشاء حساب</span>
              <ArrowLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => setActiveScreen('physical_store')}
              className="px-5 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-xs sm:text-sm flex items-center gap-2 transition-colors"
            >
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>حالة المنتجات المادية</span>
            </button>
          </div>
        </div>

        {/* Ambient Hero Graphic */}
        <div 
          className="absolute left-0 bottom-0 top-0 w-1/2 opacity-25 lg:opacity-45 bg-contain bg-no-repeat bg-left pointer-events-none mix-blend-screen"
          style={{ backgroundImage: `url('/assets/aistudio/file_000000007e1c81f5ba66efa05ab9f2e5_0ba40384.png')` }}
        />
      </div>

      {/* Category Icons Carousel */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200">الأقسام والخدمات الرئيسية</h3>
          <span className="text-xs text-slate-500 font-mono">7 CATEGORIES</span>
        </div>

        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                if (cat.id === 'tournaments') {
                  setActiveScreen('tournaments');
                } else if (cat.id === 'gifts') {
                  setActiveScreen('gift');
                } else {
                  setSelectedCategory(cat.id);
                }
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                selectedCategory === cat.id
                  ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/25'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700'
              }`}
            >
              {cat.icon}
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* أقسام مميزة (Featured Platforms - Page 3 in Mockup) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200">أقسام مميزة (Featured Platforms)</h3>
          <button
            onClick={() => setSelectedPlatform('all')}
            className="text-xs text-cyan-400 hover:underline"
          >
            عرض الكل
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {featuredPlatforms.map((plat) => (
            <button
              key={plat.id}
              onClick={() => setSelectedPlatform(selectedPlatform === plat.id ? 'all' : plat.id)}
              className={`relative overflow-hidden p-4 rounded-2xl border text-right transition-all group ${
                selectedPlatform === plat.id
                  ? 'border-cyan-400 bg-cyan-950/40 shadow-lg shadow-cyan-500/20'
                  : 'border-slate-800 bg-slate-900/80 hover:border-slate-700 hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-white font-mono tracking-wider">{plat.name}</span>
                <span className={`w-3 h-3 rounded-full bg-gradient-to-r ${plat.color}`} />
              </div>
              <div className="text-sm font-bold text-slate-200 group-hover:text-cyan-400 transition-colors">
                {plat.label}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                <span>تصفح المنتجات</span>
                <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* المنتجات المقترحة (Recommended Products - Page 3 in Mockup) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">كتالوج المنتجات المنشورة</h3>
            <p className="text-xs text-slate-400">يعرض هذا القسم المنتجات التي أُضيفت إلى قاعدة المتجر فقط.</p>
          </div>
          <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2.5 py-1 rounded-lg border border-cyan-800">
            {filteredProducts.length ? `${filteredProducts.length} منتج منشور` : 'لا توجد منتجات منشورة'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProducts.map((product) => {
            const minPrice = Math.min(...product.packages.map((p) => p.priceUSD));
            return (
              <div
                key={product.id}
                onClick={() => handleProductClick(product.id)}
                className="group cursor-pointer rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-500/10 flex flex-col justify-between"
              >
                <div>
                  {/* Image banner */}
                  <div className="relative h-44 rounded-xl overflow-hidden bg-slate-950 mb-3 border border-slate-800/80">
                    <img
                      src={product.image}
                      alt={product.titleAr}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    
                    {/* Top tags */}
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-[11px] font-mono font-bold text-cyan-300 border border-cyan-500/30">
                        {product.platform.toUpperCase()}
                      </span>
                    </div>

                    <div className="absolute bottom-2.5 right-2.5 left-2.5 flex items-center justify-between text-xs text-white">
                      <span className="text-[11px] text-amber-200 bg-amber-950/70 px-2 py-0.5 rounded border border-amber-800 font-semibold">
                        الشراء متوقف مؤقتًا
                      </span>
                    </div>
                  </div>

                  {/* Title and description */}
                  <h4 className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors line-clamp-1">
                    {product.titleAr}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {product.description}
                  </p>
                </div>

                {/* Footer and Price */}
                <div className="pt-4 mt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 block">يبدأ من</span>
                    <span className="text-sm font-extrabold text-cyan-400 font-mono">
                      {formatPrice(minPrice)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProductId(product.id);
                        setActiveScreen('gift');
                      }}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-purple-300 transition-colors"
                      title="إرسال كهدية"
                    >
                      <Gift className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProductClick(product.id);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-md shadow-cyan-600/20"
                    >
                      عرض التفاصيل
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
          {filteredProducts.length === 0 && (
            <div role="status" className="sm:col-span-2 lg:col-span-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-center text-sm text-slate-300">
              لا توجد منتجات متاحة للشراء الآن. سنعرض المنتج هنا بعد إضافته والتحقق من مخزونه وتسليمه.
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
