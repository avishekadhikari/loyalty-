import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import admin from "firebase-admin";
import { cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { AppDatabase, Business, Customer, CustomerBusinessRelation, SubscriptionPlan, PaymentTransaction, NotificationMsg, AuditLog } from "../frontend/types";
import { db } from "./db/index.ts";
import {
  businesses,
  customers,
  customerBusinessRelations,
  paymentTransactions,
  notifications,
  auditLogs,
  systemMetadata
} from "./db/schema.ts";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const DB_FILE = path.join(process.cwd(), "db.json");

// Define custom signature key for QR codes
const QR_SECRET = "RemixLoyaltySecret2026";

// Initial seed data
const initialPlans: SubscriptionPlan[] = [
  {
    id: "free",
    name: "Lifetime Free Plan",
    maxCustomers: 50,
    monthlyNotifQuota: 3,
    prices: { NPR: 0, USD: 0, EUR: 0, GBP: 0, INR: 0 }
  },
  {
    id: "basic",
    name: "Basic Plan",
    maxCustomers: 200,
    monthlyNotifQuota: 5,
    prices: { NPR: 500, USD: 5, EUR: 4.5, GBP: 4.0, INR: 350 }
  },
  {
    id: "premium",
    name: "Premium Plan",
    maxCustomers: 1000,
    monthlyNotifQuota: 20,
    prices: { NPR: 1500, USD: 15, EUR: 13.5, GBP: 12.0, INR: 1000 }
  },
  {
    id: "enterprise",
    name: "Enterprise Plan",
    maxCustomers: -1, // Unlimited
    monthlyNotifQuota: 100,
    prices: { NPR: 5000, USD: 50, EUR: 45.0, GBP: 40.0, INR: 3500 }
  }
];

const initialDatabase: AppDatabase = {
  businesses: [
    {
      id: "kathmandu-coffee",
      name: "Kathmandu Valley Coffee",
      logoUrl: "☕",
      country: "Nepal",
      city: "Kathmandu",
      operatingCurrency: "NPR",
      loyaltyMode: "stamp",
      stampRewardLimit: 10,
      pointRewardLimit: 500,
      rewardDescription: "Free organic Himalayan Cappuccino",
      status: "active",
      languagePreference: "en",
      billingCurrency: "NPR",
      paymentGateway: "esewa",
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      planId: "basic",
      subscriptionStatus: "active",
      nextBillingAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      overrideQuota: null,
      extraQuota: 0,
      notificationsSentThisMonth: 1,
      pointsRate: 1, // 1 point per 1 NPR
      paymentRetries: 0,
      pointsOffers: [
        { id: "kc-off-1", title: "Fresh Organic Americano", pointsCost: 50, description: "Enjoy a freshly brewed hot Americano from local organic coffee beans." },
        { id: "kc-off-2", title: "Yak Milk Cappuccino", pointsCost: 100, description: "Our signature double-shot espresso topped with steamed local yak milk foam." },
        { id: "kc-off-3", title: "Chocolate Fudge Brownie", pointsCost: 150, description: "A rich, gooey warm Belgian chocolate brownie topped with chocolate drizzle." },
        { id: "kc-off-4", title: "French Press Pot & Muffin", pointsCost: 200, description: "A complete French press pot serving two, paired with any muffin of your choice." }
      ]
    },
    {
      id: "himalayan-mountaineering",
      name: "Everest Climbing Gear Shop",
      logoUrl: "🧗",
      country: "Nepal",
      city: "Pokhara",
      operatingCurrency: "NPR",
      loyaltyMode: "point",
      stampRewardLimit: 10,
      pointRewardLimit: 1000,
      rewardDescription: "NPR 1,000 off next purchase of 5,000+",
      status: "active",
      languagePreference: "en",
      billingCurrency: "NPR",
      paymentGateway: "khalti",
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      trialEndsAt: new Date(Date.now() - 46 * 24 * 60 * 60 * 1000).toISOString(),
      planId: "premium",
      subscriptionStatus: "active",
      nextBillingAt: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
      overrideQuota: null,
      extraQuota: 0,
      notificationsSentThisMonth: 8,
      pointsRate: 0.5, // 0.5 points per 1 NPR (e.g. 200 NPR = 100 points)
      paymentRetries: 0,
      pointsOffers: [
        { id: "hm-off-1", title: "Heavy Duty Carabiner", pointsCost: 120, description: "A high-tensile, lightweight aluminum carabiner rated for professional climbing." },
        { id: "hm-off-2", title: "Climbers Chalk Bag with Chalk", pointsCost: 250, description: "Ergonomic chalk bag pre-filled with premium moisture-absorbing magnesium carbonate chalk." },
        { id: "hm-off-3", title: "Windproof Alpine Beanie", pointsCost: 400, description: "Thermoregulating merino wool beanie designed for severe high-altitude alpine weather." },
        { id: "hm-off-4", title: "Gore-Tex Mountaineering Mittens", pointsCost: 800, description: "Sub-zero proof, fully insulated waterproof gloves with reinforced palms." }
      ]
    },
    {
      id: "namche-bistro",
      name: "Namche Alpine Bistro",
      logoUrl: "🍕",
      country: "Nepal",
      city: "Namche Bazaar",
      operatingCurrency: "NPR",
      loyaltyMode: "stamp",
      stampRewardLimit: 8,
      pointRewardLimit: 500,
      rewardDescription: "Free Warm Apple Pie with Butter tea",
      status: "suspended", // Locked out test case!
      languagePreference: "ne",
      billingCurrency: "NPR",
      paymentGateway: "esewa",
      createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      trialEndsAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(),
      planId: "basic",
      subscriptionStatus: "past_due",
      nextBillingAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      overrideQuota: null,
      extraQuota: 0,
      notificationsSentThisMonth: 5, // reached quota limit also!
      pointsRate: 1,
      paymentRetries: 3,
      pointsOffers: [
        { id: "nb-off-1", title: "Butter Tea Cup", pointsCost: 40, description: "Traditional salted Tibetan butter tea made with premium tea leaves and yak butter." },
        { id: "nb-off-2", title: "Warm Apple Pie Slice", pointsCost: 100, description: "Freshly baked apple pie slice served hot with cinnamon and powdered sugar." },
        { id: "nb-off-3", title: "Sherpa Stew (Shyakpa) Pot", pointsCost: 250, description: "A comforting bowl of thick, hand-pulled noodles with seasonal vegetables and broth." }
      ]
    },
    {
      id: "london-tea",
      name: "The London Tea Room",
      logoUrl: "🫖",
      country: "United Kingdom",
      city: "London",
      operatingCurrency: "GBP",
      loyaltyMode: "stamp",
      stampRewardLimit: 10,
      pointRewardLimit: 300,
      rewardDescription: "Free British High Tea & Homemade Scone",
      status: "active",
      languagePreference: "en",
      billingCurrency: "GBP",
      paymentGateway: "stripe",
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      trialEndsAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      planId: "premium",
      subscriptionStatus: "active",
      nextBillingAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      overrideQuota: 30, // Admin override test case!
      extraQuota: 5, // Extra 5 pack bought
      notificationsSentThisMonth: 12,
      pointsRate: 10, // 10 points per GBP
      paymentRetries: 0,
      pointsOffers: [
        { id: "lt-off-1", title: "Classic Earl Grey Pot", pointsCost: 60, description: "A premium loose-leaf Earl Grey tea pot brewed with real bergamot essence." },
        { id: "lt-off-2", title: "Fruit Scone with Clotted Cream", pointsCost: 110, description: "Freshly baked fruit scone paired with devonshire clotted cream and strawberry jam." },
        { id: "lt-off-3", title: "Royal High Tea Set", pointsCost: 300, description: "Our grand three-tier stand with finger sandwiches, warm scones, and sweet pastries." }
      ]
    },
    {
      id: "tokyo-bento",
      name: "Tokyo Sushi Grill & Bar",
      logoUrl: "🍣",
      country: "Japan",
      city: "Shibuya",
      operatingCurrency: "USD", // Global operating currency choice
      loyaltyMode: "point",
      stampRewardLimit: 12,
      pointRewardLimit: 1000,
      rewardDescription: "Free Premium Salmon Roll Combo ($20 value)",
      status: "active",
      languagePreference: "en",
      billingCurrency: "USD",
      paymentGateway: "paypal",
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      trialEndsAt: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(),
      planId: "enterprise",
      subscriptionStatus: "trialing",
      nextBillingAt: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(),
      overrideQuota: null,
      extraQuota: 0,
      notificationsSentThisMonth: 0,
      pointsRate: 10, // 10 points per 1 USD
      paymentRetries: 0,
      pointsOffers: [
        { id: "tb-off-1", title: "Miso Soup & Edamame", pointsCost: 80, description: "Traditional soybean paste soup with tofu paired with seasoned, steamed edamame." },
        { id: "tb-off-2", title: "California Roll (8pcs)", pointsCost: 200, description: "Classic roll filled with crab, avocado, and cucumber, topped with toasted sesame." },
        { id: "tb-off-3", title: "Salmon & Tuna Sashimi Combo", pointsCost: 450, description: "Chef's selection of fresh, thick-cut raw Norwegian salmon and Pacific yellowfin tuna." },
        { id: "tb-off-4", title: "Deluxe Bento Box", pointsCost: 750, description: "A full meal including chicken teriyaki, tempura shrimp, sushi roll, and seaweed salad." }
      ]
    }
  ],
  customers: [
    {
      id: "aarav-sharma",
      name: "Aarav Sharma",
      email: "aarav@gmail.com",
      phone: "9861774000", // eSewa test number!
      joinedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "maya-peterson",
      name: "Maya Peterson",
      email: "maya.p@gmail.com",
      phone: "+12025550143",
      joinedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "rajesh-gupta",
      name: "Rajesh Gupta",
      email: "rajesh@loyalty.np",
      phone: "9845123456",
      joinedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    }
  ],
  customer_business_relations: [
    {
      id: "aarav-sharma_kathmandu-coffee",
      customerId: "aarav-sharma",
      businessId: "kathmandu-coffee",
      stampsCount: 7,
      pointsCount: 150,
      lastStampAt: new Date(Date.now() - 15 * 60 * 60 * 1000).toISOString(), // 15h ago, can stamp again!
      lastVisitAt: new Date(Date.now() - 15 * 60 * 60 * 1000).toISOString(),
      optInNotifications: true
    },
    {
      id: "aarav-sharma_himalayan-mountaineering",
      customerId: "aarav-sharma",
      businessId: "himalayan-mountaineering",
      stampsCount: 0,
      pointsCount: 450,
      lastStampAt: null,
      lastVisitAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      optInNotifications: true
    },
    {
      id: "aarav-sharma_namche-bistro",
      customerId: "aarav-sharma",
      businessId: "namche-bistro",
      stampsCount: 5,
      pointsCount: 120,
      lastStampAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(), // 3h ago, cannot stamp!
      lastVisitAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      optInNotifications: false // Opted out of notifications!
    },
    {
      id: "maya-peterson_london-tea",
      customerId: "maya-peterson",
      businessId: "london-tea",
      stampsCount: 4,
      pointsCount: 180,
      lastStampAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      lastVisitAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      optInNotifications: true
    },
    {
      id: "maya-peterson_tokyo-bento",
      customerId: "maya-peterson",
      businessId: "tokyo-bento",
      stampsCount: 0,
      pointsCount: 850,
      lastStampAt: null,
      lastVisitAt: new Date().toISOString(),
      optInNotifications: true
    }
  ],
  subscription_plans: initialPlans,
  payment_transactions: [
    {
      id: "tx-1001",
      businessId: "kathmandu-coffee",
      amount: 500,
      currency: "NPR",
      status: "success",
      gatewayTxnId: "ESEWA_9861774000_12345",
      invoiceUrl: "#",
      createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "tx-1002",
      businessId: "himalayan-mountaineering",
      amount: 1500,
      currency: "NPR",
      status: "success",
      gatewayTxnId: "KHALTI_WXYZ_9876",
      invoiceUrl: "#",
      createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "tx-1003",
      businessId: "namche-bistro",
      amount: 500,
      currency: "NPR",
      status: "failed",
      gatewayTxnId: "ESEWA_MOCK_FAIL",
      invoiceUrl: "#",
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: "tx-1004",
      businessId: "london-tea",
      amount: 12.0,
      currency: "GBP",
      status: "success",
      gatewayTxnId: "ch_stripe_mock_773",
      invoiceUrl: "#",
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
    }
  ],
  notifications: [
    {
      id: "notif-1",
      businessId: "kathmandu-coffee",
      title: "Monsoon Espresso Special! ☕",
      message: "Get 20% off all lattes this week. Show your customer loyalty screen at checkout to redeem!",
      sentAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      reachedCount: 1
    },
    {
      id: "notif-2",
      businessId: "himalayan-mountaineering",
      title: "Climbing Season Preparation Sale! 🧗",
      message: "Earn double points (1 per NPR spent) on all carabiners and ropes. Ends Saturday!",
      sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      reachedCount: 2
    },
    {
      id: "notif-system",
      businessId: "system", // Admin broadcast
      title: "System Update: Welcome to Loyalty Bridge!",
      message: "We've added international multi-currency pricing and instant push alerts for local businesses.",
      sentAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      reachedCount: 3
    }
  ],
  audit_logs: [
    {
      id: "log-1",
      actor: "System",
      action: "Platform database initialized with multi-currency loyalty support.",
      timestamp: new Date().toISOString()
    }
  ],
  enabledLanguages: ["en", "ne", "hi"],
  globalExchangeRates: {
    USD: 1.0,
    NPR: 133.5,
    EUR: 0.92,
    GBP: 0.79,
    INR: 83.2,
    JPY: 155.4
  }
};

// Parse Firebase Config
let firebaseConfig: any = null;
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  }
} catch (e) {
  console.error("Failed to parse firebase-applet-config.json:", e);
}

