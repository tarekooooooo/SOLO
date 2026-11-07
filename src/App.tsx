import React from 'react';
import { StoreProvider, useStore } from './context/StoreContext';
import { Header } from './components/Header';
import { HomeScreen } from './components/screens/HomeScreen';
import { PhysicalStoreScreen } from './components/screens/PhysicalStoreScreen';
import { AuthScreen } from './components/screens/AuthScreen';
import { SplashScreen } from './components/screens/SplashScreen';
import { ProductDetailScreen } from './components/screens/ProductDetailScreen';
import { GiftScreen } from './components/screens/GiftScreen';
import { WalletScreen } from './components/screens/WalletScreen';
import { CommunityScreen } from './components/screens/CommunityScreen';
import { TournamentsScreen } from './components/screens/TournamentsScreen';
import { ProfileScreen } from './components/screens/ProfileScreen';
import { MerchantDashboardScreen } from './components/screens/MerchantDashboardScreen';
import { AdminFulfillmentScreen } from './components/screens/AdminFulfillmentScreen';
import { CustomerSupportScreen } from './components/screens/CustomerSupportScreen';
import { SecurityAndCurrencyScreen } from './components/screens/SecurityAndCurrencyScreen';
import { OrderFulfillmentModal } from './components/modals/OrderFulfillmentModal';
import { OriginalDesignsModal } from './components/OriginalDesignsModal';
import { ApiSettingsModal } from './components/modals/ApiSettingsModal';
import { MobileFrame } from './components/MobileFrame';
import { 
  Gamepad2, 
  Layers, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  PackageCheck, 
  Smartphone, 
  Monitor,
  CheckCircle2,
  ArrowRight,
  Headphones,
  User,
  Crown,
  Truck,
  Key,
  LogIn
} from 'lucide-react';

