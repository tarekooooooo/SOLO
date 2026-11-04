import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { 
  Truck, 
  ShieldCheck, 
  Star, 
  Sparkles, 
  SlidersHorizontal, 
  Key, 
  Package, 
  ExternalLink, 
  Search,
  Zap,
  ShoppingBag,
  Cpu,
  Layers
} from 'lucide-react';
import { PhysicalProduct, PhysicalProductCategory } from '../../types';
import { PhysicalProductDetailModal } from '../modals/PhysicalProductDetailModal';

const CATEGORIES: { id: PhysicalProductCategory | 'all'; name: string; icon: string }[] = [
  { id: 'all', name: 'جميع العتاد', icon: '🎮' },
  { id: 'keyboards', name: 'كيبوردات ميكانيكية', icon: '⌨️' },
  { id: 'headsets', name: 'سماعات محيطية 7.1', icon: '🎧' },
  { id: 'mice', name: 'ماوسات ألعاب خفيفة', icon: '🖱️' },
  { id: 'rgb_lights', name: 'إضاءات RGB ذكية', icon: '💡' },
  { id: 'streaming', name: 'مايكات واستوديو بث', icon: '🎙️' },
  { id: 'chairs', name: 'كراسي ألعاب احترافية', icon: '🪑' },
];

export const PhysicalStoreScreen: React.FC = () => {
  const { 
    physicalProducts, 
    formatPrice, 
    apiConfig, 
    setIsApiModalOpen,
    storefrontMode,
    setStorefrontMode,
    setActiveScreen
  } = useStore();

  const [selectedCategory, setSelectedCategory] = useState<PhysicalProductCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeProductForModal, setActiveProductForModal] = useState<PhysicalProduct | null>(null);

  // Filtered products
  const filteredProducts = physicalProducts.filter((p) => {
    const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesSearch = p.titleAr.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.cjSku.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-12 font-sans" dir="rtl">
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
        <button
          onClick={() => setIsApiModalOpen(true)}
          className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 text-xs font-bold flex items-center gap-2 transition-colors shrink-0"
          title="إعداد مفاتيح CJ Dropshipping و Google و Telegram"
        >
          <Key className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">مفاتيح الربط والـ API</span>
        </button>
      </div>

      {/* Hero Banner for Physical Gaming Hardware */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-[#0d1424] to-[#071321] border border-cyan-500/30 p-6 sm:p-8 shadow-[0_0_40px_rgba(6,182,212,0.15)]">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl text-right">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold">
              <Truck className="w-3.5 h-3.5" />
              <span>شحن دولي مباشر ومضمون من مستودعات CJ Dropshipping</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
              عتاد وإكسسوارات الألعاب الاحترافية <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                تسليم إلى باب منزلك مع أرقام تتبع فورية
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              اختر أفضل الملحقات المختبرة للاعبين: كيبوردات ميكانيكية، سماعات محيطية 7.1، ماوسات فائقة الخفة، وإضاءات RGB. نربط طلبك مباشرة مع مزود الدروب شيبينج العالمي CJ لتوصيل سريع للسعودية والخليج.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-300">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>ضمان استبدال وسرعة تسليم</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-cyan-400" />
                <span>شحن جوي سريع (4 - 7 أيام)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-indigo-400" />
                <span>مزامنة بوليصات الشحن آلياً</span>
              </div>
            </div>
          </div>

          {/* CJ Integration Status Card */}
          <div className="w-full md:w-72 p-4 rounded-2xl bg-black/40 backdrop-blur-md border border-cyan-500/30 text-right space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">حالة ربط CJ Dropshipping:</span>
              <span className={`w-2.5 h-2.5 rounded-full ${apiConfig.cjConnected ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]' : 'bg-amber-400'}`} />
            </div>

            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] space-y-1 font-mono">
              <div className="text-slate-400 flex justify-between">
                <span>Account:</span>
                <span className="text-white truncate max-w-[140px]">{apiConfig.cjAccountEmail}</span>
              </div>
              <div className="text-slate-400 flex justify-between">
                <span>Store ID:</span>
                <span className="text-cyan-400">{apiConfig.cjAppId}</span>
              </div>
              <div className="text-slate-400 flex justify-between">
                <span>Markup:</span>
                <span className="text-emerald-400">+{apiConfig.defaultMarkupPercent}% أرباح</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => setIsApiModalOpen(true)}
                className="w-full py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>فحص المفتاح وتجربة شراء طلب CJ</span>
              </button>
              <button
                onClick={() => setIsApiModalOpen(true)}
                className="w-full py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-[11px] transition-colors flex items-center justify-center gap-1.5"
              >
                <Key className="w-3 h-3 text-cyan-400" />
                <span>تعديل مفاتيح الربط والـ API</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Category Filter Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن كيبورد، سماعة، ماوس، أو كود CJ SKU..."
              className="w-full pl-4 pr-11 py-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500 shadow-inner"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-4 top-3.5" />
          </div>

          <div className="text-xs text-slate-400 shrink-0 font-medium">
            عرض <strong className="text-cyan-400 font-bold">{filteredProducts.length}</strong> منتج مادي متاح للشحن
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                selectedCategory === cat.id
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                  : 'bg-slate-900/70 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Physical Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredProducts.map((prod) => (
          <div
            key={prod.id}
            className="group relative rounded-2xl bg-gradient-to-b from-[#111624] to-[#0c101a] border border-slate-800 hover:border-cyan-500/50 p-4 transition-all duration-300 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] flex flex-col justify-between"
          >
            <div>
              {/* Product Image & Badges */}
              <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950 mb-3 border border-slate-800">
                <img
                  src={prod.image}
                  alt={prod.titleAr}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-sm text-[10px] font-bold text-cyan-300 border border-cyan-500/30 font-mono">
                  {prod.cjSku}
                </div>
                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[10px] text-slate-300 flex items-center gap-1">
                  <Truck className="w-3 h-3 text-cyan-400" />
                  <span>{prod.estimatedDeliveryDays.split('(')[0]}</span>
                </div>
              </div>

              {/* Title & Ratings */}
              <div className="space-y-1 mb-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[11px] text-cyan-400 font-semibold">{prod.category.toUpperCase()}</span>
                  <div className="flex items-center gap-1 text-amber-400">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span className="text-xs font-bold">{prod.rating}</span>
                  </div>
                </div>
                <h3 className="text-sm font-bold text-white line-clamp-2 group-hover:text-cyan-300 transition-colors">
                  {prod.titleAr}
                </h3>
              </div>

              {/* Variants preview tag */}
              {prod.variants.length > 0 && (
                <div className="text-[11px] text-slate-400 mb-3 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-slate-500" />
                  <span>خيارات: {prod.variants.map((v) => v.name).join('، ')}</span>
                </div>
              )}
            </div>

            {/* Price & Action Button */}
            <div className="pt-3 border-t border-slate-800/80 space-y-3">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-lg font-extrabold text-cyan-400 font-mono">
                    {formatPrice(prod.priceUSD)}
                  </span>
                  {prod.originalPriceUSD > prod.priceUSD && (
                    <span className="text-xs line-through text-slate-500 mr-2">
                      {formatPrice(prod.originalPriceUSD)}
                    </span>
                  )}
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  متوفر ({prod.stock})
                </span>
              </div>

              <button
                onClick={() => setActiveProductForModal(prod)}
                className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all flex items-center justify-center gap-1.5"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>شراء وتحديد عنوان الشحن</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal instance */}
      <PhysicalProductDetailModal
        product={activeProductForModal}
        onClose={() => setActiveProductForModal(null)}
      />
    </div>
  );
};