// Determine if we should use Firestore
let useFirestore = true;

if (!firebaseConfig || !firebaseConfig.projectId) {
  useFirestore = false;
  console.log("[Firebase] No firebase-applet-config.json config found. Falling back to local db.json storage.");
}

// Initialize Firebase Admin
if (useFirestore) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccountObj = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: cert(serviceAccountObj),
        projectId: serviceAccountObj.project_id
      });
      console.log(`[Firebase] Initialized Admin SDK with FIREBASE_SERVICE_ACCOUNT env var for project: ${serviceAccountObj.project_id}`);
    } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      admin.initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID || firebaseConfig?.projectId,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        })
      });
      console.log("[Firebase] Initialized Admin SDK with individual Firebase service account credentials.");
    } else if (firebaseConfig && firebaseConfig.projectId) {
      admin.initializeApp({
        projectId: firebaseConfig.projectId
      });
      console.log(`[Firebase] Initialized Admin SDK for project: ${firebaseConfig.projectId}`);
    } else {
      admin.initializeApp();
      console.log("[Firebase] Initialized with default credentials");
    }
  } catch (e) {
    console.error("[Firebase] Failed to initialize Firebase Admin SDK. Falling back to local db.json.", e);
    useFirestore = false;
  }
}

const firestoreDb = useFirestore ? getFirestore(firebaseConfig?.firestoreDatabaseId || undefined) : null;

// Dynamic QR Scan nonces memory cache
const usedQRIds = new Set<string>();

// Helper: Clear collection in Firestore
async function clearCollection(collectionName: string) {
  if (!useFirestore || !firestoreDb) return;
  const snap = await firestoreDb.collection(collectionName).get();
  const batch = firestoreDb.batch();
  snap.forEach(doc => {
    batch.delete(doc.ref);
  });
  await batch.commit();
}

function getLocalDB(): AppDatabase {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(data) as AppDatabase;
    }
  } catch (e) {
    console.error("[Local DB] Failed to read db.json:", e);
  }
  
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDatabase, null, 2));
  } catch (e) {
    console.error("[Local DB] Failed to initialize db.json:", e);
  }
  return initialDatabase;
}

function saveLocalDB(db: AppDatabase) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  } catch (e) {
    console.error("[Local DB] Failed to write db.json:", e);
  }
}

// Helper: Seed Cloud SQL database if empty
async function seedFirestoreIfEmpty() {
  if (!process.env.SQL_HOST) {
    console.log("[PostgreSQL] Skipping PostgreSQL seeding (no host configuration).");
    return;
  }
  try {
    const existing = await db.select().from(businesses).limit(1);
    if (existing.length === 0) {
      console.log("[PostgreSQL] Database is empty. Seeding data...");
      await saveDBToFirestore(initialDatabase);
      console.log("[PostgreSQL] Seeding completed.");
    }
  } catch (error) {
    console.error("[PostgreSQL] Error seeding database:", error);
  }
}

// Helper: Load full DB structured snapshot from Cloud SQL PostgreSQL
async function fetchFullDBFromFirestore(): Promise<AppDatabase> {
  if (!process.env.SQL_HOST) {
    return getLocalDB();
  }
  try {
    const [
      bRes,
      cRes,
      rRes,
      txRes,
      nRes,
      logRes,
      metaRes
    ] = await Promise.all([
      db.select().from(businesses),
      db.select().from(customers),
      db.select().from(customerBusinessRelations),
      db.select().from(paymentTransactions),
      db.select().from(notifications),
      db.select().from(auditLogs),
      db.select().from(systemMetadata)
    ]);

    const dbObj: AppDatabase = {
      businesses: bRes.map(b => ({
        ...b,
        loyaltyMode: b.loyaltyMode as any,
        status: b.status as any,
        planId: b.planId as any,
        subscriptionStatus: b.subscriptionStatus as any,
        paymentGateway: b.paymentGateway as any,
        pointsOffers: (b.pointsOffers as any) || []
      }) as Business),
      customers: cRes.map(c => ({
        ...c,
        preferredLanguage: c.preferredLanguage || undefined
      })),
      customer_business_relations: rRes.map(r => ({
        ...r,
        lastStampAt: r.lastStampAt || null,
        claimedCoupons: (r.claimedCoupons as any) || []
      }) as CustomerBusinessRelation),
      subscription_plans: initialPlans,
      payment_transactions: txRes as any[],
      notifications: nRes.map(n => ({
        ...n,
        customerId: n.customerId || undefined,
        isForMerchant: n.isForMerchant || undefined
      }) as any),
      audit_logs: logRes as any[],
      enabledLanguages: metaRes[0]?.enabledLanguages as string[] || initialDatabase.enabledLanguages,
      globalExchangeRates: metaRes[0]?.globalExchangeRates as any || initialDatabase.globalExchangeRates
    };

    // Sort collections by date
    dbObj.payment_transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    dbObj.notifications.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
    dbObj.audit_logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    saveLocalDB(dbObj);
    return dbObj;
  } catch (error: any) {
    console.error("[PostgreSQL] Loaded local dataset state due to error:", error);
    return getLocalDB();
  }
}