const MainLayout: React.FC = () => {
  const { 
    activeScreen, 
    setActiveScreen, 
    viewMode, 
    setViewMode, 
    toastMessage, 
    setShowOriginalDesigns,
    storefrontMode,
    setIsApiModalOpen,
    currentUser,
    userRole,
    isAuthLoading
  } = useStore();

  const renderActiveScreenContent = () => {
    if (isAuthLoading && (activeScreen === 'admin' || activeScreen === 'merchant')) {
      return <div className="py-20 text-center text-cyan-300">جارٍ التحقق من صلاحية الحساب…</div>;
    }
    if (activeScreen === 'admin' && (!currentUser || userRole !== 'admin')) {
      return <AuthScreen />;
    }
    if (activeScreen === 'merchant' && (!currentUser || (userRole !== 'merchant' && userRole !== 'admin'))) {
      return <AuthScreen />;
    }
    switch (activeScreen) {
      case 'splash':
        return <SplashScreen />;
      case 'login':
        return <AuthScreen />;
      case 'auth':
        return <AuthScreen />;
      case 'physical_store':
        return <PhysicalStoreScreen />;
      case 'home':
        return storefrontMode === 'physical' ? <PhysicalStoreScreen /> : <HomeScreen />;
      case 'product':
        return <ProductDetailScreen />;
      case 'gift':
        return <GiftScreen />;
      case 'wallet':
        return <WalletScreen />;
      case 'community':
        return <CommunityScreen />;
      case 'tournaments':
        return <TournamentsScreen />;
      case 'profile':
        return <ProfileScreen />;
      case 'merchant':
        return <MerchantDashboardScreen />;
      case 'admin':
        return <AdminFulfillmentScreen />;
      case 'support':
        return <CustomerSupportScreen />;
      case 'security':
        return <SecurityAndCurrencyScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0e14] text-slate-100 flex flex-col justify-between selection:bg-cyan-500 selection:text-black">
      
      {/* Top Bar following Top Bar Contract */}
      <Header />

      <div role="status" className="border-b border-amber-500/30 bg-amber-950/40 px-4 py-2 text-center text-xs leading-relaxed text-amber-200">
        SOLO في وضع المعاينة والإعداد. لا توجد معاملات أو عمليات تسليم مفعّلة؛ لا ترسل أي دفعة حتى إعلان جاهزية المتجر.
      </div>

      {/* Floating Notification Toast */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-900/95 border border-cyan-500/50 text-cyan-300 text-xs font-semibold shadow-2xl shadow-cyan-950/60 backdrop-blur-md">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* 12-Screens Quick Workflow Bar (Desktop mode) */}
      <div className="bg-[#0e1320] border-b border-slate-800/80 py-2.5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-bold text-white">الوصول السريع للأقسام الرئيسية:</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 md:pb-0 scrollbar-none">
            {[
              { id: 'physical_store', label: '📦 عتاد CJ المادي (الدروب شيبينج)', isSpecial: true },
              { id: 'home', label: '🏪 المتجر الرقمي' },
              { id: 'auth', label: '🔐 تسجيل الدخول (Google/Telegram)', isSpecial: true },
              ...(userRole === 'admin' ? [{ id: 'admin', label: '👑 لوحة الإدمن والمساعدين (11)', isSpecial: true }] : []),
              { id: 'profile', label: '👤 صفحة الملف الشخصي (9)', isSpecial: true },
              { id: 'support', label: '🎧 خدمة العملاء والدعم', isSpecial: true },
              ...(userRole === 'admin' || userRole === 'merchant' ? [{ id: 'merchant', label: '📦 إدارة المنتجات (10)' }] : []),
              { id: 'product', label: 'المنتج (4)' },
              { id: 'gift', label: 'الهدية (5)' },
              { id: 'wallet', label: 'المحفظة (6)' },
              { id: 'tournaments', label: 'البطولات (8)' },
              { id: 'community', label: 'المجتمع (7)' },
              { id: 'security', label: 'الأمان والعملات (13)' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveScreen(item.id as any)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  activeScreen === item.id
                    ? 'bg-cyan-500 text-black shadow-md font-bold'
                    : item.isSpecial
                    ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/60 hover:bg-cyan-900/60'
                    : 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowOriginalDesigns(true)}
            className="text-cyan-400 hover:text-cyan-300 hover:underline font-semibold flex items-center gap-1 shrink-0"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>عرض الصورة الأصلية (12 شاشة)</span>
          </button>
        </div>
      </div>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {viewMode === 'mobile_simulator' ? (
          <MobileFrame>
            {renderActiveScreenContent()}
          </MobileFrame>
        ) : (
          renderActiveScreenContent()
        )}
      </main>

      {/* Store Features Banner from Mockup Screen 14 */}
      <footer className="mt-12 border-t border-slate-800/80 bg-[#090d16] py-10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* 8 Store Features Grid (Screen 14 in mockup) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-center text-xs">
            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <ShieldCheck className="w-5 h-5 text-cyan-400 mx-auto mb-1.5" />
              <span className="font-bold text-white block">محفظة آمنة</span>
              <span className="text-[10px] text-slate-500">حماية مشفرة</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <Gamepad2 className="w-5 h-5 text-amber-400 mx-auto mb-1.5" />
              <span className="font-bold text-white block">بطولات حصرية</span>
              <span className="text-[10px] text-slate-500">جوائز نقدية</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <Sparkles className="w-5 h-5 text-purple-400 mx-auto mb-1.5" />
              <span className="font-bold text-white block">مجتمع لاعبين</span>
              <span className="text-[10px] text-slate-500">تفاعل وتحدي</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <PackageCheck className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
              <span className="font-bold text-white block">متجر شامل</span>
              <span className="text-[10px] text-slate-500">كافة الألعاب</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <Zap className="w-5 h-5 text-cyan-400 mx-auto mb-1.5" />
              <span className="font-bold text-white block">تسليم فوري</span>
              <span className="text-[10px] text-slate-500">أقل من 60 ثانية</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <Monitor className="w-5 h-5 text-blue-400 mx-auto mb-1.5" />
              <span className="font-bold text-white block">API للمطورين</span>
              <span className="text-[10px] text-slate-500">ربط خوادم وتجار</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <ShieldCheck className="w-5 h-5 text-teal-400 mx-auto mb-1.5" />
              <span className="font-bold text-white block">نظام تجار متكامل</span>
              <span className="text-[10px] text-slate-500">إدارة المخزون</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80">
              <Zap className="w-5 h-5 text-amber-400 mx-auto mb-1.5" />
              <span className="font-bold text-white block">متعدد العملات</span>
              <span className="text-[10px] text-slate-500">دولار، ريال، جنيه</span>
            </div>
          </div>

          {/* Footer Brand line */}
          <div className="pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
            <div className="flex items-center gap-3">
              <span className="text-white font-extrabold tracking-wider">SOLO</span>
              <span>•</span>
              <span>Play • Shop • Compete • Earn</span>
            </div>
            <div>
              منصة متكاملة للألعاب الرقمية وإدارة المنتجات وتجهيز طلبات العملاء بشكل فعال © 2026
            </div>
          </div>

        </div>
      </footer>

      {/* Global Modals */}
      <OrderFulfillmentModal />
      <OriginalDesignsModal />
      <ApiSettingsModal />

    </div>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <MainLayout />
    </StoreProvider>
  );
}
