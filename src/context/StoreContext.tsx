import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Currency, 
  CurrencyCode, 
  Order, 
  OrderStatus, 
  PlayerProfile, 
  Product, 
  ScreenId, 
  StaffAssistant,
  SupportTicket,
  UserRole, 
  WalletTransaction,
  PhysicalProduct,
  PhysicalOrder,
  PhysicalOrderStatus,
  ApiIntegrationsConfig,
  AuthUser,
  StorefrontMode
} from '../types';
import { 
  CURRENCIES, 
  CURRENT_PLAYER_PROFILE, 
  INITIAL_PRODUCTS, 
  DEFAULT_API_CONFIG,
  INITIAL_PHYSICAL_PRODUCTS
} from '../data/mockData';
import { isDatabaseUuid, supabaseClient } from '../lib/supabase';

const mapCatalogProduct = (row: Record<string, unknown>): Product => {
  const title = String(row.title ?? row.title_ar ?? 'منتج');
  const rawPackages = Array.isArray(row.packages) ? row.packages : [];
  const packages = rawPackages.flatMap((value, index) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
    const item = value as Record<string, unknown>;
    const rawPrice = item.priceUSD ?? item.price_usd ?? item.price;
    const priceUSD = Number(rawPrice);
    if (!Number.isFinite(priceUSD) || priceUSD < 0) return [];
    const deliveryTypes = Array.isArray(item.delivery_types)
      ? item.delivery_types.filter((type): type is 'instant_code' | 'direct_id_recharge' => type === 'instant_code' || type === 'direct_id_recharge')
      : [];
    return [{
      id: String(item.id ?? item.package_id ?? `package-${index + 1}`),
      name: String(item.name ?? item.title ?? `خيار ${index + 1}`),
      amount: Number(item.amount ?? 1) || 1,
      priceUSD,
      ...(deliveryTypes.length ? { deliveryTypes } : {}),
    }];
  });
  const basePrice = Number(row.price_usd);
  const safePackages = packages.length > 0 ? packages : [{
    id: 'default',
    name: title,
    amount: 1,
    priceUSD: Number.isFinite(basePrice) && basePrice >= 0 ? basePrice : 0,
  }];
  const category = String(row.category ?? 'games') as Product['category'];
  const validCategories: Product['category'][] = ['games', 'cards', 'game_currency', 'gifts', 'tournaments', 'services'];
  const platform = String(row.platform ?? 'other') as Product['platform'];
  const validPlatforms: Product['platform'][] = ['pubg', 'steam', 'playstation', 'xbox', 'freefire', 'roblox', 'other'];
  const deliveryType = String(row.delivery_type ?? 'manual_service') as Product['deliveryType'];
  const validDeliveryTypes: Product['deliveryType'][] = ['instant_code', 'direct_id_recharge', 'manual_service'];
  return {
    id: String(row.id),
    slug: String(row.slug ?? ''),
    title,
    titleAr: String(row.title_ar ?? title),
    category: validCategories.includes(category) ? category : 'games',
    platform: validPlatforms.includes(platform) ? platform : 'other',
    image: String(row.image_url ?? ''),
    description: String(row.description ?? ''),
    rating: Number(row.rating) || 5,
    deliveryType: validDeliveryTypes.includes(deliveryType) ? deliveryType : 'manual_service',
    packages: safePackages,
    merchantId: 'solo',
    merchantName: 'SOLO',
    inStock: Boolean(row.in_stock) && Number(row.stock_count) > 0,
    stockCount: Number(row.stock_count) || 0,
    totalSold: Number(row.total_sold) || 0,
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
};

interface StoreContextType {
  // Navigation & View
  checkoutEnabled: boolean;
  atlosEnabled: boolean;
  atlosMerchantId: string | null;
  activeScreen: ScreenId;
  setActiveScreen: (screen: ScreenId) => void;
  selectedProductId: string;
  setSelectedProductId: (id: string) => void;
  userRole: UserRole;
  viewMode: 'desktop' | 'mobile_simulator' | 'guide';
  setViewMode: (mode: 'desktop' | 'mobile_simulator' | 'guide') => void;
  showOriginalDesigns: boolean;
  setShowOriginalDesigns: (show: boolean) => void;

  // Currency & Formatter
  currency: Currency;
  setCurrencyCode: (code: CurrencyCode) => void;
  formatPrice: (priceUSD: number) => string;