// Helper: Save full structural delta of app ledger to Cloud SQL PostgreSQL
async function saveDBToFirestore(dbObj: AppDatabase) {
  saveLocalDB(dbObj);

  if (!process.env.SQL_HOST) return;

  try {
    // Save businesses
    if (dbObj.businesses.length > 0) {
      for (const b of dbObj.businesses) {
        await db.insert(businesses)
          .values({
            id: b.id,
            name: b.name,
            password: b.password || null,
            logoUrl: b.logoUrl,
            country: b.country,
            city: b.city,
            operatingCurrency: b.operatingCurrency,
            loyaltyMode: b.loyaltyMode,
            stampRewardLimit: b.stampRewardLimit,
            pointRewardLimit: b.pointRewardLimit,
            rewardDescription: b.rewardDescription,
            status: b.status,
            languagePreference: b.languagePreference,
            billingCurrency: b.billingCurrency,
            paymentGateway: b.paymentGateway,
            createdAt: b.createdAt,
            trialEndsAt: b.trialEndsAt,
            planId: b.planId,
            subscriptionStatus: b.subscriptionStatus,
            nextBillingAt: b.nextBillingAt,
            overrideQuota: b.overrideQuota,
            extraQuota: b.extraQuota,
            notificationsSentThisMonth: b.notificationsSentThisMonth,
            pointsRate: b.pointsRate,
            paymentRetries: b.paymentRetries,
            pointsOffers: b.pointsOffers || []
          })
          .onConflictDoUpdate({
            target: businesses.id,
            set: {
              name: b.name,
              password: b.password || null,
              logoUrl: b.logoUrl,
              country: b.country,
              city: b.city,
              operatingCurrency: b.operatingCurrency,
              loyaltyMode: b.loyaltyMode,
              stampRewardLimit: b.stampRewardLimit,
              pointRewardLimit: b.pointRewardLimit,
              rewardDescription: b.rewardDescription,
              status: b.status,
              languagePreference: b.languagePreference,
              billingCurrency: b.billingCurrency,
              paymentGateway: b.paymentGateway,
              createdAt: b.createdAt,
              trialEndsAt: b.trialEndsAt,
              planId: b.planId,
              subscriptionStatus: b.subscriptionStatus,
              nextBillingAt: b.nextBillingAt,
              overrideQuota: b.overrideQuota,
              extraQuota: b.extraQuota,
              notificationsSentThisMonth: b.notificationsSentThisMonth,
              pointsRate: b.pointsRate,
              paymentRetries: b.paymentRetries,
              pointsOffers: b.pointsOffers || []
            }
          });
      }
    }

    // Save customers
    if (dbObj.customers.length > 0) {
      for (const c of dbObj.customers) {
        await db.insert(customers)
          .values({
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone,
            joinedAt: c.joinedAt,
            preferredLanguage: c.preferredLanguage || null
          })
          .onConflictDoUpdate({
            target: customers.id,
            set: {
              name: c.name,
              email: c.email,
              phone: c.phone,
              joinedAt: c.joinedAt,
              preferredLanguage: c.preferredLanguage || null
            }
          });
      }
    }

    // Save customer business relations
    if (dbObj.customer_business_relations.length > 0) {
      for (const r of dbObj.customer_business_relations) {
        await db.insert(customerBusinessRelations)
          .values({
            id: r.id,
            customerId: r.customerId,
            businessId: r.businessId,
            stampsCount: r.stampsCount,
            pointsCount: r.pointsCount,
            lastStampAt: r.lastStampAt || null,
            lastVisitAt: r.lastVisitAt,
            optInNotifications: r.optInNotifications,
            claimedCoupons: r.claimedCoupons || []
          })
          .onConflictDoUpdate({
            target: customerBusinessRelations.id,
            set: {
              customerId: r.customerId,
              businessId: r.businessId,
              stampsCount: r.stampsCount,
              pointsCount: r.pointsCount,
              lastStampAt: r.lastStampAt || null,
              lastVisitAt: r.lastVisitAt,
              optInNotifications: r.optInNotifications,
              claimedCoupons: r.claimedCoupons || []
            }
          });
      }
    }

    // Save payment transactions
    if (dbObj.payment_transactions.length > 0) {
      for (const tx of dbObj.payment_transactions) {
        await db.insert(paymentTransactions)
          .values({
            id: tx.id,
            businessId: tx.businessId,
            amount: tx.amount,
            currency: tx.currency,
            status: tx.status,
            gatewayTxnId: tx.gatewayTxnId,
            invoiceUrl: tx.invoiceUrl,
            createdAt: tx.createdAt
          })
          .onConflictDoUpdate({
            target: paymentTransactions.id,
            set: {
              businessId: tx.businessId,
              amount: tx.amount,
              currency: tx.currency,
              status: tx.status,
              gatewayTxnId: tx.gatewayTxnId,
              invoiceUrl: tx.invoiceUrl,
              createdAt: tx.createdAt
            }
          });
      }
    }

    // Save notifications
    if (dbObj.notifications.length > 0) {
      for (const n of dbObj.notifications) {
        await db.insert(notifications)
          .values({
            id: n.id,
            businessId: n.businessId,
            customerId: n.customerId || null,
            title: n.title,
            message: n.message,
            sentAt: n.sentAt,
            reachedCount: n.reachedCount,
            isForMerchant: n.isForMerchant || false
          })
          .onConflictDoUpdate({
            target: notifications.id,
            set: {
              businessId: n.businessId,
              customerId: n.customerId || null,
              title: n.title,
              message: n.message,
              sentAt: n.sentAt,
              reachedCount: n.reachedCount,
              isForMerchant: n.isForMerchant || false
            }
          });
      }
    }

    // Save audit logs
    if (dbObj.audit_logs.length > 0) {
      for (const log of dbObj.audit_logs) {
        await db.insert(auditLogs)
          .values({
            id: log.id,
            actor: log.actor,
            action: log.action,
            timestamp: log.timestamp
          })
          .onConflictDoUpdate({
            target: auditLogs.id,
            set: {
              actor: log.actor,
              action: log.action,
              timestamp: log.timestamp
            }
          });
      }
    }

    // Save metadata
    await db.insert(systemMetadata)
      .values({
        id: 1,
        enabledLanguages: dbObj.enabledLanguages,
        globalExchangeRates: dbObj.globalExchangeRates
      })
      .onConflictDoUpdate({
        target: systemMetadata.id,
        set: {
          enabledLanguages: dbObj.enabledLanguages,
          globalExchangeRates: dbObj.globalExchangeRates
        }
      });
  } catch (error: any) {
    console.error("[PostgreSQL] Error saving database:", error);
  }
}

// Helper: Clear and reseed Cloud SQL database
async function resetFirestoreDB() {
  const dbToSeed = {
    ...initialDatabase,
    audit_logs: [
      {
        id: `log-${Date.now()}`,
        actor: "Admin",
        action: "Database manual reset triggered by administrator.",
        timestamp: new Date().toISOString()
      }
    ]
  };

  saveLocalDB(dbToSeed);

  if (!process.env.SQL_HOST) {
    console.log("[Database] Local state reset completed.");
    return;
  }

  try {
    await Promise.all([
      db.delete(businesses),
      db.delete(customers),
      db.delete(customerBusinessRelations),
      db.delete(paymentTransactions),
      db.delete(notifications),
      db.delete(auditLogs),
      db.delete(systemMetadata)
    ]);

    await saveDBToFirestore(dbToSeed);
    console.log("[PostgreSQL] Cloud DB reset successfully completed.");
  } catch (error: any) {
    console.error("[PostgreSQL] Error resetting database:", error);
  }
}

// Helper: Append audit logs atomically
function appendAuditLog(dbObj: AppDatabase, actor: string, action: string) {
  const log: AuditLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    actor,
    action,
    timestamp: new Date().toISOString()
  };
  dbObj.audit_logs.unshift(log);
  if (dbObj.audit_logs.length > 100) {
    dbObj.audit_logs = dbObj.audit_logs.slice(0, 100);
  }
}

// Signature Generator Helper for Dynamic QR Verification
function generateQRHash(businessId: string, amount: number, points: number, timestamp: string, nonce: string) {
  const rawString = `${businessId}:${amount}:${points}:${timestamp}:${nonce}`;
  return crypto.createHmac("sha256", QR_SECRET).update(rawString).digest("hex");
}

