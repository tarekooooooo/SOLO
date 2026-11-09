export type ScreenId = 
  | 'splash'
  | 'login'
  | 'home'
  | 'product'
  | 'physical_store'
  | 'auth'
  | 'gift'
  | 'wallet'
  | 'community'
  | 'tournaments'
  | 'profile'
  | 'merchant'
  | 'admin'
  | 'support'
  | 'security'
  | 'overview'
  | 'gmail';

export type UserRole = 'customer' | 'merchant' | 'admin';
export type StorefrontMode = 'digital' | 'physical';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  provider: 'email' | 'google' | 'telegram';
  role: UserRole;
  avatar?: string;
  telegramUsername?: string;
  phone?: string;
}

export interface ApiIntegrationsConfig {
  cjAccountEmail: string;
  cjAppId: string;
  cjConnected: boolean;
  googleClientId: string;
  telegramBotUsername: string;
  autoFulfillWithCJ: boolean;
  defaultMarkupPercent: number;
}

export interface StaffAssistant {
  id: string;
  name: string;
  email: string;
  phone: string;
  roleTitle: string; // e.g. "مساعد تجهيز وشحن", "مشرف خدمة عملاء", "مدير المنتجات"
  permissions: Array<'fulfill_orders' | 'customer_support' | 'manage_products' | 'manage_wallet' | 'view_analytics'>;
  status: 'active' | 'suspended';
  ordersHandled: number;
  ticketsHandled: number;
  addedAt: string;
  avatar?: string;
}

export interface SupportMessage {
  id: string;
  sender: 'customer' | 'support' | 'assistant';
  senderName: string;
  text: string;
  time: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  customerName: string;
  customerPhone?: string;
  customerEmail: string;
  subject: string;
  relatedOrderId?: string;
  category: 'order_status' | 'code_issue' | 'recharge_inquiry' | 'payment' | 'other';
  priority: 'urgent' | 'high' | 'normal';
  status: 'open' | 'in_progress' | 'resolved';
  assignedToAssistantId?: string;
  assignedToAssistantName?: string;
  createdAt: string;
  messages: SupportMessage[];
}

export type CurrencyCode = 'USD' | 'SAR' | 'AED' | 'EGP' | 'EUR' | 'KWD';

export interface Currency {
  code: CurrencyCode;
  symbol: string;
  name: string;
  rate: number; // against USD
  flag: string;
}

export type ProductCategory = 
  | 'games' 
  | 'cards' 
  | 'game_currency' 
  | 'gifts' 
  | 'tournaments' 
  | 'services';

export interface ProductPackage {
  id: string;
  name: string; // e.g. "300 UC", "600 UC", "$50"
  amount: number;
  priceUSD: number;
  bonus?: string;
  availableCodes?: string[];
}

export interface Product {
  id: string;
  title: string;
  titleAr: string;
  category: ProductCategory;
  platform: 'pubg' | 'steam' | 'playstation' | 'xbox' | 'freefire' | 'roblox' | 'other';
  image: string;
  description: string;
  rating: number;
  deliveryType: 'instant_code' | 'direct_id_recharge' | 'manual_service';
  packages: ProductPackage[];
  merchantId: string;
  merchantName: string;
  inStock: boolean;
  totalSold: number;
  createdAt: string;
}

// Physical Products & CJ Dropshipping Models
export type PhysicalProductCategory = 
  | 'keyboards' 
  | 'headsets' 
  | 'mice' 
  | 'chairs' 
  | 'rgb_lights' 
  | 'accessories' 
  | 'streaming';

export interface PhysicalProductVariant {
  id: string;
  name: string; // e.g. "اللون", "نوع السويتش", "المقاس"
  options: string[];
  priceDiffUSD?: number;
}

export interface PhysicalProduct {
  id: string;
  title: string;
  titleAr: string;
  category: PhysicalProductCategory;
  cjSku: string;
  cjProductId: string;
  image: string;
  galleryImages?: string[];
  description: string;
  priceUSD: number;
  originalPriceUSD: number;
  costPriceUSD: number;
  stock: number;
  variants: PhysicalProductVariant[];
  weightKg: number;
  estimatedDeliveryDays: string;
  rating: number;
  reviewsCount: number;
  features: string[];
  inStock: boolean;
  totalSold: number;
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  country: string;
  city: string;
  district?: string;
  streetAddress: string;
  postalCode?: string;
  notes?: string;
}

export type PaymentMethod = 
  | 'atlos_crypto' 
  | 'libyana' 
  | 'almadar' 
  | 'bank_transfer' 
  | 'payoneer' 
  | 'wallet';

export type PhysicalOrderStatus = 
  | 'pending' 
  | 'awaiting_manual_review'
  | 'cj_syncing' 
  | 'processing' 
  | 'shipped' 
  | 'delivered' 
  | 'cancelled';

export interface PhysicalOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  productId: string;
  productTitle: string;
  productImage: string;
  selectedVariant?: string;
  quantity: number;
  priceUSD: number;
  shippingFeeUSD: number;
  totalUSD: number;
  shippingAddress: ShippingAddress;
  cjOrderId?: string;
  cjTrackingNumber?: string;
  shippingCarrier?: string;
  status: PhysicalOrderStatus;
  createdAt: string;
  paymentMethod: PaymentMethod | string;
  paymentReference?: string;
  paymentReceiptUrl?: string;
}

export type OrderStatus = 
  | 'pending' 
  | 'awaiting_manual_review'
  | 'processing' 
  | 'ready_to_deliver' 
  | 'completed' 
  | 'cancelled';

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  productId: string;
  productName: string;
  packageId: string;
  packageName: string;
  platform: string;
  priceUSD: number;
  deliveryType: 'instant_code' | 'direct_id_recharge' | 'manual_service';
  targetPlayerId?: string; // e.g. PUBG ID
  targetPlayerName?: string; // In-game nickname
  isGift: boolean;
  giftRecipient?: string;
  giftNote?: string;
  status: OrderStatus;
  date: string;
  assignedCode?: string;
  fulfillmentNotes?: string;
  fulfilledAt?: string;
  paymentMethod: PaymentMethod | string;
  paymentReference?: string;
  paymentReceiptUrl?: string;
}

export interface WalletTransaction {
  id: string;
  type: 'purchase' | 'deposit' | 'withdrawal' | 'merchant_payout' | 'tournament_reward';
  title: string;
  amountUSD: number;
  date: string;
  status: 'completed' | 'pending' | 'failed';
  method: string;
  orderId?: string;
}

export interface Tournament {
  id: string;
  title: string;
  game: string;
  banner: string;
  participantsCount: number;
  maxParticipants: number;
  prizePool: string;
  startDate: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  entryFee: string;
}

export interface PlayerProfile {
  id: string;
  username: string;
  tag: string;
  avatar: string;
  level: number;
  points: number;
  rank: string;
  followersCount: number;
  joinedTournaments: number;
  achievementsCount: number;
  connectedPlatforms: {
    steam?: string;
    playstation?: string;
    xbox?: string;
    pubgId?: string;
  };
  favoriteGames: string[];
}
