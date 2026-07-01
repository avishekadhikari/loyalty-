export interface SubscriptionPlan {
  id: 'free' | 'basic' | 'premium' | 'enterprise';
  name: string;
  maxCustomers: number; // -1 for unlimited
  monthlyNotifQuota: number;
  prices: { [currencyCode: string]: number };
}

export interface PointsOffer {
  id: string;
  title: string;
  pointsCost: number;
  description: string;
}

export interface ClaimedCoupon {
  id: string;
  offerId: string;
  title: string;
  pointsCost: number;
  claimedAt: string;
  status: 'active' | 'redeemed';
  redeemedAt?: string;
}

export interface Business {
  id: string;
  name: string;
  password?: string;
  logoUrl: string;
  country: string;
  city: string;
  operatingCurrency: string; // NPR, USD, EUR, etc.
  loyaltyMode: 'stamp' | 'point';
  stampRewardLimit: number; // e.g. 10
  pointRewardLimit: number; // e.g. 500
  rewardDescription: string; // e.g. "Free hot beverage" or "NPR 500 discount"
  status: 'active' | 'suspended' | 'blocked';
  languagePreference: 'en' | 'ne' | 'hi';
  billingCurrency: string;
  paymentGateway: 'esewa' | 'khalti' | 'stripe' | 'paypal' | 'razorpay';
  createdAt: string;
  trialEndsAt: string;
  planId: 'free' | 'basic' | 'premium' | 'enterprise';
  subscriptionStatus: 'active' | 'past_due' | 'unpaid' | 'trialing';
  nextBillingAt: string;
  overrideQuota: number | null;
  extraQuota: number; // Extra bought notifications
  notificationsSentThisMonth: number;
  pointsRate: number; // e.g., how many points per 1 unit of currency (e.g. 1 USD = 10 points)
  paymentRetries: number;
  pointsOffers?: PointsOffer[]; // List of points coupons/rewards in their shop catalog
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  joinedAt: string;
}

export interface CustomerBusinessRelation {
  id: string; // customerId_businessId
  customerId: string;
  businessId: string;
  stampsCount: number;
  pointsCount: number;
  lastStampAt: string | null;
  lastVisitAt: string;
  optInNotifications: boolean;
  claimedCoupons?: ClaimedCoupon[]; // Active or redeemed coupons claimed using points
}

export interface PaymentTransaction {
  id: string;
  businessId: string;
  amount: number;
  currency: string;
  status: 'success' | 'failed' | 'pending';
  gatewayTxnId: string;
  invoiceUrl: string;
  createdAt: string;
}

export interface NotificationMsg {
  id: string;
  businessId: string; // 'system' for admin broadcast
  customerId?: string; // Optional: specific customer recipient for personal loyalty alerts
  title: string;
  message: string;
  sentAt: string;
  reachedCount: number;
}

export interface AuditLog {
  id: string;
  actor: string;
  action: string;
  timestamp: string;
}

export interface AppDatabase {
  businesses: Business[];
  customers: Customer[];
  customer_business_relations: CustomerBusinessRelation[];
  subscription_plans: SubscriptionPlan[];
  payment_transactions: PaymentTransaction[];
  notifications: NotificationMsg[];
  audit_logs: AuditLog[];
  enabledLanguages: string[]; // ['en', 'ne', 'hi']
  globalExchangeRates: { [currencyCode: string]: number }; // In relation to USD e.g. USD=1.0, NPR=133.0, EUR=0.92
}