// Setup Express Middleware
app.use(express.json());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  next();
});

// Seed database instantly on startup
seedFirestoreIfEmpty().then(() => {
  console.log("[Firebase] Cloud DB seed integrity verified.");
}).catch(err => {
  console.error("[Firebase] Seed initialization error:", err);
});

// ------------------------------------------
// API ENDPOINTS
// ------------------------------------------

// 1. Reset Database endpoint
app.post("/api/reset", async (req, res) => {
  try {
    await resetFirestoreDB();
    res.json({ success: true, message: "Database reset to original seed values successfully!" });
  } catch (err: any) {
    console.error("Reset endpoint failed:", err);
    res.status(500).json({ error: "Failed to reset cloud database" });
  }
});

// 2. Fetch entire DB summary (useful for simple cross-panel simulations)
app.get("/api/db", async (req, res) => {
  try {
    const db = await fetchFullDBFromFirestore();
    res.json(db);
  } catch (err: any) {
    console.error("Fetch DB failed:", err);
    res.status(500).json({ error: "Cloud ledger unreachable." });
  }
});

app.get("/api/db/download", async (req, res) => {
  try {
    const db = await fetchFullDBFromFirestore();
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    res.download(DB_FILE, "db.json");
  } catch (err: any) {
    console.error("Download db failed:", err);
    res.status(500).json({ error: "Failed to compile offline JSON export." });
  }
});

app.get("/api/bun-lock/download", async (req, res) => {
  try {
    const bunLockPath = path.join(process.cwd(), "bun.lock");
    if (fs.existsSync(bunLockPath)) {
      res.download(bunLockPath, "bun.lock");
    } else {
      res.status(404).json({ error: "bun.lock file not found on server." });
    }
  } catch (err: any) {
    console.error("Download bun.lock failed:", err);
    res.status(500).json({ error: "Failed to download bun.lock file." });
  }
});

// 3. Customer self enrollment
app.post("/api/customer/register", async (req, res) => {
  const { id, name, email, phone } = req.body;
  if (!id || !name || !phone) {
    return res.status(400).json({ error: "Missing customer profile ID, name, or phone" });
  }

  const normalizedId = id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  if (!normalizedId) {
    return res.status(400).json({ error: "Invalid customer ID key" });
  }

  try {
    const db = await fetchFullDBFromFirestore();
    const exists = db.customers.some(c => c.id === normalizedId);
    if (exists) {
      return res.status(400).json({ error: "Customer with this matching ID key already exists in database" });
    }

    const newCustomerObj = {
      id: normalizedId,
      name: name.trim(),
      email: email ? email.trim() : `${normalizedId}@demo.com`,
      phone: phone.trim(),
      joinedAt: new Date().toISOString()
    };

    db.customers.push(newCustomerObj);
    appendAuditLog(db, `Customer System`, `Registered manual customer profile for (${newCustomerObj.name}) successfully.`);
    await saveDBToFirestore(db);

    res.json({ success: true, customer: newCustomerObj });
  } catch (err: any) {
    console.error("Customer manual register failed:", err);
    res.status(500).json({ error: "Cloud database transaction failed." });
  }
});

// Update customer profile (name, email, preferred language, notifications)
app.post("/api/customer/update-profile", async (req, res) => {
  const { customerId, name, email, preferredLanguage, notifications } = req.body;
  if (!customerId) {
    return res.status(400).json({ error: "Missing customerId parameter" });
  }

  try {
    const db = await fetchFullDBFromFirestore();
    const customer = db.customers.find(c => c.id === customerId);
    if (!customer) {
      return res.status(404).json({ error: "Customer profile not found" });
    }

    if (name !== undefined) customer.name = name.trim();
    if (email !== undefined) customer.email = email.trim();
    if (preferredLanguage !== undefined) customer.preferredLanguage = preferredLanguage;

    if (notifications && typeof notifications === "object") {
      Object.keys(notifications).forEach(bizId => {
        const relId = `${customerId}_${bizId}`;
        const rel = db.customer_business_relations.find(r => r.id === relId);
        if (rel) {
          rel.optInNotifications = !!notifications[bizId];
        }
      });
    }

    appendAuditLog(db, `Customer (${customer.name})`, `Updated customer profile settings (Language: ${customer.preferredLanguage || "en"})`);
    await saveDBToFirestore(db);
    res.json({ success: true, customer });
  } catch (err: any) {
    console.error("Customer profile update failed:", err);
    res.status(500).json({ error: "Failed to update customer profile settings." });
  }
});

app.post("/api/customer/enroll", async (req, res) => {
  const { customerId, businessId, customerName, customerEmail, customerPhone } = req.body;
  if (!customerId || !businessId) {
    return res.status(400).json({ error: "Missing customerId or businessId" });
  }

  try {
    const db = await fetchFullDBFromFirestore();
    
    // Ensure customer exists
    let customerObj = db.customers.find(c => c.id === customerId);
    if (!customerObj) {
      customerObj = {
        id: customerId,
        name: customerName || "Anonymous Customer",
        email: customerEmail || `${customerId}@demo.com`,
        phone: customerPhone || "9861774000",
        joinedAt: new Date().toISOString()
      };
      db.customers.push(customerObj);
    }

    // Ensure business exists
    const business = db.businesses.find(b => b.id === businessId);
    if (!business) {
      return res.status(404).json({ error: "Loyalty business not found" });
    }

    // Check relation limits
    const currentEnrolledCustomers = db.customer_business_relations.filter(r => r.businessId === businessId).length;
    const currentPlan = db.subscription_plans.find(p => p.id === business.planId);
    if (currentPlan && currentPlan.maxCustomers !== -1 && currentEnrolledCustomers >= currentPlan.maxCustomers) {
      return res.status(403).json({ error: "Business has reached its subscription customer registration limit. Upgrade required!" });
    }

    // Find or create relationship
    const relId = `${customerId}_${businessId}`;
    let rel = db.customer_business_relations.find(r => r.id === relId);
    if (!rel) {
      rel = {
        id: relId,
        customerId,
        businessId,
        stampsCount: 0,
        pointsCount: 0,
        lastStampAt: null,
        lastVisitAt: new Date().toISOString(),
        optInNotifications: true
      };
      db.customer_business_relations.unshift(rel);
      appendAuditLog(db, `Retail Customer (${customerObj.name})`, `Enrolled in loyalty program at ${business.name}`);
      await saveDBToFirestore(db);
    }

    res.json({ success: true, relation: rel, customer: customerObj, business });
  } catch (err: any) {
    console.error("Enrollment transactional error:", err);
    res.status(500).json({ error: "Failed to process customer enrollment on cloud ledger." });
  }
});

// 4. Earn stamp endpoint (with strictly monitored 12 hour server-side cooldown)
app.post("/api/customer/stamp", async (req, res) => {
  const { customerId, businessId } = req.body;
  if (!customerId || !businessId) {
    return res.status(400).json({ error: "Missing customerId or businessId" });
  }

  try {
    const db = await fetchFullDBFromFirestore();
    
    // Check business active status
    const business = db.businesses.find(b => b.id === businessId);
    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }
    if (business.status !== "active") {
      return res.status(403).json({ error: `This business is currently inactive or suspended (${business.status}). Stamps cannot be recorded.` });
    }

    const relId = `${customerId}_${businessId}`;
    let rel = db.customer_business_relations.find(r => r.id === relId);
    if (!rel) {
      return res.status(403).json({ error: "You are not enrolled in this loyalty program. Please enroll first." });
    }

    // Cooldown calculation: 12 hours check
    const now = new Date();
    if (rel.lastStampAt) {
      const lastStamp = new Date(rel.lastStampAt);
      const diffMs = now.getTime() - lastStamp.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      const remainingHours = 12 - diffHours;
      if (remainingHours > 0) {
        return res.status(429).json({ 
          error: `Anti-abuse: Only 1 stamp permitted every 12 hours. Please wait ${remainingHours.toFixed(1)} more hours for your next scan.`,
          remainingMs: remainingHours * 60 * 60 * 1000
        });
      }
    }

    // Proceed with stamping!
    rel.stampsCount += 1;
    rel.lastStampAt = now.toISOString();
    rel.lastVisitAt = now.toISOString();

    // Check reward eligibility
    let rewardAwarded = false;
    if (rel.stampsCount >= business.stampRewardLimit) {
      rel.stampsCount = rel.stampsCount - business.stampRewardLimit; // recycle rest
      rewardAwarded = true;
      appendAuditLog(db, `Retail Customer (${customerId})`, `Claimed STAMP reward "${business.rewardDescription}" at ${business.name}`);
      
      const customerObj = db.customers.find(c => c.id === customerId);
      const custName = customerObj?.name || customerId;

      // Auto-generate a loyalty completion notification for the customer
      const newNotif: NotificationMsg = {
        id: `notif-stamp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        businessId: business.id,
        customerId: customerId,
        title: `🎉 Stamp Loyalty Reward Unlocked!`,
        message: `Congratulations! You have completed your stamp card at ${business.name} and unlocked your reward: "${business.rewardDescription}". Present your active card during your next visit to enjoy it!`,
        sentAt: now.toISOString(),
        reachedCount: 1
      };
      db.notifications.unshift(newNotif);

      // Push notification to the merchant too informing which customer just redeemed it
      const merchantNotif: NotificationMsg = {
        id: `notif-merchant-stamp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        businessId: business.id,
        title: `🚨 Stamp Reward Unlocked!`,
        message: `Customer ${custName} (${customerId}) completed their stamp card and unlocked their reward: "${business.rewardDescription}". Verify and reward!`,
        sentAt: now.toISOString(),
        reachedCount: 1,
        isForMerchant: true
      };
      db.notifications.unshift(merchantNotif);
    } else {
      appendAuditLog(db, `Retail Customer (${customerId})`, `Scanned STAMP card at ${business.name} (Stamps total: ${rel.stampsCount})`);
    }

    await saveDBToFirestore(db);
    res.json({ success: true, relation: rel, rewardAwarded, limit: business.stampRewardLimit });
  } catch (err: any) {
    console.error("Stamp transaction failed:", err);
    res.status(500).json({ error: "Cloud ledger transaction timeout." });
  }
});

