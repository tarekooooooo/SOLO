import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { 
  X, 
  Key, 
  ShieldCheck, 
  CheckCircle2, 
  RefreshCw, 
  ExternalLink, 
  Copy, 
  Sparkles, 
  HelpCircle,
  Truck,
  Globe,
  Send,
  Play,
  Terminal,
  Zap,
  CheckCircle,
  AlertCircle,
  ListOrdered,
  Search,
  ShoppingBag,
  PackageCheck,
  Info,
  Compass,
  ArrowRight
} from 'lucide-react';

export const ApiSettingsModal: React.FC = () => {
  const { 
    isApiModalOpen, 
    setIsApiModalOpen, 
    apiConfig, 
    updateApiConfig, 
    testCjConnection,
    executeCjTestPurchase,
    fetchRealCjOrders,
    physicalProducts,
    setActiveScreen,
    showToast 
  } = useStore();

  const [activeTab, setActiveTab] = useState<'cj' | 'google' | 'telegram' | 'guide'>('cj');
  const [isTestingCj, setIsTestingCj] = useState(false);
  const [isTestingOrder, setIsTestingOrder] = useState(false);
  const [testOrderResult, setTestOrderResult] = useState<any>(null);
  const [isFetchingRealOrders, setIsFetchingRealOrders] = useState(false);
  const [realCjOrdersResult, setRealCjOrdersResult] = useState<any>(null);

  // Live SKU & CJ Catalog Search states
  const [customSkuInput, setCustomSkuInput] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('mouse');
  const [isSearchingCj, setIsSearchingCj] = useState(false);
  const [cjSearchResults, setCjSearchResults] = useState<any[]>([]);
  const [searchCjError, setSearchCjError] = useState<string | null>(null);

  // Local form states
  const [cjApiKey, setCjApiKey] = useState(apiConfig.cjApiKey);
  const [cjAccountEmail, setCjAccountEmail] = useState(apiConfig.cjAccountEmail);
  const [cjAppId, setCjAppId] = useState(apiConfig.cjAppId);
  const [googleClientId, setGoogleClientId] = useState(apiConfig.googleClientId);
  const [telegramBotUsername, setTelegramBotUsername] = useState(apiConfig.telegramBotUsername);
  const [autoFulfill, setAutoFulfill] = useState(apiConfig.autoFulfillWithCJ);
  const [markupPercent, setMarkupPercent] = useState(apiConfig.defaultMarkupPercent);

  if (!isApiModalOpen) return null;

  const handleSave = () => {
    updateApiConfig({
      cjApiKey,
      cjAccountEmail,
      cjAppId,
      googleClientId,
      telegramBotUsername,
      autoFulfillWithCJ: autoFulfill,
      defaultMarkupPercent: markupPercent,
    });
    showToast('تم حفظ المفاتيح والإعدادات بنجاح!');
    setIsApiModalOpen(false);
  };

  const handleTestCj = async () => {
    setIsTestingCj(true);
    updateApiConfig({ cjApiKey, cjAccountEmail, cjAppId });
    await testCjConnection(cjApiKey);
    setIsTestingCj(false);
  };

  const handleFetchRealOrders = async () => {
    setIsFetchingRealOrders(true);
    updateApiConfig({ cjApiKey, cjAccountEmail, cjAppId });
    const res = await fetchRealCjOrders(cjApiKey);
    setRealCjOrdersResult(res);
    setIsFetchingRealOrders(false);
  };

  const handleSearchCjProducts = async () => {
    if (!cjApiKey || cjApiKey.trim() === '') {
      showToast('يرجى إدخال مفتاح CJ API أولاً للبحث في الكتالوج');
      return;
    }
    setIsSearchingCj(true);
    setSearchCjError(null);
    try {
      const res = await fetch('/api/cj/product-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: cjApiKey, keyword: searchKeyword || 'mouse' }),
      });
      const data = await res.json();
      if (data.success && data.products) {
        setCjSearchResults(data.products);
        showToast(`تم العثور على ${data.products.length} منتج برمز SKU حقيقي من CJ!`);
      } else {
        setSearchCjError(data.message || 'لم يتم العثور على منتجات');
        setCjSearchResults([]);
      }
    } catch (err: any) {
      setSearchCjError(err.message);
    } finally {
      setIsSearchingCj(false);
    }
  };

  const handleRunTestOrder = async () => {
    setIsTestingOrder(true);
    updateApiConfig({ cjApiKey, cjAccountEmail, cjAppId });
    const res = await executeCjTestPurchase(undefined, customSkuInput);
    setTestOrderResult(res);
    setIsTestingOrder(false);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`تم نسخ ${label} إلى الحافظة!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative w-full max-w-3xl max-h-[92vh] overflow-hidden rounded-2xl bg-[#0f141f] border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.15)] flex flex-col text-right font-sans"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                لوحة مفاتيح الربط والتكامل (API Keys)
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  CJ & Google & Telegram
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                أدخل مفاتيح الربط لتشغيل متجر المنتجات المادية وتسجيل الدخول الاجتماعي
              </p>
            </div>
          </div>
          <button 
            onClick={() => setIsApiModalOpen(false)}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800 bg-[#0c101a]">
          <button
            onClick={() => setActiveTab('cj')}
            className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'cj'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>ربط CJ Dropshipping (المنتجات المادية)</span>
            {apiConfig.cjConnected && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('google')}
            className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'google'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>تسجيل دخول Google</span>
          </button>

          <button
            onClick={() => setActiveTab('telegram')}
            className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'telegram'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>تسجيل دخول Telegram</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-2 pb-3 px-3 text-sm font-semibold border-b-2 transition-colors mr-auto ${
              activeTab === 'guide'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>ما الذي نحتاجه منك؟ (دليل المفاتيح)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: CJ DROPSHIPPING */}
          {activeTab === 'cj' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-900/20 via-cyan-950/20 to-slate-900 border border-cyan-500/20 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400 shrink-0">
                  <Truck className="w-5 h-5" />
                </div>
                <div className="text-xs leading-relaxed text-slate-300">
                  <strong className="text-cyan-300 block text-sm mb-1">ربط التوريد والشحن الآلي مع CJ Dropshipping:</strong>
                  يمكن لمتجرك سحب عتاد واكسسوارات الألعاب المادية (سماعات، كيبوردات، كراسي، إضاءات RGB) وتمرير طلبات العملاء أوتوماتيكياً مع عناوين الشحن في الخليج والوطن العربي والحصول على أرقام التتبع فوراً.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <label className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-cyan-400" />
                      CJ API Key (Access Token)
                    </label>
                    <span className="text-[11px] text-cyan-400/80">مطلوب من حساب CJ Developers</span>
                  </div>
                  <input
                    type="password"
                    value={cjApiKey}
                    onChange={(e) => setCjApiKey(e.target.value)}
                    placeholder="cjp_live_xxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-cyan-500 focus:outline-none text-white text-sm font-mono tracking-wider"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-200">
                    البريد الإلكتروني لحساب CJ Dropshipping
                  </label>
                  <input
                    type="email"
                    value={cjAccountEmail}
                    onChange={(e) => setCjAccountEmail(e.target.value)}
                    placeholder="your-email@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-cyan-500 focus:outline-none text-white text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-200">
                    معرف المتجر في CJ (App / Store ID)
                  </label>
                  <input
                    type="text"
                    value={cjAppId}
                    onChange={(e) => setCjAppId(e.target.value)}
                    placeholder="CJ-STORE-86628"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-cyan-500 focus:outline-none text-white text-sm font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-200">
                    نسبة هامش الربح التلقائي على المنتجات (%)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={markupPercent}
                      onChange={(e) => setMarkupPercent(Number(e.target.value))}
                      min="5"
                      max="200"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-cyan-500 focus:outline-none text-white text-sm"
                    />
                    <span className="text-xs px-3 py-2.5 rounded-xl bg-slate-800 text-cyan-400 font-bold border border-slate-700">
                      %{markupPercent}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/70 border border-slate-800">
                  <div>
                    <div className="text-xs font-bold text-white">إرسال الطلبات آلياً إلى CJ فور دفع العميل</div>
                    <div className="text-[11px] text-slate-400">توليد بوليصة الشحن وتحديث رقم التتبع بدون تدخل يدوي</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoFulfill}
                      onChange={(e) => setAutoFulfill(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                  </label>
                </div>
              </div>

              {/* Status and Test Connection */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/90 border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className={`w-3.5 h-3.5 rounded-full ${apiConfig.cjConnected ? 'bg-emerald-400 shadow-[0_0_10px_#10b981]' : 'bg-amber-400'}`} />
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>{apiConfig.cjConnected ? 'الاتصال بخوادم CJ متصل ومصادق عليه 🟢' : 'بانتظار التحقق من مفتاح API 🟡'}</span>
                      {apiConfig.cjApiKey && (
                        <span className="font-mono text-[10px] text-cyan-400 px-2 py-0.5 rounded bg-slate-800">
                          {apiConfig.cjApiKey.slice(0, 10)}...
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      مستودعات الشحن: الصين، السعودية، الإمارات، وأوروبا (CJ Packet Line)
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestCj}
                    disabled={isTestingCj}
                    className="px-4 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-bold flex items-center justify-center gap-2 transition-all"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingCj ? 'animate-spin' : ''}`} />
                    <span>{isTestingCj ? 'جاري الفحص المباشر...' : '1. فحص وتأكيد المفتاح'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleFetchRealOrders}
                    disabled={isFetchingRealOrders}
                    className="px-4 py-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold flex items-center justify-center gap-2 transition-all"
                  >
                    <ListOrdered className={`w-3.5 h-3.5 ${isFetchingRealOrders ? 'animate-spin' : ''}`} />
                    <span>{isFetchingRealOrders ? 'جاري استعلام CJ...' : '2. سحب طلبات CJ الحقيقية'}</span>
                  </button>
                </div>
              </div>

              {/* REAL CJ ORDERS QUERY RESULT */}
              {realCjOrdersResult && (
                <div className="p-4 rounded-xl bg-[#09111e] border border-blue-500/30 space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PackageCheck className="w-4 h-4 text-blue-400" />
                      <span className="text-xs font-bold text-white">الطلبات المسترجعة مباشرة من حساب CJ الخاص بك:</span>
                    </div>
                    <span className="text-[11px] text-blue-400 font-mono">
                      {realCjOrdersResult.latencyMs ? `${realCjOrdersResult.latencyMs}ms ⚡` : ''}
                    </span>
                  </div>

                  {realCjOrdersResult.success ? (
                    realCjOrdersResult.ordersCount > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {realCjOrdersResult.orders.map((ord: any, idx: number) => (
                          <div key={idx} className="p-2.5 rounded-lg bg-black/40 border border-slate-800 text-xs flex items-center justify-between">
                            <div>
                              <span className="font-mono font-bold text-cyan-300">{ord.orderNum || ord.cjOrderId || ord.orderId}</span>
                              <span className="text-slate-400 mr-2 text-[11px]">{ord.createDate || ord.createTime || 'حديث'}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-emerald-400 font-bold">${ord.orderAmount || ord.amount || '0.00'}</span>
                              <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px]">
                                {ord.orderStatus || 'معلق'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-slate-300 space-y-1">
                        <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4" />
                          <span>تم الاتصال بحسابك في CJ بنجاح! لا توجد طلبات سابقة مسجلة حتى الآن (0 طلبات).</span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          مفتاحك يعمل بنسبة 100% مع سيرفرات CJ. يمكنك الآن إنشاء أول طلب تجريبي عبر الأداة بالأسفل.
                        </p>
                      </div>
                    )
                  ) : (
                    <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                      <strong>استجابة سيرفر CJ: </strong>{realCjOrdersResult.message}
                    </div>
                  )}
                </div>
              )}

              {/* CRITICAL CJ PATH EXPLANATION BOX */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-amber-950/20 border border-amber-500/30 space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300">
                    <Compass className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-amber-300">
                    أين تجد الطلبات داخل موقع CJ Dropshipping بعد الشراء؟ (مسار الوصول الدقيق)
                  </h4>
                </div>

                <div className="text-xs text-slate-300 space-y-1.5 leading-relaxed">
                  <p>
                    في موقع <strong>cjdropshipping.com</strong>، الطلبات المنفذة عبر API أو المتاجر لا تظهر في قسم <em>My Orders</em> العادية، بل تظهر تحديداً في:
                  </p>
                  <div className="p-2.5 rounded-lg bg-black/60 border border-amber-500/20 font-mono text-[11px] text-amber-200 flex items-center gap-2 flex-wrap" dir="ltr">
                    <span className="font-bold text-white">cjdropshipping.com</span>
                    <span>➡️</span>
                    <span className="font-bold text-cyan-400">My CJ</span>
                    <span>➡️</span>
                    <span className="font-bold text-cyan-400">Orders (الطلبات)</span>
                    <span>➡️</span>
                    <span className="font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded">Store Orders (طلبات المتجر)</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    💡 ستجد الطلب هناك بحالة <strong>Awaiting Payment</strong> (بانتظار تأكيد ودفع قيمة الجملة من التاجر للشحن).
                  </p>
                </div>
              </div>

              {/* LIVE CJ CATALOG SEARCH & SKU PICKER */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-cyan-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-cyan-400" />
                    <div>
                      <h4 className="text-xs font-bold text-white">البحث في كتالوج CJ المباشر وسحب كود SKU حقيقي</h4>
                      <p className="text-[11px] text-slate-400">
                        سيرفر CJ يشترط كود SKU لمنتج حقيقي مسجل في مستودعاتهم لقبول الطلب
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    placeholder="ابحث بالإنجليزية مثلاً: keyboard, mouse, gaming..."
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:border-cyan-500 focus:outline-none"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={handleSearchCjProducts}
                    disabled={isSearchingCj}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shrink-0"
                  >
                    <Search className={`w-3.5 h-3.5 ${isSearchingCj ? 'animate-spin' : ''}`} />
                    <span>{isSearchingCj ? 'جاري البحث...' : 'بحث في كتالوج CJ'}</span>
                  </button>
                </div>

                {searchCjError && (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                    {searchCjError}
                  </div>
                )}

                {cjSearchResults.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 max-h-48 overflow-y-auto">
                    {cjSearchResults.map((prod: any, i: number) => {
                      const sku = prod.productSku || prod.sku || prod.variantList?.[0]?.variantSku || `CJ-${prod.pid}`;
                      return (
                        <div key={i} className="p-2.5 rounded-xl bg-black/50 border border-slate-800 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {prod.productImage && (
                              <img src={prod.productImage} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                            )}
                            <div className="min-w-0">
                              <div className="text-[11px] font-bold text-white truncate" dir="ltr">
                                {prod.productNameEn || prod.productName}
                              </div>
                              <div className="text-[10px] text-cyan-400 font-mono">
                                SKU: {sku}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setCustomSkuInput(sku);
                              showToast(`تم اختيار كود SKU: ${sku}`);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-[10px] font-bold border border-cyan-500/40 shrink-0"
                          >
                            استخدم هذا الـ SKU
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* TEST ORDER PURCHASE & RESPONSE INSPECTION */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-[#0c1424] to-[#09101d] border border-cyan-500/30 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300">
                      <Zap className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">3. تجربة شراء طلب وفحص استجابة CJ (Live Purchase Test)</h4>
                      <p className="text-[11px] text-slate-400">
                        أدخل أو اختر رمز SKU حقيقي من CJ، واضغط لتنفيذ طلب شراء حي وإرساله إلى حسابك
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={customSkuInput}
                      onChange={(e) => setCustomSkuInput(e.target.value)}
                      placeholder="رمز الـ SKU (مثال: من البحث بالأعلى أو الصق أي كود SKU من cjdropshipping.com)"
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:border-cyan-500 focus:outline-none"
                      dir="ltr"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleRunTestOrder}
                    disabled={isTestingOrder}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all shrink-0"
                  >
                    <Play className={`w-3.5 h-3.5 fill-current ${isTestingOrder ? 'animate-pulse' : ''}`} />
                    <span>{isTestingOrder ? 'جاري إرسال الطلب إلى CJ...' : 'تنفيذ طلب شراء تجريبي عبر CJ الآن 🚀'}</span>
                  </button>
                </div>

                {/* Test Order Results & Response Details */}
                {testOrderResult && (
                  <div className="mt-3 p-3.5 rounded-xl bg-black/60 border border-slate-800 space-y-2 text-xs animate-fadeIn font-mono">
                    <div className="flex items-center justify-between text-slate-300 pb-2 border-b border-slate-800">
                      <span className={`flex items-center gap-1.5 font-bold ${testOrderResult.success ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {testOrderResult.success ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        <span>استجابة سيرفر CJ: {testOrderResult.message || 'تمت معالجة الطلب'}</span>
                      </span>
                      <span className="text-cyan-400 text-[11px]">
                        زمن الاستجابة: {testOrderResult.latencyMs}ms ⚡
                      </span>
                    </div>

                    {testOrderResult.success && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-300">
                        <div>
                          <span className="text-slate-500">رقم الطلب الداخلي: </span>
                          <span className="text-white font-bold">{testOrderResult.order?.orderNumber}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">معرف CJ Order ID: </span>
                          <span className="text-cyan-300 font-bold">{testOrderResult.order?.cjOrderId || testOrderResult.log?.cjOrderId}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">رقم التتبع الدولي: </span>
                          <span className="text-emerald-400 font-bold">{testOrderResult.order?.cjTrackingNumber || testOrderResult.log?.trackingNumber}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">الناقل والشحن: </span>
                          <span className="text-slate-200">{testOrderResult.order?.shippingCarrier}</span>
                        </div>
                      </div>
                    )}

                    {testOrderResult.log?.whereToFindOnCJ && (
                      <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                        <strong>📍 موقع الطلب: </strong>{testOrderResult.log.whereToFindOnCJ}
                      </div>
                    )}

                    {testOrderResult.log?.tip && (
                      <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                        {testOrderResult.log.tip}
                      </div>
                    )}

                    {/* Collapsible raw JSON log */}
                    <div className="pt-2 border-t border-slate-800/80">
                      <div className="text-[10px] text-slate-400 mb-1 flex items-center gap-1">
                        <Terminal className="w-3 h-3 text-cyan-400" />
                        <span>بيانات الاستجابة الصادرة من CJ (CJ Response Payload):</span>
                      </div>
                      <pre className="p-2 rounded bg-slate-950 text-[10px] text-cyan-300 overflow-x-auto max-h-32 text-left" dir="ltr">
                        {JSON.stringify(testOrderResult.log, null, 2)}
                      </pre>
                    </div>

                    <div className="pt-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setIsApiModalOpen(false);
                          setActiveScreen('admin');
                        }}
                        className="text-xs text-cyan-400 hover:underline font-bold flex items-center gap-1"
                      >
                        <span>الانتقال لمشاهدة الطلب في تبويب شحنات CJ في لوحة الإدمن &gt;</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: GOOGLE OAUTH */}
          {activeTab === 'google' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                <strong className="text-white block text-sm mb-1">تسجيل الدخول بنقرة واحدة عبر Google (OAuth 2.0):</strong>
                يتيح لعملائك الدخول الآمن بحسابات الجيميل الرسمية دون الحاجة لتذكر كلمة مرور، مع حفظ مشترياتهم ورصيدهم.
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-200 flex items-center justify-between">
                  <span>Google Client ID (Web Application)</span>
                  <span className="text-[11px] text-slate-400">من Google Cloud Console</span>
                </label>
                <input
                  type="text"
                  value={googleClientId}
                  onChange={(e) => setGoogleClientId(e.target.value)}
                  placeholder="xxxxxxxxxxxx-xxxxxxxxxxxxxxxx.apps.googleusercontent.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-cyan-500 focus:outline-none text-white text-sm font-mono"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-300">رابط النطاق المصرح به (Authorized JavaScript Origins):</div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-black/40 border border-slate-800 text-xs font-mono text-cyan-400">
                  <span className="truncate">https://ais-dev-sh7xj2oormmwhv5oiq4oon-60028700364.europe-west2.run.app</span>
                  <button 
                    onClick={() => copyToClipboard('https://ais-dev-sh7xj2oormmwhv5oiq4oon-60028700364.europe-west2.run.app', 'رابط النطاق')}
                    className="p-1 hover:text-white"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  قم بإضافة هذا الرابط في خانة &quot;Authorized JavaScript origins&quot; داخل Google Cloud Console لتفعيل تسجيل الدخول بدون أخطاء.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: TELEGRAM LOGIN */}
          {activeTab === 'telegram' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                <strong className="text-white block text-sm mb-1">تسجيل الدخول والتنبيهات عبر Telegram:</strong>
                اللاعبون في مجتمع الألعاب يفضلون تيليجرام لسرعة استلام أكواد الشحن وإشعارات وصول الطرود من متجرك.
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-200 flex items-center justify-between">
                  <span>اسم بوت تيليجرام (Telegram Bot Username)</span>
                  <span className="text-[11px] text-cyan-400">يتم إنشاؤه عبر @BotFather</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={telegramBotUsername}
                    onChange={(e) => setTelegramBotUsername(e.target.value)}
                    placeholder="@YourStoreBot"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 focus:border-cyan-500 focus:outline-none text-white text-sm font-mono"
                  />
                  <Send className="w-4 h-4 text-cyan-400 absolute left-3.5 top-3" />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-xs text-slate-300 space-y-1">
                <div className="font-bold text-cyan-300">كيف تنشئ البوت بدقيقة واحدة؟</div>
                <ol className="list-decimal list-inside space-y-1 text-slate-300 text-[11px]">
                  <li>افتح تطبيق تيليجرام وابحث عن <span className="font-bold text-white font-mono">@BotFather</span></li>
                  <li>أرسل أمر <span className="font-bold text-cyan-400 font-mono">/newbot</span> واختر اسماً للمتجر</li>
                  <li>انسخ اسم البوت وضعه في الخانة بالأعلى ثم اربط النطاق عبر أمر <span className="font-bold text-cyan-400 font-mono">/setdomain</span></li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 4: USER GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs leading-relaxed">
                <div className="font-bold text-sm mb-1 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  ما هي المفاتيح التي أحتاجها منك ليعمل كل شيء بشكل حقيقي؟
                </div>
                إليك قائمة سريعة بكل ما تحتاجه لإعطائي إياه لنربطه فوراً:
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="font-bold text-white mb-1 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 font-bold flex items-center justify-center text-xs">1</span>
                    مفتاح CJ Dropshipping:
                  </div>
                  <p className="text-slate-300 leading-relaxed mb-2">
                    - سجل مجاناً في موقع <strong>cjdropshipping.com</strong>
                    <br />- توجه إلى: <strong>Authorization &gt; API &gt; Generate API Key</strong>
                    <br />- انسخ مفتاح الـ <strong>Access Token</strong> وبريدك المسجل وألصقهما هنا.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="font-bold text-white mb-1 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 font-bold flex items-center justify-center text-xs">2</span>
                    مفتاح Google Client ID:
                  </div>
                  <p className="text-slate-300 leading-relaxed mb-2">
                    - ادخل إلى <strong>Google Cloud Console &gt; Credentials &gt; Create OAuth Client ID</strong>
                    <br />- اختر نوع التطبيق &quot;Web Application&quot;، وأضف رابط هذا المتجر في Origins.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="font-bold text-white mb-1 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 font-bold flex items-center justify-center text-xs">3</span>
                    اسم بوت تيليجرام (Telegram Bot Username):
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    - راسل <strong className="text-cyan-400">@BotFather</strong> على تيليجرام وأرسل له اسم المتجر، وأعطني اليوزر (مثال: @TarekStoreBot).
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-[#0c101a]">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>يتم حفظ المفاتيح بأمان داخل بيئة تشغيل متجرك المخصصة.</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsApiModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              إغلاق
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>حفظ وتفعيل الإعدادات</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
