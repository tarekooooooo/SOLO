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
  INITIAL_ASSISTANTS,
  INITIAL_ORDERS, 
  INITIAL_PRODUCTS, 
  INITIAL_SUPPORT_TICKETS,
  INITIAL_TRANSACTIONS,
  DEFAULT_API_CONFIG,
  INITIAL_AUTH_USER,
  INITIAL_PHYSICAL_PRODUCTS,
  INITIAL_PHYSICAL_ORDERS
} from '../data/mockData';
import { getFunctionUrl } from '../config/api';

interface StoreContextType {
  // Navigation & View
  activeScreen: ScreenId;
  setActiveScreen: (screen: ScreenId) => void;
  selectedProductId: string;
  setSelectedProductId: (id: string) => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
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
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'totalSold'>) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addCodesToPackage: (productId: string, packageId: string, codes: string[]) => void;

  // Orders & Fulfillment
  orders: Order[];
  selectedOrderForFulfillment: Order | null;
  setSelectedOrderForFulfillment: (order: Order | null) => void;
  createOrder: (order: Omit<Order, 'id' | 'orderNumber' | 'date' | 'status'>) => Order;
  startProcessingOrder: (orderId: string) => void;
  fulfillDirectRecharge: (orderId: string, notes?: string) => void;
  fulfillInstantCode: (orderId: string, code?: string, notes?: string) => void;
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
  createPhysicalOrder: (order: Omit<PhysicalOrder, 'id' | 'orderNumber' | 'createdAt' | 'status'>) => PhysicalOrder;
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
  loginWithGoogle: () => void;
  loginWithTelegram: (username?: string) => void;
  loginWithEmail: (email: string, pass: string) => void;
  registerWithEmail: (name: string, email: string, pass: string) => void;
  logout: () => void;

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

  const [currencyCode, setCurrencyCodeState] = useState<CurrencyCode>('SAR');
  const currency = CURRENCIES[currencyCode] || CURRENCIES.USD;

  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [selectedOrderForFulfillment, setSelectedOrderForFulfillment] = useState<Order | null>(null);

  const [customerBalanceUSD, setCustomerBalanceUSD] = useState<number>(45.80);
  const [merchantBalanceUSD, setMerchantBalanceUSD] = useState<number>(2500.00);
  const [transactions, setTransactions] = useState<WalletTransaction[]>(INITIAL_TRANSACTIONS);
  const [playerProfile, setPlayerProfile] = useState<PlayerProfile>(CURRENT_PLAYER_PROFILE);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Staff Assistants State
  const [assistants, setAssistants] = useState<StaffAssistant[]>(INITIAL_ASSISTANTS);

  // Customer Support Tickets State
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>(INITIAL_SUPPORT_TICKETS);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  // Storefront Dual Mode (المتجر الرقمي والمنتجات المادية جنب بعض)
  const [storefrontMode, setStorefrontMode] = useState<StorefrontMode>('digital');

  // Physical Products (CJ Dropshipping)
  const [physicalProducts, setPhysicalProducts] = useState<PhysicalProduct[]>(INITIAL_PHYSICAL_PRODUCTS);
  const [selectedPhysicalProduct, setSelectedPhysicalProduct] = useState<PhysicalProduct | null>(null);

  // Physical Orders (with localStorage persistence)
  const [physicalOrders, setPhysicalOrders] = useState<PhysicalOrder[]>(() => {
    try {
      const saved = localStorage.getItem('tarek_store_physical_orders');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return INITIAL_PHYSICAL_ORDERS;
  });

  // API Config (CJ Dropshipping, Google, Telegram with localStorage persistence)
  const [apiConfig, setApiConfigState] = useState<ApiIntegrationsConfig>(() => {
    try {
      const storageKey = 'tarek_store_api_config';
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<ApiIntegrationsConfig> & { cjApiKey?: string };
        if ('cjApiKey' in parsed) delete parsed.cjApiKey;
        const sanitized = { ...DEFAULT_API_CONFIG, ...parsed, cjConnected: false, autoFulfillWithCJ: false };
        localStorage.setItem(storageKey, JSON.stringify(sanitized));
        return sanitized;
      }
    } catch {
      // ignore
    }
    return DEFAULT_API_CONFIG;
  });
  const [isApiModalOpen, setIsApiModalOpen] = useState<boolean>(false);

  // Authentication User State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(INITIAL_AUTH_USER);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

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
  const addProduct = (newProdData: Omit<Product, 'id' | 'createdAt' | 'totalSold'>) => {
    const newProduct: Product = {
      ...newProdData,
      id: `prod-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
      totalSold: 0,
    };
    setProducts((prev) => [newProduct, ...prev]);
    showToast(`تمت إضافة منتج "${newProduct.titleAr}" بنجاح إلى المتجر!`);
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
    showToast('تم تحديث بيانات المنتج بنجاح.');
  };

  const deleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    showToast('تم حذف المنتج من المتجر.');
  };

  const addCodesToPackage = (productId: string, packageId: string, newCodes: string[]) => {
    setProducts((prev) =>
      prev.map((prod) => {
        if (prod.id !== productId) return prod;
        return {
          ...prod,
          packages: prod.packages.map((pkg) => {
            if (pkg.id !== packageId) return pkg;
            return {
              ...pkg,
              availableCodes: [...(pkg.availableCodes || []), ...newCodes],
            };
          }),
        };
      })
    );
    showToast(`تم إضافة ${newCodes.length} كود رقمي جديد إلى بنك الأكواد.`);
  };

  // Orders Management & Fulfillment Pipeline
  const createOrder = (orderData: Omit<Order, 'id' | 'orderNumber' | 'date' | 'status'>): Order => {
    const newId = `ord-${Date.now().toString().slice(-4)}`;
    const isManualOrAtlos = 
      ['libyana', 'almadar', 'bank_transfer', 'payoneer', 'atlos_crypto'].includes(orderData.paymentMethod as string) ||
      /ليبيانا|المدار|مصرفي|تحويل|Payoneer|ATLOS|يدوي/i.test(String(orderData.paymentMethod));

    const initialStatus: OrderStatus = isManualOrAtlos ? 'awaiting_manual_review' : 'pending';

    const newOrder: Order = {
      ...orderData,
      id: newId,
      orderNumber: `#TRK-${newId.replace('ord-', '')}`,
      date: 'الآن',
      status: initialStatus,
    };

    setOrders((prev) => [newOrder, ...prev]);

    // Only deduct customer wallet balance if paid via wallet
    if (!isManualOrAtlos && String(orderData.paymentMethod).includes('محفظة')) {
      setCustomerBalanceUSD((prev) => Math.max(0, prev - newOrder.priceUSD));
      
      const newTx: WalletTransaction = {
        id: `tx-${Date.now()}`,
        type: 'purchase',
        title: `طلب جديد: ${newOrder.productName} (${newOrder.packageName})`,
        amountUSD: -newOrder.priceUSD,
        date: new Date().toISOString().replace('T', ' ').substring(0, 16),
        status: 'completed',
        method: newOrder.paymentMethod,
        orderId: newOrder.orderNumber,
      };
      setTransactions((prev) => [newTx, ...prev]);
    }

    // Auto-deliver instant code ONLY if already confirmed (e.g. wallet paid)
    // NEVER auto-deliver for manual payment methods or ATLOS until approved by admin
    if (!isManualOrAtlos) {
      const targetProduct = products.find((p) => p.id === newOrder.productId);
      const targetPkg = targetProduct?.packages.find((pkg) => pkg.id === newOrder.packageId);

      if (newOrder.deliveryType === 'instant_code' && targetPkg?.availableCodes && targetPkg.availableCodes.length > 0) {
        const deliveredCode = targetPkg.availableCodes[0];
        setTimeout(() => {
          setOrders((prev) =>
            prev.map((o) =>
              o.id === newOrder.id
                ? {
                    ...o,
                    status: 'completed',
                    assignedCode: deliveredCode,
                    fulfilledAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
                    fulfillmentNotes: 'تم التسليم التلقائي الفوري من بنك الأكواد الرقمية بنجاح ⚡',
                  }
                : o
            )
          );
          setProducts((prev) =>
            prev.map((prod) => {
              if (prod.id !== newOrder.productId) return prod;
              return {
                ...prod,
                packages: prod.packages.map((pkg) => {
                  if (pkg.id !== newOrder.packageId) return pkg;
                  return {
                    ...pkg,
                    availableCodes: (pkg.availableCodes || []).filter((c) => c !== deliveredCode),
                  };
                }),
              };
            })
          );
        }, 1000);
      }
    }

    if (isManualOrAtlos) {
      showToast(`تم تسجيل الطلب ${newOrder.orderNumber}، وهو الآن "بانتظار مراجعة الإدارة وتدقيق الحوالة" ⏳`);
    } else {
      showToast(`تم إنشاء الطلب ${newOrder.orderNumber} بنجاح! جاري التجهيز...`);
    }

    return newOrder;
  };

  const startProcessingOrder = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: 'processing' } : o))
    );
    showToast(`تم تحويل الطلب إلى "قيد التجهيز والمعالجة".`);
  };

  const fulfillDirectRecharge = (orderId: string, notes?: string) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          status: 'completed',
          fulfilledAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
          fulfillmentNotes: notes || `تم شحن الحساب بنجاح لمعرف اللاعب: ${o.targetPlayerId} (${o.targetPlayerName || 'اللاعب'}) 🎮`,
        };
      })
    );

    // Increase merchant balance
    const targetOrder = orders.find((o) => o.id === orderId);
    if (targetOrder) {
      setMerchantBalanceUSD((prev) => prev + targetOrder.priceUSD);
    }

    showToast('تم شحن حساب العميل بنجاح واكتمال تجهيز الطلب! ✅');
  };

  const fulfillInstantCode = (orderId: string, customCode?: string, notes?: string) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) return;

    let codeToDeliver = customCode;
    if (!codeToDeliver) {
      // Pick from stock if any
      const prod = products.find((p) => p.id === targetOrder.productId);
      const pkg = prod?.packages.find((p) => p.id === targetOrder.packageId);
      if (pkg?.availableCodes && pkg.availableCodes.length > 0) {
        codeToDeliver = pkg.availableCodes[0];
        // remove from available
        setProducts((prevProds) =>
          prevProds.map((pr) => {
            if (pr.id !== targetOrder.productId) return pr;
            return {
              ...pr,
              packages: pr.packages.map((pk) => {
                if (pk.id !== targetOrder.packageId) return pk;
                return {
                  ...pk,
                  availableCodes: (pk.availableCodes || []).filter((c) => c !== codeToDeliver),
                };
              }),
            };
          })
        );
      } else {
        codeToDeliver = `TRK-KEY-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      }
    }

    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        return {
          ...o,
          status: 'completed',
          assignedCode: codeToDeliver,
          fulfilledAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
          fulfillmentNotes: notes || `تم إرسال الكود الرقمي للعميل: ${codeToDeliver}`,
        };
      })
    );

    setMerchantBalanceUSD((prev) => prev + targetOrder.priceUSD);
    showToast(`تم تسليم الكود الرقمي (${codeToDeliver}) واكتمال الطلب! 🔑`);
  };

  const cancelOrder = (orderId: string, reason?: string) => {
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) return;

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: 'cancelled',
              fulfillmentNotes: reason || 'تم إلغاء الطلب واسترجاع المبلغ للعميل.',
            }
          : o
      )
    );

    // Refund customer balance
    setCustomerBalanceUSD((prev) => prev + targetOrder.priceUSD);

    // Add refund transaction
    const refundTx: WalletTransaction = {
      id: `tx-refund-${Date.now()}`,
      type: 'deposit',
      title: `استرجاع رصيد للطلب الملغى ${targetOrder.orderNumber}`,
      amountUSD: +targetOrder.priceUSD,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'completed',
      method: 'استرجاع تلقائي للمحفظة',
      orderId: targetOrder.orderNumber,
    };
    setTransactions((prev) => [refundTx, ...prev]);

    showToast(`تم إلغاء الطلب ${targetOrder.orderNumber} واسترجاع المبلغ للمحفظة.`);
  };

  const depositToWallet = (amountUSD: number, method: string) => {
    setCustomerBalanceUSD((prev) => prev + amountUSD);
    const newTx: WalletTransaction = {
      id: `tx-dep-${Date.now()}`,
      type: 'deposit',
      title: `شحن رصيد المحفظة عبر ${method}`,
      amountUSD: +amountUSD,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'completed',
      method,
    };
    setTransactions((prev) => [newTx, ...prev]);
    showToast(`تم شحن المحفظة بنجاح بمبلغ ${formatPrice(amountUSD)}!`);
  };

  const withdrawFromWallet = (amountUSD: number, method: string) => {
    if (merchantBalanceUSD < amountUSD) {
      showToast('عفواً، الرصيد المتاح غير كافٍ لعملية السحب.');
      return;
    }
    setMerchantBalanceUSD((prev) => prev - amountUSD);
    const newTx: WalletTransaction = {
      id: `tx-wd-${Date.now()}`,
      type: 'withdrawal',
      title: `سحب أرباح التاجر عبر ${method}`,
      amountUSD: -amountUSD,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      status: 'completed',
      method,
    };
    setTransactions((prev) => [newTx, ...prev]);
    showToast(`تم إرسال طلب سحب ${formatPrice(amountUSD)} بنجاح.`);
  };

  const updatePlayerProfile = (updates: Partial<PlayerProfile>) => {
    setPlayerProfile((prev) => ({ ...prev, ...updates }));
    showToast('تم حفظ تعديلات الملف الشخصي بنجاح.');
  };

  // Staff & Assistants Methods
  const addAssistant = (assistantData: Omit<StaffAssistant, 'id' | 'addedAt' | 'ordersHandled' | 'ticketsHandled'>) => {
    const newAssistant: StaffAssistant = {
      ...assistantData,
      id: `ast-${Date.now()}`,
      addedAt: new Date().toISOString().split('T')[0],
      ordersHandled: 0,
      ticketsHandled: 0,
    };
    setAssistants((prev) => [newAssistant, ...prev]);
    showToast(`تم تعيين المساعد "${newAssistant.name}" بنجاح وإرسال بيانات الدخول.`);
  };

  const updateAssistant = (id: string, updates: Partial<StaffAssistant>) => {
    setAssistants((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
    showToast('تم تحديث بيانات وصلاحيات المساعد بنجاح.');
  };

  const deleteAssistant = (id: string) => {
    setAssistants((prev) => prev.filter((a) => a.id !== id));
    showToast('تم حذف المساعد من فريق العمل.');
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
    const newTckNum = `#TCK-${Math.floor(100 + Math.random() * 900)}`;
    const newTicket: SupportTicket = {
      id: `tck-${Date.now()}`,
      ticketNumber: newTckNum,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      subject: data.subject,
      relatedOrderId: data.relatedOrderId,
      category: 'order_status',
      priority: 'high',
      status: 'open',
      createdAt: 'الآن',
      messages: [
        {
          id: `msg-${Date.now()}`,
          sender: 'customer',
          senderName: data.customerName,
          text: data.message,
          time: 'الآن',
        },
      ],
    };
    setSupportTickets((prev) => [newTicket, ...prev]);
    showToast(`تم إرسال تذكرة الدعم ${newTckNum} بنجاح، جاري الرد من خدمة العملاء.`);
  };

  // API Configuration Handlers
  const updateApiConfig = (updates: Partial<ApiIntegrationsConfig>) => {
    setApiConfigState((prev) => {
      const next = { ...prev, ...updates, autoFulfillWithCJ: false };
      try {
        localStorage.setItem('tarek_store_api_config', JSON.stringify(next));
      } catch (e) {
        console.warn(e);
      }
      return next;
    });
    showToast('تم حفظ إعدادات الربط. مفاتيح الخادم لا تُحفظ في المتصفح.');
  };

  const testCjConnection = async (): Promise<{ success: boolean; message: string; latencyMs?: number; data?: any }> => {
    showToast('جاري فحص الاتصال بسيرفرات CJ Dropshipping عبر الدالة السحابية الآمنة...');
    try {
      const res = await fetch(getFunctionUrl('cj-verify'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        updateApiConfig({ cjConnected: true });
        showToast(`✅ ${data.message} (${data.latencyMs}ms)`);
        return data;
      } else {
        updateApiConfig({ cjConnected: false });
        showToast(`⚠️ ${data.message}`);
        return data;
      }
    } catch (err: unknown) {
      updateApiConfig({ cjConnected: false });
      const message = err instanceof Error ? err.message : 'تعذر الاتصال بوظيفة CJ.';
      showToast(`⚠️ لم يتم التحقق من اتصال CJ: ${message}`);
      return { success: false, message };
    }
  };

  const executeCjTestPurchase = async (customProduct?: PhysicalProduct, customSku?: string): Promise<{ success: boolean; order?: PhysicalOrder; message?: string; latencyMs: number; log: any }> => {
    const targetProduct = customProduct || physicalProducts[0];
    const targetSku = customSku && customSku.trim() !== '' ? customSku.trim() : targetProduct.cjSku;
    
    // SAFE LOCAL SIMULATION ONLY: Never calls real CJ createOrderV2 or payment gateway
    showToast(`محاكاة فحص محلية آمنة (SKU: ${targetSku}) دون اتصال حقيقي بـ CJ...`);
    await new Promise((r) => setTimeout(r, 450));

    const simulatedOrder: PhysicalOrder = {
      id: `sim-${Date.now().toString().slice(-4)}`,
      orderNumber: `#SIM-${Date.now().toString().slice(-4)}`,
      customerId: currentUser?.id || 'usr-guest',
      customerName: currentUser?.name || 'مستخدم تجريبي',
      customerEmail: currentUser?.email || 'guest@example.com',
      customerPhone: currentUser?.phone || '+966500000000',
      productId: targetProduct.id,
      productTitle: targetProduct.titleAr,
      productImage: targetProduct.image,
      selectedVariant: 'محاكاة محلية آمنة (Dry Run)',
      quantity: 1,
      priceUSD: targetProduct.priceUSD,
      shippingFeeUSD: 6.50,
      totalUSD: targetProduct.priceUSD + 6.50,
      shippingAddress: {
        fullName: currentUser?.name || 'مستخدم تجريبي',
        phone: currentUser?.phone || '+966500000000',
        country: 'المملكة العربية السعودية',
        city: 'الرياض',
        streetAddress: 'شارع تجريبي للاختبار المحلي',
      },
      status: 'pending',
      createdAt: 'الآن (محاكاة محلية)',
      paymentMethod: 'محاكاة محلية معزولة (Local Test Only)',
    };

    return {
      success: true,
      order: simulatedOrder,
      message: 'تمت المحاكاة المحلية بنجاح دون إرسال أي طلب أو دفع إلى CJ Dropshipping',
      latencyMs: 450,
      log: {
        mode: 'dry_run_simulation',
        skuTested: targetSku,
        note: 'محاكاة معزولة: لا يتم استدعاء CJ createOrderV2 أو الدفع الحقيقي.',
      },
    };
  };

  const fetchRealCjOrders = async (): Promise<{ success: boolean; orders: any[]; message: string; latencyMs?: number }> => {
    showToast('جاري سحب واستعلام الطلبات الحقيقية من حساب CJ عبر الدالة السحابية الآمنة...');
    try {
      const res = await fetch(getFunctionUrl('cj-orders-list'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✅ تم جلب ${data.ordersCount} طلب من حسابك الفعلي في CJ!`);
        return data;
      } else {
        showToast(`⚠️ ${data.message || data.error}`);
        return { success: false, orders: [], message: data.message || data.error };
      }
    } catch (e: any) {
      showToast(`تعذر الاتصال بـ CJ: ${e.message}`);
      return { success: false, orders: [], message: e.message };
    }
  };

  // Physical Products Handlers
  const addPhysicalProduct = (newProdData: Omit<PhysicalProduct, 'id' | 'totalSold'>) => {
    const newProd: PhysicalProduct = {
      ...newProdData,
      id: `phys-${Date.now()}`,
      totalSold: 0,
    };
    setPhysicalProducts((prev) => [newProd, ...prev]);
    showToast(`تمت إضافة منتج "${newProd.titleAr}" إلى متجر المنتجات المادية!`);
  };

  const updatePhysicalProduct = (id: string, updates: Partial<PhysicalProduct>) => {
    setPhysicalProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
    showToast('تم تحديث بيانات المنتج بنجاح.');
  };

  const deletePhysicalProduct = (id: string) => {
    setPhysicalProducts((prev) => prev.filter((p) => p.id !== id));
    showToast('تم حذف المنتج من المتجر المادي.');
  };

  // Physical Orders Handlers
  const createPhysicalOrder = (orderData: Omit<PhysicalOrder, 'id' | 'orderNumber' | 'createdAt' | 'status'>): PhysicalOrder => {
    const newId = `pord-${Date.now().toString().slice(-4)}`;
    const isManualOrAtlos = 
      ['libyana', 'almadar', 'bank_transfer', 'payoneer', 'atlos_crypto'].includes(orderData.paymentMethod as string) ||
      /ليبيانا|المدار|مصرفي|تحويل|Payoneer|ATLOS|يدوي/i.test(String(orderData.paymentMethod));

    const initialStatus: PhysicalOrderStatus = isManualOrAtlos 
      ? 'awaiting_manual_review' 
      : (apiConfig.autoFulfillWithCJ ? 'cj_syncing' : 'pending');

    const newOrder: PhysicalOrder = {
      ...orderData,
      id: newId,
      orderNumber: `#CJ-ORD-${newId.replace('pord-', '')}`,
      createdAt: 'الآن',
      status: initialStatus,
      cjOrderId: (!isManualOrAtlos && apiConfig.autoFulfillWithCJ) ? `CJ2026${Date.now().toString().slice(-6)}` : undefined,
      cjTrackingNumber: (!isManualOrAtlos && apiConfig.autoFulfillWithCJ) ? `CJEXP${Math.floor(100000000 + Math.random() * 900000000)}` : undefined,
      shippingCarrier: 'CJ Packet Fast Line',
    };

    setPhysicalOrders((prev) => [newOrder, ...prev]);

    // If paid via wallet
    if (!isManualOrAtlos && orderData.paymentMethod.includes('محفظة')) {
      setCustomerBalanceUSD((prev) => Math.max(0, prev - newOrder.totalUSD));
      
      const newTx: WalletTransaction = {
        id: `tx-${Date.now()}`,
        type: 'purchase',
        title: `شراء شحنة: ${newOrder.productTitle.slice(0, 30)}...`,
        amountUSD: newOrder.totalUSD,
        date: 'الآن',
        status: 'completed',
        method: newOrder.paymentMethod,
        orderId: newOrder.orderNumber,
      };
      setTransactions((prev) => [newTx, ...prev]);
    }

    if (isManualOrAtlos) {
      showToast(`📦 تم إرسال طلب الشحنة ${newOrder.orderNumber}، وهو الآن "بانتظار مراجعة الإدارة للحوالة" قبل التجهيز.`);
    } else {
      showToast(`🎉 تم إرسال الطلب ${newOrder.orderNumber} بنجاح! جاري التجهيز والشحن.`);
    }

    return newOrder;
  };

  const updatePhysicalOrderStatus = (orderId: string, status: PhysicalOrderStatus, trackingNum?: string) => {
    setPhysicalOrders((prev) =>
      prev.map((ord) => {
        if (ord.id !== orderId) return ord;
        return {
          ...ord,
          status,
          cjTrackingNumber: trackingNum || ord.cjTrackingNumber,
        };
      })
    );
    showToast(`تم تحديث حالة طلب الشحن #${orderId} إلى: ${status}`);
  };

  const syncWithCJ = (orderId: string) => {
    setPhysicalOrders((prev) =>
      prev.map((ord) => {
        if (ord.id !== orderId) return ord;
        const fakeTrack = `CJTRK${Math.floor(100000000 + Math.random() * 900000000)}SA`;
        return {
          ...ord,
          status: 'shipped',
          cjTrackingNumber: ord.cjTrackingNumber || fakeTrack,
          shippingCarrier: 'CJ Logistics Express (شحن سريع)',
        };
      })
    );
    showToast(`تمت مزامنة الطلب مع CJ Dropshipping بنجاح وإصدار بوليصة الشحن 🚀`);
  };

  // Admin Manual Review Handler (Server & Local Synchronization)
  const reviewManualPayment = async (
    orderId: string,
    decision: 'approve' | 'reject',
    notes?: string,
    isPhysical: boolean = false
  ): Promise<{ success: boolean; message: string }> => {
    try {
      // 1. Invoke Supabase Edge Function if user has active session
      if (currentUser) {
        try {
          const res = await fetch(getFunctionUrl('review-manual-payment'), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${currentUser.id}`,
            },
            body: JSON.stringify({ orderId, decision, notes }),
          });
          const result = await res.json();
          if (res.ok && result.success) {
            console.log('Server review_manual_payment succeeded:', result);
          }
        } catch (e) {
          console.warn('Edge function offline or local mode:', e);
        }
      }

      // 2. Update local state
      if (isPhysical) {
        setPhysicalOrders((prev) =>
          prev.map((o) => {
            if (o.id !== orderId) return o;
            const newStatus: PhysicalOrderStatus = decision === 'approve' ? 'processing' : 'cancelled';
            return {
              ...o,
              status: newStatus,
              paymentReference: o.paymentReference 
                ? `${o.paymentReference} (مراجعة الإدارة: ${decision === 'approve' ? 'معتمد ✅' : 'مرفوض ❌'})`
                : undefined,
            };
          })
        );
      } else {
        setOrders((prev) =>
          prev.map((o) => {
            if (o.id !== orderId) return o;
            const newStatus: OrderStatus = decision === 'approve' ? 'processing' : 'cancelled';
            return {
              ...o,
              status: newStatus,
              fulfillmentNotes: notes || (decision === 'approve' ? 'تم اعتماد الدفع وتأكيد الحوالة من قبل الإدارة' : 'تم رفض الحوالة وإلغاء الطلب'),
            };
          })
        );
      }

      const msg = decision === 'approve'
        ? `✅ تم اعتماد الدفع للطلب ${orderId} بنجاح وتحويله للمعالجة والتجهيز.`
        : `❌ تم رفض إشعار التحويل وإلغاء الطلب ${orderId}.`;
      showToast(msg);
      return { success: true, message: msg };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشلت معالجة مراجعة الدفع';
      showToast(`⚠️ خطأ: ${msg}`);
      return { success: false, message: msg };
    }
  };


  // Auth Handlers
  const loginWithGoogle = () => {
    const user: AuthUser = {
      id: `usr-google-${Date.now().toString().slice(-4)}`,
      name: 'طارق الأحمد (Google User)',
      email: 'tarekai042@gmail.com',
      provider: 'google',
      role: 'admin',
      avatar: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80',
    };
    setCurrentUser(user);
    setUserRole('admin');
    showToast('تم تسجيل الدخول بنجاح عبر حساب Google الرسمي ✅');
    setActiveScreen('home');
  };

  const loginWithTelegram = (username = '@TarekStoreUser') => {
    const user: AuthUser = {
      id: `usr-tg-${Date.now().toString().slice(-4)}`,
      name: username.replace('@', ''),
      email: `${username.replace('@', '').toLowerCase()}@telegram.user`,
      provider: 'telegram',
      role: 'customer',
      telegramUsername: username,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    };
    setCurrentUser(user);
    showToast(`تم تسجيل الدخول بحساب تيليجرام (${username}) بنجاح ✈️`);
    setActiveScreen('home');
  };

  const loginWithEmail = (email: string, _pass: string) => {
    const name = email.split('@')[0] || 'مستخدم طارق ستور';
    const isAdmin = email.toLowerCase().includes('admin') || email.toLowerCase().includes('tarek');
    const user: AuthUser = {
      id: `usr-mail-${Date.now().toString().slice(-4)}`,
      name: isAdmin ? 'طارق الأحمد' : name,
      email: email,
      provider: 'email',
      role: isAdmin ? 'admin' : 'customer',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    };
    setCurrentUser(user);
    if (isAdmin) setUserRole('admin');
    showToast(`مرحباً بك مجدداً يا ${user.name}! تم تسجيل الدخول بنجاح.`);
    setActiveScreen('home');
  };

  const registerWithEmail = (name: string, email: string, _pass: string) => {
    const user: AuthUser = {
      id: `usr-new-${Date.now().toString().slice(-4)}`,
      name: name,
      email: email,
      provider: 'email',
      role: 'customer',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    };
    setCurrentUser(user);
    showToast(`أهلاً بك يا ${name}! تم إنشاء حسابك الجديد بنجاح 🎁`);
    setActiveScreen('home');
  };

  const logout = () => {
    setCurrentUser(null);
    showToast('تم تسجيل الخروج بنجاح.');
  };

  return (
    <StoreContext.Provider
      value={{
        activeScreen,
        setActiveScreen,
        selectedProductId,
        setSelectedProductId,
        userRole,
        setUserRole,
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