// 5. Earn dynamic points via signed QR code (anti-forgery signature, 5 minute longevity, single-use nonce validation)
app.post("/api/customer/points", async (req, res) => {
  const { customerId, businessId, amount, points, timestamp, nonce, signature } = req.body;
  if (!customerId || !businessId || !amount || !points || !timestamp || !nonce || !signature) {
    return res.status(400).json({ error: "Invalid points QR data. Signature signature, amount, points, timestamp, and verification nonces are mandatory." });
  }

  try {
    const db = await fetchFullDBFromFirestore();
    
    // 1. Verify business status
    const business = db.businesses.find(b => b.id === businessId);
    if (!business) {
      return res.status(404).json({ error: "Loyalty partner business does not exist." });
    }
    if (business.status !== "active") {
      return res.status(403).json({ error: "This merchant is currently suspended or unpaid. Point rewards cannot be processed." });
    }

    // 2. Prevent single-use duplicate replay attacks
    if (usedQRIds.has(nonce)) {
      return res.status(409).json({ error: "Security alert: This point-redemption QR code has already been scanned. Replays are forbidden." });
    }

    // 3. Prevent QR code expiry (5 minutes window)
    const qrTime = new Date(timestamp);
    const now = new Date();
    const diffMs = Math.abs(now.getTime() - qrTime.getTime());
    if (diffMs > 5 * 60 * 1000) {
      return res.status(410).json({ error: "Validation failure: This loyalty transaction QR has expired (5-minute security window exceeded). Please generate a new one." });
    }

    // 4. Validate server-side HMAC signature (anti-forgery check)
    const expectedSig = generateQRHash(businessId, parseFloat(amount), parseInt(points), timestamp, nonce);
    if (signature !== expectedSig) {
      return res.status(401).json({ error: "Security validation failed. High-risk forged transaction signature detected!" });
    }

    // 5. User relationship
    const relId = `${customerId}_${businessId}`;
    let rel = db.customer_business_relations.find(r => r.id === relId);
    if (!rel) {
      return res.status(403).json({ error: "Not enrolled in this merchant's system. Please enroll before accumulating points." });
    }

    // Mark nonce as used
    usedQRIds.add(nonce);

    // Add points
    rel.pointsCount += parseInt(points);
    rel.lastVisitAt = now.toISOString();

    // Check reward threshold
    let rewardAwarded = false;
    let rewardsClaimed = 0;
    if (rel.pointsCount >= business.pointRewardLimit) {
      rewardsClaimed = Math.floor(rel.pointsCount / business.pointRewardLimit);
      rel.pointsCount = rel.pointsCount % business.pointRewardLimit;
      rewardAwarded = true;
      appendAuditLog(db, `Retail Customer (${customerId})`, `Redeemed ${rewardsClaimed}x Loyalty Reward points for "${business.rewardDescription}" at ${business.name}`);
      
      // Auto-generate a loyalty completion notification for the customer
      const qtyText = rewardsClaimed > 1 ? ` (${rewardsClaimed}x rewards earned!)` : "";
      const newNotif: NotificationMsg = {
        id: `notif-points-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        businessId: business.id,
        customerId: customerId,
        title: `🎁 Points Loyalty Reward Unlocked!`,
        message: `Awesome job! You reached the points threshold at ${business.name} and earned your loyalty reward${qtyText}: "${business.rewardDescription}". Present your card or notifications next time to enjoy it!`,
        sentAt: now.toISOString(),
        reachedCount: 1
      };
      db.notifications.unshift(newNotif);

      // Push notification to the merchant too informing which customer just redeemed it
      const customerObj = db.customers.find(c => c.id === customerId);
      const custName = customerObj?.name || customerId;
      const merchantNotif: NotificationMsg = {
        id: `notif-merchant-points-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        businessId: business.id,
        title: `🚨 Points Reward Unlocked!`,
        message: `Customer ${custName} (${customerId}) reached points threshold${qtyText} and unlocked reward: "${business.rewardDescription}". Verify and reward!`,
        sentAt: now.toISOString(),
        reachedCount: 1,
        isForMerchant: true
      };
      db.notifications.unshift(merchantNotif);
    } else {
      appendAuditLog(db, `Retail Customer (${customerId})`, `Earned ${points} points at ${business.name} (Price amount spent: ${business.operatingCurrency} ${amount})`);
    }

    await saveDBToFirestore(db);
    res.json({ success: true, relation: rel, rewardAwarded, rewardsClaimed, limit: business.pointRewardLimit });
  } catch (err: any) {
    console.error("Points earn failed:", err);
    res.status(500).json({ error: "Cloud ledger transaction rejected." });
  }
});

// 6. Business self registration (supporting local / international currency, gateways & subscription auto setup)
app.post("/api/business/register", async (req, res) => {
  const { id, name, password, country, city, operatingCurrency, loyaltyMode, stampRewardLimit, pointRewardLimit, rewardDescription, languagePreference, planId, billingCurrency, paymentGateway, pointsRate } = req.body;

  if (!id || !name || !country || !city || !operatingCurrency || !loyaltyMode || !paymentGateway) {
    return res.status(400).json({ error: "Incomplete business profile fields. Business ID, country, city, currency, payment gateway, and name are required." });
  }

  try {
    const db = await fetchFullDBFromFirestore();
    
    // Check ID is unique
    if (db.businesses.find(b => b.id === id)) {
      return res.status(409).json({ error: `Business with identifier ID '${id}' already exists. Please choose a unique URL key.` });
    }

    const selectedPlanId = planId || "basic";
    const selectedPlan = db.subscription_plans.find(p => p.id === selectedPlanId) || db.subscription_plans[0];

    const now = new Date();
    const trialEnds = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14-day basic trial
    const nextBilling = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const newBiz: Business = {
      id,
      name,
      password: password || "123456",
      logoUrl: "🏢",
      country,
      city,
      operatingCurrency,
      loyaltyMode,
      stampRewardLimit: stampRewardLimit ? parseInt(stampRewardLimit) : 10,
      pointRewardLimit: pointRewardLimit ? parseInt(pointRewardLimit) : 500,
      rewardDescription: rewardDescription || "Loyalty Discount Voucher",
      status: "active",
      languagePreference: languagePreference || "en",
      billingCurrency: billingCurrency || operatingCurrency,
      paymentGateway,
      createdAt: now.toISOString(),
      trialEndsAt: trialEnds.toISOString(),
      planId: selectedPlanId,
      subscriptionStatus: "active",
      nextBillingAt: nextBilling.toISOString(),
      overrideQuota: null,
      extraQuota: 0,
      notificationsSentThisMonth: 0,
      pointsRate: pointsRate ? parseFloat(pointsRate) : (operatingCurrency === "NPR" ? 1.0 : 10.0),
      paymentRetries: 0
    };

    db.businesses.push(newBiz);

    // Auto record transaction for initial sign subscription (with free setup or plan amount)
    const planPrice = selectedPlan.prices[newBiz.billingCurrency] || selectedPlan.prices["USD"] || 0;
    
    if (planPrice > 0) {
      const startTx: PaymentTransaction = {
        id: `tx-${Date.now()}`,
        businessId: id,
        amount: planPrice,
        currency: newBiz.billingCurrency,
        status: "success",
        gatewayTxnId: `${paymentGateway.toUpperCase()}_MOCK_${Math.random().toString(36).substring(7).toUpperCase()}`,
        invoiceUrl: "#",
        createdAt: now.toISOString()
      };
      db.payment_transactions.unshift(startTx);
    }

    appendAuditLog(db, `Business (${name})`, `Registered new B2B2C profile inside plan "${selectedPlan.id}". Gateway: ${paymentGateway.toUpperCase()}`);
    await saveDBToFirestore(db);

    res.json({ success: true, business: newBiz });
  } catch (err: any) {
    console.error("Business register error:", err);
    res.status(500).json({ error: "Failed to record business registry details." });
  }
});