  // Products
  products: Product[];
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'totalSold'>) => Promise<boolean>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;
  addCodesToPackage: (productId: string, packageId: string, codes: string[]) => Promise<boolean>;

  // Orders & Fulfillment
  orders: Order[];
  selectedOrderForFulfillment: Order | null;
  setSelectedOrderForFulfillment: (order: Order | null) => void;
  createOrder: (order: Omit<Order, 'id' | 'orderNumber' | 'date' | 'status'> & { idempotencyKey?: string }) => Promise<Order | null>;
  fulfillPaidOrder: (orderId: string, notes?: string) => Promise<boolean>;
  startProcessingOrder: (orderId: string) => void;
  fulfillDirectRecharge: (orderId: string, notes?: string) => Promise<boolean>;
  fulfillInstantCode: (orderId: string, code?: string, notes?: string) => Promise<boolean>;
  cancelOrder: (orderId: string, reason?: string) => void;

  // Staff & Assistants Management (تعيين المساعدين والصلاحيات)
  assistants: StaffAssistant[];
  addAssistant: (assistant: Omit<StaffAssistant, 'id' | 'addedAt' | 'ordersHandled' | 'ticketsHandled'>) => void;
  updateAssistant: (id: string, updates: Partial<StaffAssistant>) => void;
  deleteAssistant: (id: string) => void;

  // Customer Service & Support Tickets (خدمة العملاء والدعم)
  supportTickets: SupportTicket[];
  selectedTicket: SupportTicket | null;
  setSelectedTicket: (ticket: SupportTicket | null) => void;
  sendTicketReply: (ticketId: string, text: string, senderName: string, isAssistant?: boolean) => void;
  updateTicketStatus: (ticketId: string, status: 'open' | 'in_progress' | 'resolved') => void;
  assignTicket: (ticketId: string, assistantId: string) => void;
  createCustomerTicket: (ticket: { customerName: string; customerEmail: string; subject: string; message: string; relatedOrderId?: string }) => void;

  // Wallet
  customerBalanceUSD: number;
  merchantBalanceUSD: number;
  transactions: WalletTransaction[];
  depositToWallet: (amountUSD: number, method: string) => void;
  withdrawFromWallet: (amountUSD: number, method: string) => void;

  // Storefront Dual Mode (المتجر الرقمي والمنتجات المادية جنب بعض)
  storefrontMode: StorefrontMode;
  setStorefrontMode: (mode: StorefrontMode) => void;

  // Physical Products (CJ Dropshipping)
  physicalProducts: PhysicalProduct[];
  selectedPhysicalProduct: PhysicalProduct | null;
  setSelectedPhysicalProduct: (prod: PhysicalProduct | null) => void;
  addPhysicalProduct: (product: Omit<PhysicalProduct, 'id' | 'totalSold'>) => void;
  updatePhysicalProduct: (id: string, updates: Partial<PhysicalProduct>) => void;
  deletePhysicalProduct: (id: string) => void;

  // Physical Orders & Shipping
  physicalOrders: PhysicalOrder[];
  createPhysicalOrder: (order: Omit<PhysicalOrder, 'id' | 'orderNumber' | 'createdAt' | 'status'>) => Promise<PhysicalOrder | null>;
  updatePhysicalOrderStatus: (orderId: string, status: PhysicalOrderStatus, trackingNum?: string) => void;
  syncWithCJ: (orderId: string) => void;

  // API Integrations (CJ Dropshipping, Google, Telegram)
  apiConfig: ApiIntegrationsConfig;
  updateApiConfig: (updates: Partial<ApiIntegrationsConfig>) => void;
  testCjConnection: () => Promise<{ success: boolean; message: string; latencyMs?: number; data?: any }>;
  executeCjTestPurchase: (product?: PhysicalProduct, customSku?: string) => Promise<{ success: boolean; order?: PhysicalOrder; message?: string; latencyMs: number; log: any }>;
  fetchRealCjOrders: () => Promise<{ success: boolean; orders: any[]; message: string; latencyMs?: number }>;
  isApiModalOpen: boolean;
  setIsApiModalOpen: (open: boolean) => void;

  // Authentication & User Accounts (Google, Telegram, Email)
  currentUser: AuthUser | null;
  isAuthLoading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithTelegram: (username?: string) => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (name: string, email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;

  // Admin Manual Review (مراجعة واعتماد الحوالات اليدوية ليبيانا/المدار/تحويل/Payoneer/ATLOS)
  reviewManualPayment: (orderId: string, decision: 'approve' | 'reject', notes?: string, isPhysical?: boolean) => Promise<{ success: boolean; message: string }>;

  // Profile & Toast
  playerProfile: PlayerProfile;
  updatePlayerProfile: (updates: Partial<PlayerProfile>) => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeScreen, setActiveScreen] = useState<ScreenId>('home');
  const [selectedProductId, setSelectedProductId] = useState<string>('prod-pubg-uc');
  const [userRole, setUserRole] = useState<UserRole>('customer');
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile_simulator' | 'guide'>('desktop');
  const [showOriginalDesigns, setShowOriginalDesigns] = useState<boolean>(false);

  const [currencyCode, setCurrencyCodeState] = useState<CurrencyCode>(import.meta.env.DEV ? 'SAR' : 'USD');
  const currency = CURRENCIES[currencyCode] || CURRENCIES.USD;

  const [checkoutEnabled, setCheckoutEnabled] = useState(false);
  const [atlosEnabled, setAtlosEnabled] = useState(false);
  const [atlosMerchantId, setAtlosMerchantId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>(() => import.meta.env.DEV ? INITIAL_PRODUCTS : []);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderForFulfillment, setSelectedOrderForFulfillment] = useState<Order | null>(null);

  const [customerBalanceUSD, setCustomerBalanceUSD] = useState<number>(0);
  const [merchantBalanceUSD, setMerchantBalanceUSD] = useState<number>(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile>(() => import.meta.env.DEV ? CURRENT_PLAYER_PROFILE : {
    id: '',
    username: '',
    tag: '',
    avatar: '',
    level: 0,
    points: 0,
    rank: '',
    followersCount: 0,
    joinedTournaments: 0,
    achievementsCount: 0,
    connectedPlatforms: {},
    favoriteGames: [],
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Staff Assistants State
  const [assistants, setAssistants] = useState<StaffAssistant[]>([]);

  // Customer Support Tickets State
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  // Storefront Dual Mode (المتجر الرقمي والمنتجات المادية جنب بعض)
  const [storefrontMode, setStorefrontMode] = useState<StorefrontMode>('digital');

  // Physical Products (CJ Dropshipping)
  const [physicalProducts, setPhysicalProducts] = useState<PhysicalProduct[]>(() => import.meta.env.DEV ? INITIAL_PHYSICAL_PRODUCTS : []);
  const [selectedPhysicalProduct, setSelectedPhysicalProduct] = useState<PhysicalProduct | null>(null);

  // Orders are server-owned. Never hydrate customer/admin orders from localStorage.
  const [physicalOrders, setPhysicalOrders] = useState<PhysicalOrder[]>([]);

  // Integration settings are session-only; remove any legacy browser-stored credentials.
  const [apiConfig, setApiConfigState] = useState<ApiIntegrationsConfig>(() => {
    try {
      localStorage.removeItem('tarek_store_api_config');
    } catch {
      // Browser storage may be unavailable; the app still uses safe defaults.
    }
    return DEFAULT_API_CONFIG;
  });
  const [isApiModalOpen, setIsApiModalOpen] = useState<boolean>(false);

  // Authentication User State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  useEffect(() => {
    let active = true;
    const loadCheckoutStatus = async () => {
      if (!supabaseClient) return;
      try {
        const { data, error } = await supabaseClient.functions.invoke('checkout-status', { method: 'GET' });
        if (!active || error || data?.success !== true) return;
        setCheckoutEnabled(data.checkout_enabled === true);
        setAtlosEnabled(data.atlos_enabled === true);
        setAtlosMerchantId(typeof data.atlos_merchant_id === 'string' ? data.atlos_merchant_id : null);
      } catch {
        // Fail closed: checkout remains disabled if status cannot be verified.
      }
    };
    void loadCheckoutStatus();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const loadCatalog = async () => {
      if (!supabaseClient) return;
      const columns = 'id, product_type, slug, title, title_ar, category, platform, image_url, description, delivery_type, price_usd, in_stock, stock_count, total_sold, rating, packages, created_at';
      const result = currentUser?.role === 'admin'
        ? await supabaseClient.from('products').select(columns).eq('product_type', 'digital').order('created_at', { ascending: false }).limit(100)
        : await supabaseClient.from('public_catalog').select(columns).eq('product_type', 'digital').order('created_at', { ascending: false }).limit(100);
      if (result.error) {
        console.warn('Could not load product catalog:', result.error.message);
        return;
      }
      if (!active || !Array.isArray(result.data)) return;
      if (import.meta.env.DEV && result.data.length === 0) return;
      setProducts(result.data.map((row) => mapCatalogProduct(row as unknown as Record<string, unknown>)));
    };
    void loadCatalog();
    return () => { active = false; };
  }, [currentUser?.id, currentUser?.role]);

  useEffect(() => {
    let active = true;
    const syncAuthenticatedUser = async (authUser: import('@supabase/supabase-js').User | null) => {
      if (!authUser) {
        if (active) {
          setCurrentUser(null);
          setUserRole('customer');
          setOrders([]);
          setPhysicalOrders([]);
          setIsAuthLoading(false);
        }
        return;
      }

      if (active) {
        setOrders([]);
        setPhysicalOrders([]);
      }

      let profile: { name?: string | null; phone?: string | null; avatar_url?: string | null; telegram_username?: string | null; role?: string | null } | null = null;
      if (supabaseClient) {
        const { data } = await supabaseClient
          .from('profiles')
          .select('name, phone, avatar_url, telegram_username, role')
          .eq('id', authUser.id)
          .maybeSingle();
        profile = data;
      }

      if (!active) return;
      const role: UserRole = profile?.role === 'admin' || profile?.role === 'merchant'
        ? profile.role
        : 'customer';
      const provider = authUser.app_metadata?.provider === 'google' ? 'google' : 'email';
      setCurrentUser({
        id: authUser.id,
        name: profile?.name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'مستخدم',
        email: authUser.email || '',
        provider,
        role,
        avatar: profile?.avatar_url || authUser.user_metadata?.avatar_url || undefined,
        telegramUsername: profile?.telegram_username || undefined,
        phone: profile?.phone || authUser.phone || undefined,
      });
      setUserRole(role);
      const { data: orderRows, error: orderError } = await supabaseClient!
        .from('orders')
        .select('id, order_number, customer_id, customer_name, customer_email, customer_phone, total_usd, status, payment_status, payment_method, payment_reference, delivery_type, target_player_id, target_player_name, admin_review_notes, fulfillment_notes, created_at, order_items(id, order_id, product_id, product_title, package_or_variant, unit_price_usd, quantity, total_price_usd, created_at)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (active && !orderError && Array.isArray(orderRows)) {
        const completedInstantOrderIds = orderRows
          .filter((row: any) => row.delivery_type === 'instant_code' && row.status === 'completed')
          .map((row: any) => String(row.id));
        const completedCodesByOrder = new Map<string, string[]>();
        if (completedInstantOrderIds.length > 0) {
          const { data: codeRows, error: codeError } = await supabaseClient!
            .from('order_items')
            .select('order_id, delivered_code')
            .in('order_id', completedInstantOrderIds)
            .not('delivered_code', 'is', null)
            .limit(1000);
          if (codeError) {
            console.warn('Could not load completed instant codes:', codeError.message);
          } else if (Array.isArray(codeRows)) {
            for (const codeRow of codeRows) {
              if (typeof codeRow.order_id !== 'string' || typeof codeRow.delivered_code !== 'string') continue;
              const orderCodes = completedCodesByOrder.get(codeRow.order_id) || [];
              orderCodes.push(codeRow.delivered_code);
              completedCodesByOrder.set(codeRow.order_id, orderCodes);
            }
          }
        }
        if (!active) return;
        const mappedOrders: Order[] = orderRows.map((row: any) => {
          const firstItem = Array.isArray(row.order_items) ? row.order_items[0] : null;
          const allowedStatuses: OrderStatus[] = ['pending', 'awaiting_manual_review', 'processing', 'ready_to_deliver', 'completed', 'cancelled'];
          const status = allowedStatuses.includes(row.status) ? row.status as OrderStatus : 'pending';
          const allowedDelivery: Order['deliveryType'][] = ['instant_code', 'direct_id_recharge', 'manual_service'];
          const deliveryType = allowedDelivery.includes(row.delivery_type) ? row.delivery_type as Order['deliveryType'] : 'manual_service';
          return {
            id: row.id,
            orderNumber: row.order_number,
            customerId: row.customer_id,
            customerName: row.customer_name,
            customerEmail: row.customer_email,
            customerPhone: row.customer_phone || undefined,
            productId: firstItem?.product_id || '',
            productName: firstItem?.product_title || 'طلب متجر SOLO',
            packageId: firstItem?.package_or_variant || 'default',
            packageName: firstItem?.package_or_variant || 'المنتج',
            platform: 'other',
            priceUSD: Number(row.total_usd) || 0,
            deliveryType,
            targetPlayerId: row.target_player_id || undefined,
            targetPlayerName: row.target_player_name || undefined,
            isGift: false,
            status,
            date: row.created_at,
            assignedCode: deliveryType === 'instant_code' && status === 'completed'
              ? completedCodesByOrder.get(row.id)?.join('\n') || undefined
              : undefined,
            fulfillmentNotes: row.fulfillment_notes || row.admin_review_notes || undefined,
            paymentMethod: row.payment_method,
            paymentReference: row.payment_reference || undefined,
          };
        });
        setOrders(mappedOrders);
      } else if (orderError) {
        console.warn('Could not load orders:', orderError.message);
      }
      setIsAuthLoading(false);
    };

    if (!supabaseClient) {
      setCurrentUser(null);
      setUserRole('customer');
      setIsAuthLoading(false);
      return () => { active = false; };
    }

    void supabaseClient.auth.getSession().then(({ data }) => {
      void syncAuthenticatedUser(data.session?.user ?? null);
    });
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => void syncAuthenticatedUser(session?.user ?? null), 0);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const setCurrencyCode = (code: CurrencyCode) => {
    setCurrencyCodeState(code);
  };

  const formatPrice = (priceUSD: number): string => {
    const converted = priceUSD * currency.rate;
    // Format nicely
    if (currency.code === 'USD' || currency.code === 'EUR') {
      return `${currency.symbol}${converted.toFixed(2)}`;
    }
    return `${converted.toFixed(2)} ${currency.symbol}`;
  };

  // Products Management
  const addProduct = async (newProdData: Omit<Product, 'id' | 'createdAt' | 'totalSold'>): Promise<boolean> => {
    if (!supabaseClient || currentUser?.role !== 'admin') {
      showToast('إضافة المنتجات متاحة لمدير موثّق فقط؛ لم يُحفظ أي منتج.');
      return false;
    }
    const titleAr = newProdData.titleAr.trim();
    const title = newProdData.title.trim() || titleAr;
    const imageUrl = newProdData.image.trim();
    const packages = newProdData.packages.map((pkg) => ({
      id: pkg.id.trim(),
      name: pkg.name.trim(),
      amount: Number(pkg.amount),
      priceUSD: Number(pkg.priceUSD),
      ...(pkg.bonus?.trim() ? { bonus: pkg.bonus.trim() } : {}),
    }));
    const stockCount = Math.floor(Number(newProdData.stockCount ?? 0));
    let image: URL;
    try {
      image = new URL(imageUrl);
    } catch {
      showToast('أدخل رابط صورة صحيحًا يبدأ بـ https:// أو http://.');
      return false;
    }
    if (!titleAr || !title || !['https:', 'http:'].includes(image.protocol)) {
      showToast('اسم المنتج العربي ورابط الصورة مطلوبان.');
      return false;
    }
    if (packages.length === 0 || packages.some((pkg) => !pkg.id || !pkg.name || !Number.isFinite(pkg.amount) || pkg.amount <= 0 || !Number.isFinite(pkg.priceUSD) || pkg.priceUSD <= 0)) {
      showToast('تحقق من أسماء الباقات وكمياتها وأسعارها؛ يجب أن تكون الأسعار أكبر من صفر.');
      return false;
    }
    if (!Number.isSafeInteger(stockCount) || stockCount < 0 || stockCount > 1000000) {
      showToast('كمية المخزون يجب أن تكون عددًا صحيحًا بين صفر ومليون.');
      return false;
    }
    if (newProdData.deliveryType === 'instant_code' && stockCount !== 0) {
      showToast('لا يمكن إدخال رصيد أكواد يدويًا؛ يجب استيراد الأكواد عبر مسار المخزون الخادمي.');
      return false;
    }

    const slugBase = title.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'product';
    const payload = {
      product_type: 'digital',
      slug: `${slugBase}-${crypto.randomUUID().slice(0, 8)}`,
      title,
      title_ar: titleAr,
      category: newProdData.category,
      platform: newProdData.platform,
      image_url: image.toString(),
      description: newProdData.description.trim(),
      delivery_type: newProdData.deliveryType,
      price_usd: packages[0].priceUSD,
      in_stock: stockCount > 0,
      stock_count: stockCount,
      packages,
      rating: 5,
      total_sold: 0,
    };
    const { data, error } = await supabaseClient
      .from('products')
      .insert(payload)
      .select('id, product_type, slug, title, title_ar, category, platform, image_url, description, delivery_type, price_usd, in_stock, stock_count, total_sold, rating, packages, created_at')
      .single();
    if (error || !data) {
      console.error('Product creation failed:', error?.message);
      showToast('تعذر حفظ المنتج. تحقق من صلاحية المدير والبيانات ثم أعد المحاولة.');
      return false;
    }
    const savedProduct = mapCatalogProduct(data as unknown as Record<string, unknown>);
    setProducts((previous) => [savedProduct, ...previous.filter((product) => product.id !== savedProduct.id)]);
    showToast('تم حفظ المنتج في قاعدة البيانات. استورد المخزون وراجعه؛ الشراء ما زال مغلقًا.');
    return true;
  };

  const updateProduct = async (id: string, updates: Partial<Product>): Promise<boolean> => {
    if (!supabaseClient || currentUser?.role !== 'admin' || !isDatabaseUuid(id)) {
      showToast('تعديل المنتجات يتطلب مديرًا موثّقًا ومنتجًا مسجلًا في قاعدة البيانات.');
      return false;
    }
    if (typeof updates.inStock !== 'boolean') {
      showToast('هذا التعديل غير مدعوم في الواجهة الحالية.');
      return false;
    }
    if (updates.inStock) {
      const { data: stockRow, error: stockError } = await supabaseClient
        .from('products')
        .select('stock_count')
        .eq('id', id)
        .maybeSingle();
      if (stockError || !stockRow || Number(stockRow.stock_count) <= 0) {
        showToast('لا يمكن إتاحة المنتج قبل تسجيل مخزون فعلي له.');
        return false;
      }
    }
    const { error } = await supabaseClient.from('products').update({ in_stock: updates.inStock }).eq('id', id);
    if (error) {
      console.error('Product update failed:', error.message);
      showToast('تعذر حفظ حالة المنتج.');
      return false;
    }
    setProducts((previous) => previous.map((product) => product.id === id
      ? { ...product, inStock: updates.inStock === true }
      : product));
    showToast(updates.inStock ? 'تم إتاحة المنتج.' : 'تم إيقاف المنتج عن البيع.');
    return true;
  };

  const deleteProduct = async (id: string): Promise<boolean> => {
    if (!supabaseClient || currentUser?.role !== 'admin' || !isDatabaseUuid(id)) {
      showToast('إيقاف المنتجات يتطلب مديرًا موثّقًا ومنتجًا مسجلًا في قاعدة البيانات.');
      return false;
    }
    const { error } = await supabaseClient.from('products').update({ in_stock: false }).eq('id', id);
    if (error) {
      console.error('Product disable failed:', error.message);
      showToast('تعذر إيقاف المنتج.');
      return false;
    }
    setProducts((previous) => previous.map((product) => product.id === id ? { ...product, inStock: false } : product));
    showToast('تم إيقاف المنتج مع الاحتفاظ بسجلاته التاريخية.');
    return true;
  };

  const addCodesToPackage = async (productId: string, packageId: string, newCodes: string[]): Promise<boolean> => {
    if (!supabaseClient || currentUser?.role !== 'admin' || !isDatabaseUuid(productId)) {
      showToast('استيراد الأكواد متاح لمدير موثّق ومنتج مسجل في قاعدة البيانات فقط.');
      return false;
    }
    const codes = newCodes.map((code) => code.trim());
    if (codes.length < 1 || codes.length > 500 || codes.some((code) => !code || code.length > 200) || new Set(codes).size !== codes.length) {
      showToast('أدخل من 1 إلى 500 كود صالح وفريد في كل دفعة.');
      return false;
    }
    const { data, error } = await supabaseClient.functions.invoke('inventory-import', {
      body: { productId, packageId, codes },
    });
    if (error || data?.success !== true) {
      console.error('Secure inventory import failed.');
      showToast(data?.error || 'تعذر استيراد الأكواد؛ لم يتم تأكيد أي تغيير.');
      return false;
    }
    const availableCount = Math.max(0, Number(data.available_count) || 0);
    setProducts((previous) => previous.map((product) => product.id === productId
      ? { ...product, stockCount: availableCount, inStock: product.inStock && availableCount > 0 }
      : product));
    showToast(`تم استيراد ${Number(data.inserted_count) || 0} كود إلى المخزون الخاص. يلزم مراجعة المنتج قبل إتاحته للبيع.`);
    return true;
  };

  // Orders are created by the authenticated server function; no local order is a purchase.
  const createOrder = async (orderData: Omit<Order, 'id' | 'orderNumber' | 'date' | 'status'> & { idempotencyKey?: string }): Promise<Order | null> => {
    if (!checkoutEnabled) {
      showToast('الشراء غير متاح بعد؛ لا ترسل دفعة حتى يكتمل مخزون وتسليم المنتجات الرقمي.');
      return null;
    }
    if (!supabaseClient || !currentUser) {
      showToast('يلزم تسجيل الدخول وإعداد Supabase قبل إنشاء طلب حقيقي.');
      return null;
    }
    if (!isDatabaseUuid(orderData.productId)) {
      showToast('هذا المنتج من كتالوج المعاينة وليس مرتبطًا بسجل منتج في قاعدة البيانات بعد.');
      return null;
    }

    const normalizedMethod = String(orderData.paymentMethod).toLowerCase();
    const paymentMethod = normalizedMethod.includes('atlos')
      ? 'atlos_crypto'
      : normalizedMethod.includes('libyana') || normalizedMethod.includes('ليبيانا')
      ? 'libyana'
      : normalizedMethod.includes('almadar') || normalizedMethod.includes('المدار')
        ? 'almadar'
        : normalizedMethod.includes('bank_transfer') || normalizedMethod.includes('مصرفي') || normalizedMethod.includes('تحويل')
          ? 'bank_transfer'
          : normalizedMethod.includes('payoneer')
            ? 'payoneer'
            : null;

    if (paymentMethod === 'atlos_crypto' && !atlosEnabled) {
      showToast('بوابة ATLOS غير جاهزة أو checkout مغلق؛ لم يتم إنشاء طلب.');
      return null;
    }

    if (!paymentMethod) {
      showToast('هذه وسيلة الدفع غير مفعّلة بعد. المتاح حاليًا هو الدفع اليدوي بعد ربط قاعدة البيانات.');
      return null;
    }
    if (paymentMethod !== 'atlos_crypto' && !orderData.paymentReference?.trim()) {
      showToast('أدخل مرجع التحويل قبل إرسال الطلب للمراجعة.');
      return null;
    }

    const { data: sessionData } = await supabaseClient.auth.getSession();
    if (!sessionData.session) {
      showToast('انتهت جلسة تسجيل الدخول. سجل الدخول مجددًا ثم أعد المحاولة.');
      return null;
    }

    const { data, error } = await supabaseClient.rpc('create_order_atomic', {
      p_idempotency_key: orderData.idempotencyKey || crypto.randomUUID(),
      p_customer_name: orderData.customerName,
      p_customer_phone: orderData.customerPhone || null,
      p_delivery_type: orderData.deliveryType,
      p_payment_method: paymentMethod,
      p_payment_reference: paymentMethod === 'atlos_crypto' ? null : orderData.paymentReference!.trim(),
      p_payment_receipt_url: null,
      p_target_player_id: orderData.deliveryType === 'direct_id_recharge' ? orderData.targetPlayerId?.trim() || null : null,
      p_target_player_name: orderData.deliveryType === 'direct_id_recharge' ? orderData.targetPlayerName?.trim() || null : null,
      p_shipping_address: null,
      p_items: [{
        product_id: orderData.productId,
        package_or_variant: orderData.packageId || null,
        quantity: 1,
      }],
    });

    if (error || !data?.success) {
      console.error('create_order_atomic failed', error?.message || data?.error || data?.message);
      showToast(error?.message || data?.error || data?.message || 'تعذر تسجيل الطلب في الخادم.');
      return null;
    }
    if (paymentMethod === 'atlos_crypto' && data.payment_status !== 'pending') {
      try {
        const scope = `${orderData.productId}:${orderData.packageId || ''}`;
        localStorage.removeItem(`solo_atlos_idempotency:${encodeURIComponent(currentUser.id)}:${encodeURIComponent(scope)}`);
      } catch {
        // Ignore browser storage failures; the server still refuses to reopen this order.
      }
      showToast('يوجد طلب سابق بهذا المفتاح وحالته ليست انتظار الدفع؛ لم يتم فتح ودجت ATLOS.');
      return null;
    }

    const newOrder: Order = {
      ...orderData,
      id: String(data.order_id),
      orderNumber: String(data.order_number),
      priceUSD: Number(data.total_usd),
      date: new Date().toISOString(),
      status: paymentMethod === 'atlos_crypto' ? 'pending' : 'awaiting_manual_review',
    };
    setOrders((prev) => [newOrder, ...prev]);
    showToast(paymentMethod === 'atlos_crypto'
      ? `سُجل الطلب ${newOrder.orderNumber}؛ لا يُعتمد الدفع إلا بعد تحقق الخادم من إشعار ATLOS.`
      : `سُجل الطلب ${newOrder.orderNumber} في الخادم وهو بانتظار مراجعة التحويل.`);
    return newOrder;
  };

  const startProcessingOrder = (orderId: string) => {
    void orderId;
    showToast('لا يمكن تغيير حالة الطلب من المتصفح؛ استخدم إجراء الخادم بعد التحقق من الدفع.');
  };

  const fulfillPaidOrder = async (orderId: string, notes?: string): Promise<boolean> => {
    if (!supabaseClient || currentUser?.role !== 'admin' || !isDatabaseUuid(orderId)) {
      showToast('تنفيذ الطلب يتطلب جلسة مدير موثّقة وطلبًا مسجلًا في قاعدة البيانات.');
      return false;
    }
    const { data, error } = await supabaseClient.functions.invoke('fulfill-order', {
      body: { orderId, notes: notes?.trim() || null },
    });
    if (error || data?.success !== true) {
      console.error('Paid order fulfillment failed.');
      showToast(data?.error || 'تعذر تنفيذ الطلب؛ تأكد من حالة الدفع والمخزون.');
      return false;
    }

    const fulfilledOrder = orders.find((order) => order.id === orderId);
    let assignedCode = fulfilledOrder?.deliveryType === 'instant_code' ? fulfilledOrder.assignedCode : undefined;
    if (fulfilledOrder?.deliveryType === 'instant_code') {
      const { data: deliveryRows } = await supabaseClient
        .from('order_items')
        .select('delivered_code')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });
      if (Array.isArray(deliveryRows)) {
        assignedCode = deliveryRows.map((row) => row.delivered_code).filter(Boolean).join('\n') || assignedCode;
      }
    }
    const updatedNotes = notes?.trim() || undefined;
    const updateOrder = (order: Order): Order => order.id === orderId
      ? { ...order, status: 'completed', assignedCode, fulfillmentNotes: updatedNotes || order.fulfillmentNotes }
      : order;
    setOrders((previous) => previous.map(updateOrder));
    setSelectedOrderForFulfillment((previous) => previous ? updateOrder(previous) : null);
    showToast(data.already_completed ? 'الطلب مكتمل بالفعل.' : 'اكتمل تنفيذ الطلب المدفوع.');
    return true;
  };

  const fulfillDirectRecharge = (orderId: string, notes?: string): Promise<boolean> =>
    fulfillPaidOrder(orderId, notes);

  const fulfillInstantCode = (orderId: string, _code?: string, notes?: string): Promise<boolean> =>
    fulfillPaidOrder(orderId, notes);

  const cancelOrder = (orderId: string, reason?: string) => {
    void orderId;
    void reason;
    showToast('إلغاء الطلب أو ردّ المبلغ يحتاجان إجراءً خادميًا متصلًا؛ لم تُغيّر الحالة أو الرصيد.');
  };

  const depositToWallet = (amountUSD: number, method: string) => {
    void amountUSD;
    void method;
    showToast('شحن المحفظة غير مفعّل؛ لم يُضف أي رصيد.');
  };

  const withdrawFromWallet = (amountUSD: number, method: string) => {
    void amountUSD;
    void method;
    showToast('السحب غير مفعّل؛ لم يُخصم أو يُرسل أي مبلغ.');
  };

  const updatePlayerProfile = (updates: Partial<PlayerProfile>) => {
    void updates;
    showToast('تعديل الملف الشخصي غير موصول بقاعدة البيانات؛ لم يتم حفظ أي تغيير.');
  };

  // Staff & Assistants Methods
  const addAssistant = (assistantData: Omit<StaffAssistant, 'id' | 'addedAt' | 'ordersHandled' | 'ticketsHandled'>) => {
    void assistantData;
    showToast('إدارة المساعدين غير موصولة بالخادم؛ لم يُنشأ حساب أو تُرسل بيانات دخول.');
  };

  const updateAssistant = (id: string, updates: Partial<StaffAssistant>) => {
    void id;
    void updates;
    showToast('تعديل المساعدين غير موصول بالخادم؛ لم تُحفظ أي تغييرات.');
  };

  const deleteAssistant = (id: string) => {
    void id;
    showToast('حذف المساعدين غير موصول بالخادم؛ لم يُحذف أي حساب.');
  };

  // Support Tickets Methods
  const sendTicketReply = (ticketId: string, text: string, senderName: string, isAssistant: boolean = true) => {
    const newMsg = {
      id: `msg-${Date.now()}`,
      sender: isAssistant ? ('assistant' as const) : ('customer' as const),
      senderName,
      text,
      time: 'الآن',
    };

    setSupportTickets((prev) =>
      prev.map((t) => {
        if (t.id !== ticketId) return t;
        return {
          ...t,
          status: isAssistant ? 'in_progress' : t.status,
          messages: [...t.messages, newMsg],
        };
      })
    );

    // Update selectedTicket if open
    setSelectedTicket((prev) => {
      if (!prev || prev.id !== ticketId) return prev;
      return {
        ...prev,
        status: isAssistant ? 'in_progress' : prev.status,
        messages: [...prev.messages, newMsg],
      };
    });

    showToast('تم إرسال الرد للعميل بنجاح.');
  };

  const updateTicketStatus = (ticketId: string, status: 'open' | 'in_progress' | 'resolved') => {
    setSupportTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status } : t))
    );
    setSelectedTicket((prev) => (prev && prev.id === ticketId ? { ...prev, status } : prev));
    showToast(`تم تحديث حالة التذكرة إلى: ${status === 'resolved' ? 'محلولة ✅' : status === 'in_progress' ? 'قيد المتابعة ⏳' : 'مفتوحة 🔔'}`);
  };

  const assignTicket = (ticketId: string, assistantId: string) => {
    const targetAssistant = assistants.find((a) => a.id === assistantId);
    setSupportTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              assignedToAssistantId: assistantId,
              assignedToAssistantName: targetAssistant?.name || 'مساعد خدمة العملاء',
              status: 'in_progress',
            }
          : t
      )
    );
    showToast(`تم إسناد التذكرة إلى ${targetAssistant?.name || 'المساعد'}`);
  };

  const createCustomerTicket = (data: { customerName: string; customerEmail: string; subject: string; message: string; relatedOrderId?: string }) => {
    void data;
    showToast('نظام تذاكر الدعم غير موصول بالخادم؛ لم تُرسل أو تُحفظ أي تذكرة.');
  };

  // API Configuration Handlers
  const updateApiConfig = (updates: Partial<ApiIntegrationsConfig>) => {
    setApiConfigState((prev) => ({ ...prev, ...updates, cjConnected: false, autoFulfillWithCJ: false }));
    showToast('تم تحديث الإعدادات لهذه الجلسة فقط؛ لا تُحفظ بيانات الربط في المتصفح.');
  };

  const testCjConnection = async (): Promise<{ success: boolean; message: string; latencyMs?: number; data?: any }> => {
    if (!supabaseClient || !currentUser || userRole !== 'admin') {
      const message = 'فحص CJ متاح لمدير مسجل الدخول فقط بعد إعداد Supabase.';
      showToast(message);
      return { success: false, message };
    }
    showToast('جارٍ فحص الاتصال من الخادم…');
    try {
      const { data, error } = await supabaseClient.functions.invoke('cj-verify', { body: {} });
      if (!error && data?.success) {
        updateApiConfig({ cjConnected: true });
        showToast(`تم التحقق من الاتصال بـCJ (${data.latencyMs}ms).`);
        return data;
      } else {
        updateApiConfig({ cjConnected: false });
        const message = data?.message || error?.message || 'تعذر التحقق من اتصال CJ.';
        showToast(message);
        return { success: false, message };
      }
    } catch (err: unknown) {
      updateApiConfig({ cjConnected: false });
      const message = err instanceof Error ? err.message : 'تعذر الاتصال بوظيفة CJ.';
      showToast(`لم يتم التحقق من اتصال CJ: ${message}`);
      return { success: false, message };
    }
  };

  const executeCjTestPurchase = async (customProduct?: PhysicalProduct, customSku?: string): Promise<{ success: boolean; order?: PhysicalOrder; message?: string; latencyMs: number; log: any }> => {
    void customProduct;
    void customSku;
    const message = 'شراء الاختبار معطل حتى توفر بيئة CJ sandbox موثقة؛ لم يُنشأ طلب تجريبي أو حقيقي.';
    showToast(message);
    return { success: false, message, latencyMs: 0, log: { mode: 'disabled', external_request_sent: false } };
  };

  const fetchRealCjOrders = async (): Promise<{ success: boolean; orders: any[]; message: string; latencyMs?: number }> => {
    if (!supabaseClient || !currentUser || userRole !== 'admin') {
      const message = 'عرض طلبات CJ متاح لمدير مسجل الدخول فقط بعد إعداد Supabase.';
      showToast(message);
      return { success: false, orders: [], message };
    }
    showToast('جارٍ جلب قائمة طلبات CJ من الخادم…');
    try {
      const { data, error } = await supabaseClient.functions.invoke('cj-orders-list', { body: {} });
      if (!error && data?.success) {
        showToast(`تم جلب ${data.ordersCount} سجل من CJ.`);
        return data;
      } else {
        const message = data?.message || data?.error || error?.message || 'تعذر جلب الطلبات من CJ.';
        showToast(message);
        return { success: false, orders: [], message };
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'تعذر الاتصال بـCJ.';
      showToast(message);
      return { success: false, orders: [], message };
    }
  };

  // Physical Products Handlers
  const addPhysicalProduct = (newProdData: Omit<PhysicalProduct, 'id' | 'totalSold'>) => {
    void newProdData;
    showToast('إضافة المنتجات المادية غير موصولة بقاعدة البيانات؛ لم يتم حفظ أي منتج.');
  };

  const updatePhysicalProduct = (id: string, updates: Partial<PhysicalProduct>) => {
    void id;
    void updates;
    showToast('تعديل المنتجات المادية غير موصول بالخادم؛ لم تُحفظ التغييرات.');
  };

  const deletePhysicalProduct = (id: string) => {
    void id;
    showToast('حذف المنتجات المادية غير موصول بالخادم؛ لم يُحذف أي سجل.');
  };

  // Physical purchases remain disabled until a real CJ shipping quote and order API are configured.
  const createPhysicalOrder = async (_orderData: Omit<PhysicalOrder, 'id' | 'orderNumber' | 'createdAt' | 'status'>): Promise<PhysicalOrder | null> => {
    showToast('الشراء المادي متوقف مؤقتًا: لم يُربط تسعير الشحن وطلب CJ الفعلي بعد. لم يُنشأ طلب.');
    return null;
  };

  const updatePhysicalOrderStatus = (orderId: string, status: PhysicalOrderStatus, trackingNum?: string) => {
    void status;
    void trackingNum;
    showToast('لا يمكن تعديل حالة الشحن محليًا؛ يجب تحديثها من خادم CJ بعد تحقق الدفع.');
  };

  const syncWithCJ = (orderId: string) => {
    void orderId;
    showToast('مزامنة CJ غير مفعّلة. لم يُرسل طلب للمورد ولم يُنشأ رقم تتبع.');
  };

  // Admin Manual Review Handler (Server & Local Synchronization)
  const reviewManualPayment = async (
    orderId: string,
    decision: 'approve' | 'reject',
    notes?: string,
    isPhysical: boolean = false
  ): Promise<{ success: boolean; message: string }> => {
    void isPhysical;
    if (!supabaseClient || !currentUser || userRole !== 'admin') {
      const message = 'غير مصرح: يلزم دخول مدير حقيقي عبر Supabase.';
      showToast(message);
      return { success: false, message };
    }

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session || session.user.id !== currentUser.id) {
      const message = 'جلسة المدير غير صالحة أو منتهية؛ لم تتغير حالة الطلب.';
      showToast(message);
      return { success: false, message };
    }

    const { data, error } = await supabaseClient.functions.invoke('review-manual-payment', {
      body: { orderId, decision, notes: notes?.trim() || null },
    });
    if (error || !data?.success) {
      console.error('review-manual-payment failed', error || data?.error);
      const message = 'رفض الخادم مراجعة الدفع أو تعذر الاتصال؛ لم تتغير الحالة محليًا.';
      showToast(message);
      return { success: false, message };
    }

    const newStatus: OrderStatus = decision === 'approve' ? 'processing' : 'cancelled';
    if (isPhysical) {
      const physicalStatus: PhysicalOrderStatus = decision === 'approve' ? 'processing' : 'cancelled';
      setPhysicalOrders((prev) => prev.map((order) => order.id === orderId ? { ...order, status: physicalStatus } : order));
    } else {
      setOrders((prev) => prev.map((order) => order.id === orderId
        ? { ...order, status: newStatus, fulfillmentNotes: notes?.trim() || undefined }
        : order));
    }

    const message = decision === 'approve'
      ? `تم اعتماد الدفع في الخادم للطلب ${orderId}. لم يتم ادعاء تسليم المنتج.`
      : `تم رفض إشعار الدفع في الخادم للطلب ${orderId}.`;
    showToast(message);
    return { success: true, message };
  };


  // Auth Handlers
  const loginWithGoogle = async () => {
    if (!supabaseClient) throw new Error('يجب إعداد VITE_SUPABASE_URL وVITE_SUPABASE_ANON_KEY أولاً.');
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  };

  const loginWithTelegram = async (_username?: string) => {
    throw new Error('تسجيل الدخول عبر Telegram غير موصول بمزوّد مصادقة موثوق؛ لم يتم إنشاء جلسة وهمية.');
  };

  const loginWithEmail = async (email: string, pass: string) => {
    if (!supabaseClient) throw new Error('خدمة تسجيل الدخول غير مهيأة؛ أضف متغيرات Supabase العامة إلى Cloudflare Pages.');
    const { error } = await supabaseClient.auth.signInWithPassword({ email: email.trim(), password: pass });
    if (error) throw error;
    setActiveScreen('home');
  };

  const registerWithEmail = async (name: string, email: string, pass: string) => {
    if (!supabaseClient) throw new Error('خدمة التسجيل غير مهيأة؛ أضف متغيرات Supabase العامة إلى Cloudflare Pages.');
    const { data, error } = await supabaseClient.auth.signUp({
      email: email.trim(),
      password: pass,
      options: {
        data: { name: name.trim() },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) throw error;
    if (data.session) setActiveScreen('home');
    else showToast('تم إنشاء الحساب. راجع بريدك الإلكتروني لتأكيده قبل تسجيل الدخول.');
  };

  const logout = async () => {
    if (supabaseClient) {
      const { error } = await supabaseClient.auth.signOut();
      if (error) throw error;
    }
    setCurrentUser(null);
    setUserRole('customer');
    setActiveScreen('home');
    showToast('تم تسجيل الخروج.');
  };

  return (
    <StoreContext.Provider
      value={{
        checkoutEnabled,
        atlosEnabled,
        atlosMerchantId,
        activeScreen,
        setActiveScreen,
        selectedProductId,
        setSelectedProductId,
        userRole,
        viewMode,
        setViewMode,
        showOriginalDesigns,
        setShowOriginalDesigns,
        currency,
        setCurrencyCode,
        formatPrice,
        products,
        addProduct,
        updateProduct,
        deleteProduct,
        addCodesToPackage,
        orders,
        selectedOrderForFulfillment,
        setSelectedOrderForFulfillment,
        createOrder,
        fulfillPaidOrder,
        startProcessingOrder,
        fulfillDirectRecharge,
        fulfillInstantCode,
        cancelOrder,
        assistants,
        addAssistant,
        updateAssistant,
        deleteAssistant,
        supportTickets,
        selectedTicket,
        setSelectedTicket,
        sendTicketReply,
        updateTicketStatus,
        assignTicket,
        createCustomerTicket,
        customerBalanceUSD,
        merchantBalanceUSD,
        transactions,
        depositToWallet,
        withdrawFromWallet,
        playerProfile,
        updatePlayerProfile,
        toastMessage,
        showToast,

        // Dual Storefront & Physical CJ Store
        storefrontMode,
        setStorefrontMode,
        physicalProducts,
        selectedPhysicalProduct,
        setSelectedPhysicalProduct,
        addPhysicalProduct,
        updatePhysicalProduct,
        deletePhysicalProduct,
        physicalOrders,
        createPhysicalOrder,
        updatePhysicalOrderStatus,
        syncWithCJ,

        // API Integrations
        apiConfig,
        updateApiConfig,
        testCjConnection,
        executeCjTestPurchase,
        fetchRealCjOrders,
        isApiModalOpen,
        setIsApiModalOpen,

        // Authentication
        currentUser,
        isAuthLoading,
        loginWithGoogle,
        loginWithTelegram,
        loginWithEmail,
        registerWithEmail,
        logout,

        // Admin Manual Review
        reviewManualPayment,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
