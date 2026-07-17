import { pgTable, text, integer, boolean, doublePrecision, jsonb } from "drizzle-orm/pg-core";

export const businesses = pgTable("businesses", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  password: text("password"),
  logoUrl: text("logo_url").notNull(),
  country: text("country").notNull(),
  city: text("city").notNull(),
  operatingCurrency: text("operating_currency").notNull(),
  loyaltyMode: text("loyalty_mode").notNull(), // 'stamp' | 'point'
  stampRewardLimit: integer("stamp_reward_limit").notNull(),
  pointRewardLimit: integer("point_reward_limit").notNull(),
  rewardDescription: text("reward_description").notNull(),
  status: text("status").notNull(), // 'active' | 'suspended' | 'blocked'
  languagePreference: text("language_preference").notNull(), // 'en' | 'ne' | 'hi'
  billingCurrency: text("billing_currency").notNull(),
  paymentGateway: text("payment_gateway").notNull(), // 'esewa' | 'khalti' | 'stripe' | 'paypal' | 'razorpay'
  createdAt: text("created_at").notNull(),
  trialEndsAt: text("trial_ends_at").notNull(),
  planId: text("plan_id").notNull(), // 'free' | 'basic' | 'premium' | 'enterprise'
  subscriptionStatus: text("subscription_status").notNull(), // 'active' | 'past_due' | 'unpaid' | 'trialing'
  nextBillingAt: text("next_billing_at").notNull(),
  overrideQuota: integer("override_quota"),
  extraQuota: integer("extra_quota").notNull(),
  notificationsSentThisMonth: integer("notifications_sent_this_month").notNull(),
  pointsRate: doublePrecision("points_rate").notNull(),
  paymentRetries: integer("payment_retries").notNull(),
  pointsOffers: jsonb("points_offers") // PointsOffer[]
});

export const customers = pgTable("customers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  joinedAt: text("joined_at").notNull(),
  preferredLanguage: text("preferred_language")
});

export const customerBusinessRelations = pgTable("customer_business_relations", {
  id: text("id").primaryKey(), // customerId_businessId
  customerId: text("customer_id").notNull(),
  businessId: text("business_id").notNull(),
  stampsCount: integer("stamps_count").notNull(),
  pointsCount: integer("points_count").notNull(),
  lastStampAt: text("last_stamp_at"),
  lastVisitAt: text("last_visit_at").notNull(),
  optInNotifications: boolean("opt_in_notifications").notNull(),
  claimedCoupons: jsonb("claimed_coupons") // ClaimedCoupon[]
});

export const paymentTransactions = pgTable("payment_transactions", {
  id: text("id").primaryKey(),
  businessId: text("business_id").notNull(),
  amount: doublePrecision("amount").notNull(),
  currency: text("currency").notNull(),
  status: text("status").notNull(), // 'success' | 'failed' | 'pending'
  gatewayTxnId: text("gateway_txn_id").notNull(),
  invoiceUrl: text("invoice_url").notNull(),
  createdAt: text("created_at").notNull()
});

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey(),
  businessId: text("business_id").notNull(),
  customerId: text("customer_id"),
  title: text("title").notNull(),
  message: text("message").notNull(),
  sentAt: text("sent_at").notNull(),
  reachedCount: integer("reached_count").notNull(),
  isForMerchant: boolean("is_for_merchant")
});

export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  timestamp: text("timestamp").notNull()
});

export const systemMetadata = pgTable("system_metadata", {
  id: integer("id").primaryKey(),
  enabledLanguages: jsonb("enabled_languages").notNull(),
  globalExchangeRates: jsonb("global_exchange_rates").notNull()
});