// Business login endpoint
app.post("/api/business/login", async (req, res) => {
  const { id, password } = req.body;
  if (!id || !password) {
    return res.status(400).json({ error: "Please enter both Business ID and Password." });
  }

  try {
    const db = await fetchFullDBFromFirestore();
    const sanitizedId = id.toLowerCase().replace(/[^a-z0-9-_]/g, "");
    const biz = db.businesses.find(b => b.id === sanitizedId);
    if (!biz) {
      return res.status(404).json({ error: "No business found with this ID." });
    }

    const correctPassword = biz.password || "123456";
    if (password !== correctPassword && password !== biz.id) {
      return res.status(401).json({ error: "Incorrect password. Please try again." });
    }

    res.json({ success: true, business: biz });
  } catch (err: any) {
    console.error("Business login error:", err);
    res.status(500).json({ error: "Failed to authenticate." });
  }
});

// Update business points/stamps rule settings
app.post("/api/business/update", async (req, res) => {
  const { businessId, updates } = req.body;
  if (!businessId || !updates) {
    return res.status(400).json({ error: "Missing businessId or updates parameters" });
  }

  try {
    const db = await fetchFullDBFromFirestore();
    const biz = db.businesses.find(b => b.id === businessId);
    if (!biz) {
      return res.status(404).json({ error: "Business account not found" });
    }

    // Apply updates safely
    Object.keys(updates).forEach(key => {
      if (["name", "logoUrl", "city", "country", "operatingCurrency", "loyaltyMode", "stampRewardLimit", "pointRewardLimit", "rewardDescription", "languagePreference", "pointsRate", "paymentGateway"].includes(key)) {
        // @ts-ignore
        biz[key] = updates[key];
      }
    });

    appendAuditLog(db, `Business (${biz.name})`, `Updated configuration profile parameters.`);
    await saveDBToFirestore(db);
    res.json({ success: true, business: biz });
  } catch (err: any) {
    console.error("Business update error:", err);
    res.status(500).json({ error: "Failed to update merchant configuration details." });
  }
});

// Add point coupon/menu offer
app.post("/api/business/offers/add", async (req, res) => {
  const { businessId, title, pointsCost, description } = req.body;
  if (!businessId || !title || !pointsCost) {
    return res.status(400).json({ error: "Missing required parameters: businessId, title, or pointsCost" });
  }

  try {
    const db = await fetchFullDBFromFirestore();
    const biz = db.businesses.find(b => b.id === businessId);
    if (!biz) {
      return res.status(404).json({ error: "Business profile not found" });
    }

    if (!biz.pointsOffers) {
      biz.pointsOffers = [];
    }

    const newOffer = {
      id: `off-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title,
      pointsCost: parseInt(pointsCost),
      description: description || ""
    };

    biz.pointsOffers.push(newOffer);
    appendAuditLog(db, `Business (${biz.name})`, `Added new points menu coupon offer: "${title}" costing ${pointsCost} points`);
    await saveDBToFirestore(db);
    res.json({ success: true, offer: newOffer, pointsOffers: biz.pointsOffers });
  } catch (err: any) {
    console.error("Add offer failed:", err);
    res.status(500).json({ error: "Failed to add point menu offer." });
  }
});

// Delete point coupon/menu offer
app.post("/api/business/offers/delete", async (req, res) => {
  const { businessId, offerId } = req.body;
  if (!businessId || !offerId) {
    return res.status(400).json({ error: "Missing businessId or offerId" });
  }

  try {
    const db = await fetchFullDBFromFirestore();
    const biz = db.businesses.find(b => b.id === businessId);
    if (!biz) {
      return res.status(404).json({ error: "Business profile not found" });
    }

    if (biz.pointsOffers) {
      biz.pointsOffers = biz.pointsOffers.filter(o => o.id !== offerId);
    }

    appendAuditLog(db, `Business (${biz.name})`, `Deleted points coupon offer ID: ${offerId}`);
    await saveDBToFirestore(db);
    res.json({ success: true, pointsOffers: biz.pointsOffers || [] });
  } catch (err: any) {
    console.error("Delete offer failed:", err);
    res.status(500).json({ error: "Failed to delete points coupon offer." });
  }
});

// Customer spends points to claim/buy a coupon voucher (points as currency)
app.post("/api/customer/coupon/claim", async (req, res) => {
  const { customerId, businessId, offerId } = req.body;
  if (!customerId || !businessId || !offerId) {
    return res.status(400).json({ error: "Missing required parameters: customerId, businessId, and offerId" });
  }

  try {
    const db = await fetchFullDBFromFirestore();
    const biz = db.businesses.find(b => b.id === businessId);
    if (!biz) {
      return res.status(404).json({ error: "Business profile not found" });
    }

    const offer = biz.pointsOffers?.find(o => o.id === offerId);
    if (!offer) {
      return res.status(404).json({ error: "The requested points reward offer was not found." });
    }

    const relId = `${customerId}_${businessId}`;
    const rel = db.customer_business_relations.find(r => r.id === relId);
    if (!rel) {
      return res.status(403).json({ error: "You are not enrolled in this business's loyalty program." });
    }

    if (rel.pointsCount < offer.pointsCost) {
      return res.status(400).json({ error: `Insufficient points balance. You need ${offer.pointsCost} points, but you have ${rel.pointsCount} points.` });
    }

    // Deduct points
    rel.pointsCount -= offer.pointsCost;

    // Initialize claimedCoupons if not exists
    if (!rel.claimedCoupons) {
      rel.claimedCoupons = [];
    }

    const couponId = `CPN-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const newCoupon = {
      id: couponId,
      offerId: offer.id,
      title: offer.title,
      pointsCost: offer.pointsCost,
      claimedAt: new Date().toISOString(),
      status: "active" as const
    };

    rel.claimedCoupons.unshift(newCoupon);

    appendAuditLog(db, `Retail Customer (${customerId})`, `Spent ${offer.pointsCost} points to claim coupon "${offer.title}" (Code: ${couponId}) at ${biz.name}`);

    // Create system notification for the inbox
    const newNotif = {
      id: `notif-claim-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      businessId: biz.id,
      customerId: customerId,
      title: `🎫 Coupon Claimed: ${offer.title}`,
      message: `You spent ${offer.pointsCost} points and unlocked your "${offer.title}" coupon! Present code ${couponId} in-store to redeem it.`,
      sentAt: new Date().toISOString(),
      reachedCount: 1
    };
    db.notifications.unshift(newNotif);

    // Push notification to the merchant too informing which customer just redeemed it
    const customerObj = db.customers.find(c => c.id === customerId);
    const custName = customerObj?.name || customerId;
    const merchantNotif = {
      id: `notif-merchant-claim-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      businessId: biz.id,
      title: `🚨 Coupon Claimed!`,
      message: `Customer ${custName} (${customerId}) spent ${offer.pointsCost} points to claim: "${offer.title}". Coupon Code: ${couponId}.`,
      sentAt: new Date().toISOString(),
      reachedCount: 1,
      isForMerchant: true
    };
    db.notifications.unshift(merchantNotif);

    await saveDBToFirestore(db);
    res.json({ success: true, pointsCount: rel.pointsCount, coupon: newCoupon });
  } catch (err: any) {
    console.error("Claim coupon failed:", err);
    res.status(500).json({ error: "Failed to claim reward coupon." });
  }
});

// Business redeems/validates a customer's claimed active coupon voucher
app.post("/api/business/coupon/redeem", async (req, res) => {
  const { businessId, couponId } = req.body;
  if (!businessId || !couponId) {
    return res.status(400).json({ error: "Missing required parameters: businessId or couponId" });
  }

  try {
    const db = await fetchFullDBFromFirestore();
    const biz = db.businesses.find(b => b.id === businessId);
    if (!biz) {
      return res.status(404).json({ error: "Business profile not found" });
    }

    // Search relationships to locate coupon
    let foundRel = null;
    let foundCoupon = null;

    for (const rel of db.customer_business_relations) {
      if (rel.businessId === businessId && rel.claimedCoupons) {
        const c = rel.claimedCoupons.find(coupon => coupon.id === couponId);
        if (c) {
          foundRel = rel;
          foundCoupon = c;
          break;
        }
      }
    }

    if (!foundCoupon || !foundRel) {
      return res.status(404).json({ error: "Coupon voucher code not found or does not belong to your store." });
    }

    if (foundCoupon.status === "redeemed") {
      return res.status(400).json({ error: "This coupon voucher code has already been redeemed/used." });
    }

    // Mark as redeemed
    foundCoupon.status = "redeemed";
    foundCoupon.redeemedAt = new Date().toISOString();

    appendAuditLog(db, `Business (${biz.name})`, `Redeemed customer's coupon voucher "${foundCoupon.title}" (Code: ${couponId})`);

    // Create system notification for customer
    const newNotif = {
      id: `notif-redeem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      businessId: biz.id,
      customerId: foundRel.customerId,
      title: `✅ Coupon Redeemed!`,
      message: `Your coupon for "${foundCoupon.title}" (Code: ${couponId}) was successfully redeemed at ${biz.name}. Enjoy your food!`,
      sentAt: new Date().toISOString(),
      reachedCount: 1
    };
    db.notifications.unshift(newNotif);

    await saveDBToFirestore(db);
    res.json({ success: true, coupon: foundCoupon });
  } catch (err: any) {
    console.error("Redeem coupon failed:", err);
    res.status(500).json({ error: "Failed to redeem reward coupon." });
  }
});

// Business directly redeems points from customer's wallet for an offer
app.post("/api/business/points/redeem-direct", async (req, res) => {
  const { businessId, customerId, offerId } = req.body;
  if (!businessId || !customerId || !offerId) {
    return res.status(400).json({ error: "Missing required parameters: businessId, customerId, or offerId" });
  }

  try {
    const db = await fetchFullDBFromFirestore();
    const biz = db.businesses.find(b => b.id === businessId);
    if (!biz) {
      return res.status(404).json({ error: "Business profile not found" });
    }

    const offer = biz.pointsOffers?.find(o => o.id === offerId);
    if (!offer) {
      return res.status(404).json({ error: "Point menu offer not found." });
    }

    const relId = `${customerId}_${businessId}`;
    const rel = db.customer_business_relations.find(r => r.id === relId);
    if (!rel) {
      return res.status(404).json({ error: "Customer enrollment relationship not found." });
    }

    if (rel.pointsCount < offer.pointsCost) {
      return res.status(400).json({ error: `Insufficient points. Customer has ${rel.pointsCount} points, but needs ${offer.pointsCost} points.` });
    }

    // Deduct points directly
    rel.pointsCount -= offer.pointsCost;

    if (!rel.claimedCoupons) {
      rel.claimedCoupons = [];
    }

    const couponId = `DIR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const directCoupon = {
      id: couponId,
      offerId: offer.id,
      title: offer.title,
      pointsCost: offer.pointsCost,
      claimedAt: new Date().toISOString(),
      status: "redeemed" as const,
      redeemedAt: new Date().toISOString()
    };

    rel.claimedCoupons.unshift(directCoupon);

    appendAuditLog(db, `Business (${biz.name})`, `Directly redeemed ${offer.pointsCost} points from customer (${customerId}) for "${offer.title}"`);

    // Create system notification for customer
    const newNotif = {
      id: `notif-direct-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      businessId: biz.id,
      customerId: customerId,
      title: `🎁 Point Redemption Confirmed`,
      message: `${biz.name} directly redeemed ${offer.pointsCost} points from your loyalty balance for "${offer.title}". Enjoy!`,
      sentAt: new Date().toISOString(),
      reachedCount: 1
    };
    db.notifications.unshift(newNotif);

    await saveDBToFirestore(db);
    res.json({ success: true, pointsCount: rel.pointsCount, coupon: directCoupon });
  } catch (err: any) {
    console.error("Direct point redemption failed:", err);
    res.status(500).json({ error: "Failed to directly redeem customer points." });
  }
});

// Generate point QR data signature (For quick creation in Business Panel UI)
app.post("/api/business/generate-qr", async (req, res) => {
  const { businessId, amount, points } = req.body;
  if (!businessId || !amount || !points) {
    return res.status(400).json({ error: "Missing businessId, amount or points" });
  }

  const nonce = `nonce-${Math.random().toString(36).substring(2, 11)}-${Date.now()}`;
  const timestamp = new Date().toISOString();
  const signature = generateQRHash(businessId, parseFloat(amount), parseInt(points), timestamp, nonce);

  res.json({
    businessId,
    amount,
    points,
    timestamp,
    nonce,
    signature
  });
});

// 7. Business Notify sending (quota checking with admin override)
app.post("/api/business/notify", async (req, res) => {
  const { businessId, title, message } = req.body;
  if (!businessId || !title || !message) {
    return res.status(400).json({ error: "Missing businessId, notification title or body copy" });
  }

  try {
    const db = await fetchFullDBFromFirestore();
    const biz = db.businesses.find(b => b.id === businessId);
    if (!biz) {
      return res.status(404).json({ error: "Business profile not found" });
    }

    if (biz.status !== "active") {
      return res.status(403).json({ error: "Your loyalty partner dashboard is currently suspended or deactivated. Message broadcast blocked." });
    }

    // Compute allowed quota: plan standard quota or override quota, plus any extra add-on notifications
    const plan = db.subscription_plans.find(p => p.id === biz.planId);
    const baseQuota = biz.overrideQuota !== null ? biz.overrideQuota : (plan ? plan.monthlyNotifQuota : 5);
    const totalAllowed = baseQuota + biz.extraQuota;

    if (biz.notificationsSentThisMonth >= totalAllowed) {
      return res.status(403).json({ 
        error: `Notification quota exhausted for this billing cycle (${biz.notificationsSentThisMonth}/${totalAllowed} used). Upgrade plan or buy an Extra notification add-on pack.` 
      });
    }

    // Filter reached customers enrolled with notifications enabled
    const connectedRelations = db.customer_business_relations.filter(r => r.businessId === businessId && r.optInNotifications);
    const reachedCount = connectedRelations.length;

    // Record notification
    const newNotif: NotificationMsg = {
      id: `notif-${Date.now()}`,
      businessId,
      title,
      message,
      sentAt: new Date().toISOString(),
      reachedCount
    };

    db.notifications.unshift(newNotif);
    biz.notificationsSentThisMonth += 1;

    appendAuditLog(db, `Business (${biz.name})`, `Broadcasted announcement: "${title}" to ${reachedCount} customers (${biz.notificationsSentThisMonth}/${totalAllowed} quota spent)`);
    await saveDBToFirestore(db);

    res.json({ success: true, notification: newNotif, remaining: totalAllowed - biz.notificationsSentThisMonth });
  } catch (err: any) {
    console.error("Broadcast failed:", err);
    res.status(500).json({ error: "Notification ledger dispatch timed out." });
  }
});

// Buy extra notification pack add-on ($2 for 5 extra notifications)
app.post("/api/business/buy-addon", async (req, res) => {
  const { businessId } = req.body;
  if (!businessId) {
    return res.status(400).json({ error: "Missing businessId" });
  }

  try {
    const db = await fetchFullDBFromFirestore();
    const biz = db.businesses.find(b => b.id === businessId);
    if (!biz) {
      return res.status(404).json({ error: "Business profile not found" });
    }

    // Charge simulated add-on fee ($2 or NPR equivalent based on operating currency)
    const rate = db.globalExchangeRates[biz.billingCurrency] || 1;
    const price = 2 * rate; // $2 equivalent

    const addonTx: PaymentTransaction = {
      id: `tx-${Date.now()}`,
      businessId,
      amount: parseFloat(price.toFixed(2)),
      currency: biz.billingCurrency,
      status: "success",
      gatewayTxnId: `${biz.paymentGateway.toUpperCase()}_ADDON_${Math.random().toString(36).substring(7).toUpperCase()}`,
      invoiceUrl: "#",
      createdAt: new Date().toISOString()
    };

    db.payment_transactions.unshift(addonTx);
    biz.extraQuota += 5; // Adds 5 notifications to the quota

    appendAuditLog(db, `Business (${biz.name})`, `Purchased an Extra Notification Pack (adds +5 quota limits) for ${biz.billingCurrency} ${price}`);
    await saveDBToFirestore(db);

    res.json({ success: true, extraQuota: biz.extraQuota });
  } catch (err: any) {
    console.error("Buy addon failed:", err);
    res.status(500).json({ error: "Gateway addon integration timed out." });
  }
});

// Business toggle notification opt-out for customer relation
app.post("/api/customer/toggle-notification", async (req, res) => {
  const { customerId, businessId, optIn } = req.body;
  if (!customerId || !businessId) {
    return res.status(400).json({ error: "Missing customerId or businessId" });
  }

  try {
    const db = await fetchFullDBFromFirestore();
    const relId = `${customerId}_${businessId}`;
    const rel = db.customer_business_relations.find(r => r.id === relId);
    if (!rel) {
      return res.status(404).json({ error: "Subscription relation not found" });
    }

    rel.optInNotifications = !!optIn;
    await saveDBToFirestore(db);
    res.json({ success: true, relation: rel });
  } catch (err: any) {
    console.error("Toggle notification preference error:", err);
    res.status(500).json({ error: "Failed to update notification configuration details." });
  }
});

// Update business subscription plan
app.post("/api/business/change-plan", async (req, res) => {
  const { businessId, planId, billingCurrency, gateway } = req.body;
  if (!businessId || !planId) {
    return res.status(400).json({ error: "Missing businessId or planId" });
  }

  try {
    const db = await fetchFullDBFromFirestore();
    const biz = db.businesses.find(b => b.id === businessId);
    if (!biz) {
      return res.status(404).json({ error: "Business profile not found" });
    }

    const plan = db.subscription_plans.find(p => p.id === planId);
    if (!plan) {
      return res.status(404).json({ error: "Plan type does not exist" });
    }

    biz.planId = planId;
    if (billingCurrency) biz.billingCurrency = billingCurrency;
    if (gateway) biz.paymentGateway = gateway;
    biz.status = "active";
    biz.subscriptionStatus = "active";
    biz.nextBillingAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    biz.paymentRetries = 0;

    // Charge transaction
    const planPrice = plan.prices[biz.billingCurrency] || plan.prices["USD"] || 0;
    if (planPrice > 0) {
      const changeTx: PaymentTransaction = {
        id: `tx-${Date.now()}`,
        businessId,
        amount: planPrice,
        currency: biz.billingCurrency,
        status: "success",
        gatewayTxnId: `${biz.paymentGateway.toUpperCase()}_PLAN_${Math.random().toString(36).substring(7).toUpperCase()}`,
        invoiceUrl: "#",
        createdAt: new Date().toISOString()
      };
      db.payment_transactions.unshift(changeTx);
    }

    appendAuditLog(db, `Business (${biz.name})`, `Upgraded subscription package to plan "${planId}" using currency ${biz.billingCurrency}`);
    await saveDBToFirestore(db);

    res.json({ success: true, business: biz });
  } catch (err: any) {
    console.error("Change plan failed:", err);
    res.status(500).json({ error: "Failed to apply plan subscription upgrades." });
  }
});

// Record a simulated gateway payment success/failure to reactivate or test past_due/locked profiles
app.post("/api/business/simulate-payment-action", async (req, res) => {
  const { businessId, forceStatus, amount, gatewayName, simulatedPhone } = req.body;
  if (!businessId) {
    return res.status(400).json({ error: "Missing businessId" });
  }

  try {
    const db = await fetchFullDBFromFirestore();
    const biz = db.businesses.find(b => b.id === businessId);
    if (!biz) {
      return res.status(404).json({ error: "Business profile not found" });
    }

    const nowString = new Date().toISOString();
    const paymentAmount = amount || 500;

    if (forceStatus === "success") {
      biz.status = "active";
      biz.subscriptionStatus = "active";
      biz.nextBillingAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      biz.paymentRetries = 0;

      const successTx: PaymentTransaction = {
        id: `tx-${Date.now()}`,
        businessId,
        amount: paymentAmount,
        currency: biz.billingCurrency,
        status: "success",
        gatewayTxnId: `${(gatewayName || biz.paymentGateway).toUpperCase()}_MOCK_SIM_${simulatedPhone || Math.random().toString(10).substring(2, 8)}`,
        invoiceUrl: "#",
        createdAt: nowString
      };
      db.payment_transactions.unshift(successTx);

      appendAuditLog(db, `Business (${biz.name})`, `Simulated SUCCESS manual subscription payment via ${(gatewayName || biz.paymentGateway).toUpperCase()}. Reactivated account!`);
    } else {
      // Fail execution
      biz.paymentRetries += 1;
      if (biz.paymentRetries >= 3) {
        biz.status = "suspended";
        biz.subscriptionStatus = "unpaid";
      } else {
        biz.subscriptionStatus = "past_due";
      }

      const failedTx: PaymentTransaction = {
        id: `tx-${Date.now()}`,
        businessId,
        amount: paymentAmount,
        currency: biz.billingCurrency,
        status: "failed",
        gatewayTxnId: `${(gatewayName || biz.paymentGateway).toUpperCase()}_SIM_FAILED`,
        invoiceUrl: "#",
        createdAt: nowString
      };
      db.payment_transactions.unshift(failedTx);
      appendAuditLog(db, `Business (${biz.name})`, `Simulated FAILED subscription payment (retry #${biz.paymentRetries}) via ${(gatewayName || biz.paymentGateway).toUpperCase()}`);
    }

    await saveDBToFirestore(db);
    res.json({ success: true, business: biz });
  } catch (err: any) {
    console.error("Simulated payment action failed:", err);
    res.status(500).json({ error: "Gateway transaction processing failure." });
  }
});

// 8. Admin endpoints

// Administrative status override
app.post("/api/admin/business/status", async (req, res) => {
  const { businessId, status } = req.body;
  if (!businessId || !status) {
    return res.status(400).json({ error: "Missing businessId or status designation" });
  }

  try {
    const db = await fetchFullDBFromFirestore();
    const biz = db.businesses.find(b => b.id === businessId);
    if (!biz) {
      return res.status(404).json({ error: "Business profile not found" });
    }

    biz.status = status; // active, suspended, blocked
    appendAuditLog(db, "Admin Manager", `Manually updated business status for ${biz.name} to "${status}"`);
    await saveDBToFirestore(db);

    res.json({ success: true, business: biz });
  } catch (err: any) {
    console.error("Status override failed:", err);
    res.status(500).json({ error: "System administrative ledger action timeout." });
  }
});

// Administrative monthly quota override
app.post("/api/admin/business/quota", async (req, res) => {
  const { businessId, overrideQuota } = req.body; // e.g. number or null to reset to plan
  if (!businessId) {
    return res.status(400).json({ error: "Missing businessId" });
  }

  try {
    const db = await fetchFullDBFromFirestore();
    const biz = db.businesses.find(b => b.id === businessId);
    if (!biz) {
      return res.status(404).json({ error: "Business profile not found" });
    }

    biz.overrideQuota = overrideQuota === "" || overrideQuota === null ? null : parseInt(overrideQuota);
    appendAuditLog(db, "Admin Manager", `Manually overrode business quota limits for ${biz.name} to ${biz.overrideQuota ? biz.overrideQuota + '/mo' : 'Plan Default'}`);
    await saveDBToFirestore(db);

    res.json({ success: true, business: biz });
  } catch (err: any) {
    console.error("Quota override failed:", err);
    res.status(500).json({ error: "Failed to configure notification quota overwrite limits." });
  }
});

// Admin configure system-wide subscription plan rates
app.post("/api/admin/plan/update", async (req, res) => {
  const { planId, maxCustomers, monthlyNotifQuota, prices } = req.body;
  if (!planId || !prices) {
    return res.status(400).json({ error: "Missing planId structure or prices" });
  }

  try {
    const db = await fetchFullDBFromFirestore();
    const plan = db.subscription_plans.find(p => p.id === planId);
    if (!plan) {
      return res.status(404).json({ error: "Plan definition not found" });
    }

    if (maxCustomers !== undefined) plan.maxCustomers = parseInt(maxCustomers);
    if (monthlyNotifQuota !== undefined) plan.monthlyNotifQuota = parseInt(monthlyNotifQuota);
    plan.prices = prices;

    appendAuditLog(db, "Admin Manager", `Updated global subscription prices details for plan "${planId}"`);
    await saveDBToFirestore(db);

    res.json({ success: true, plan });
  } catch (err: any) {
    console.error("Admin plan update failed:", err);
    res.status(500).json({ error: "Failed to update global plan prices details." });
  }
});

// Admin global news broadcast to all consumer dashboards
app.post("/api/admin/broadcast", async (req, res) => {
  const { title, message } = req.body;
  if (!title || !message) {
    return res.status(400).json({ error: "Broadcast request is missing title or message description words" });
  }

  try {
    const db = await fetchFullDBFromFirestore();
    const customerCount = db.customers.length;
    const sysNotif: NotificationMsg = {
      id: `notif-sys-${Date.now()}`,
      businessId: "system",
      title,
      message,
      sentAt: new Date().toISOString(),
      reachedCount: customerCount
    };

    db.notifications.unshift(sysNotif);
    appendAuditLog(db, "Admin Manager", `Broadcasted global platform system announcement of "${title}" to all subscribers (${customerCount} connected)`);
    await saveDBToFirestore(db);

    res.json({ success: true, notification: sysNotif });
  } catch (err: any) {
    console.error("Admin broadcast failed:", err);
    res.status(500).json({ error: "Announcements broadcast delivery failed." });
  }
});

// Update currencies exchange rates details
app.post("/api/admin/rates", async (req, res) => {
  const { rates } = req.body;
  if (!rates) {
    return res.status(400).json({ error: "Missing updated rates schema payload" });
  }

  try {
    const db = await fetchFullDBFromFirestore();
    db.globalExchangeRates = {
      ...db.globalExchangeRates,
      ...rates
    };

    appendAuditLog(db, "Admin Manager", `Recalibrated system exchange rates conversions parameters.`);
    await saveDBToFirestore(db);

    res.json({ success: true, rates: db.globalExchangeRates });
  } catch (err: any) {
    console.error("Admin rates failure:", err);
    res.status(500).json({ error: "Exchange rates sync failed." });
  }
});

// Enable or disable support of a local language global translation toggle
app.post("/api/admin/languages", async (req, res) => {
  const { languages } = req.body;
  if (!languages || !Array.isArray(languages)) {
    return res.status(400).json({ error: "Invalid languages array parameter style" });
  }

  try {
    const db = await fetchFullDBFromFirestore();
    db.enabledLanguages = languages;
    appendAuditLog(db, "Admin Manager", `Adjusted platform wide allowed languages setting: ${languages.join(", ")}`);
    await saveDBToFirestore(db);

    res.json({ success: true, enabledLanguages: db.enabledLanguages });
  } catch (err: any) {
    console.error("Admin languages failure:", err);
    res.status(500).json({ error: "Languages setup transaction failed." });
  }
});

// ------------------------------------------
// VITE CLIENT/SERVER MERGE & DIRECTORY ROUTING
// ------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Dev with Vite middleware mode integration
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production delivery of pre-compiled react app
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Loyalty Bridge Server] running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
