import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import admin from "firebase-admin";
import { cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createServer as createViteServer } from "vite";
import { AppDatabase, Business, Customer, CustomerBusinessRelation, SubscriptionPlan, PaymentTransaction, NotificationMsg, AuditLog } from "./src/types";

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
      paymentRetries: 0
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
      paymentRetries: 0
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
      paymentRetries: 3
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
      paymentRetries: 0
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
      paymentRetries: 0
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
      title: "System Update: Welcome to Remix Loyalty!",
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

const isExternalPlatform = !!(
  process.env.VERCEL || 
  process.env.RAILWAY_ENVIRONMENT || 
  process.env.RAILWAY_STATIC_URL || 
  process.env.HEROKU_APP_ID || 
  process.env.RENDER || 
  process.env.FLY_APP_NAME
);

const hasCredentialsEnv = !!(
  process.env.FIREBASE_SERVICE_ACCOUNT || 
  process.env.GOOGLE_APPLICATION_CREDENTIALS || 
  (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY)
);

if (isExternalPlatform && !hasCredentialsEnv) {
  useFirestore = false;
  console.log("[Firebase] Running on an external platform without explicit credentials. Falling back to local db.json storage.");
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

// Helper: Seed Firestore database if empty
async function seedFirestoreIfEmpty() {
  if (!useFirestore || !firestoreDb) {
    console.log("[Firebase] Skipping Firestore seeding (running in local mode with db.json).");
    return;
  }
  try {
    const businessesSnap = await firestoreDb.collection("businesses").limit(1).get();
    if (businessesSnap.empty) {
      console.log("[Firebase] Firestore is empty. Initializing with platform seed dataset...");
      
      // Seed businesses
      for (const b of initialDatabase.businesses) {
        await firestoreDb.collection("businesses").doc(b.id).set(b);
      }
      
      // Seed customers
      for (const c of initialDatabase.customers) {
        await firestoreDb.collection("customers").doc(c.id).set(c);
      }
      
      // Seed relations
      for (const r of initialDatabase.customer_business_relations) {
        await firestoreDb.collection("customer_business_relations").doc(r.id).set(r);
      }
      
      // Seed payment transactions
      for (const tx of initialDatabase.payment_transactions) {
        await firestoreDb.collection("payment_transactions").doc(tx.id).set(tx);
      }
      
      // Seed notifications
      for (const notif of initialDatabase.notifications) {
        await firestoreDb.collection("notifications").doc(notif.id).set(notif);
      }
      
      // Seed audit logs
      for (const log of initialDatabase.audit_logs) {
        await firestoreDb.collection("audit_logs").doc(log.id).set(log);
      }
      
      // Seed system metadata
      await firestoreDb.collection("system").doc("metadata").set({
        enabledLanguages: initialDatabase.enabledLanguages,
        globalExchangeRates: initialDatabase.globalExchangeRates
      });
      
      console.log("[Firebase] Seed database populated successfully.");
    }
  } catch (error: any) {
    console.log("[Database] Initialized storage engine.");
    getLocalDB();
  }
}

// Helper: Load full DB structured snapshot from Firestore
async function fetchFullDBFromFirestore(): Promise<AppDatabase> {
  if (!useFirestore || !firestoreDb) {
    return getLocalDB();
  }
  try {
    const [
      businessesSnap,
      customersSnap,
      relationsSnap,
      transactionsSnap,
      notificationsSnap,
      auditLogsSnap,
      metadataDoc
    ] = await Promise.all([
      firestoreDb.collection("businesses").get(),
      firestoreDb.collection("customers").get(),
      firestoreDb.collection("customer_business_relations").get(),
      firestoreDb.collection("payment_transactions").get(),
      firestoreDb.collection("notifications").get(),
      firestoreDb.collection("audit_logs").get(),
      firestoreDb.collection("system").doc("metadata").get()
    ]);

    const businesses: Business[] = [];
    businessesSnap.forEach(doc => businesses.push(doc.data() as Business));

    const customers: Customer[] = [];
    customersSnap.forEach(doc => customers.push(doc.data() as Customer));

    const customer_business_relations: CustomerBusinessRelation[] = [];
    relationsSnap.forEach(doc => customer_business_relations.push(doc.data() as CustomerBusinessRelation));

    const payment_transactions: PaymentTransaction[] = [];
    transactionsSnap.forEach(doc => payment_transactions.push(doc.data() as PaymentTransaction));

    const notifications: NotificationMsg[] = [];
    notificationsSnap.forEach(doc => notifications.push(doc.data() as NotificationMsg));

    const audit_logs: AuditLog[] = [];
    auditLogsSnap.forEach(doc => audit_logs.push(doc.data() as AuditLog));

    // Sort collections by date
    payment_transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    notifications.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
    audit_logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const metadata = metadataDoc.data();
    const enabledLanguages = metadata?.enabledLanguages || initialDatabase.enabledLanguages;
    const globalExchangeRates = metadata?.globalExchangeRates || initialDatabase.globalExchangeRates;

    const dbObj = {
      businesses,
      customers,
      customer_business_relations,
      subscription_plans: initialPlans,
      payment_transactions,
      notifications,
      audit_logs,
      enabledLanguages,
      globalExchangeRates
    };

    saveLocalDB(dbObj);
    return dbObj;
  } catch (error: any) {
    console.log("[Database] Loaded local dataset state.");
    return getLocalDB();
  }
}

// Helper: Save full structural delta of app ledger to Cloud Firestore
async function saveDBToFirestore(db: AppDatabase) {
  saveLocalDB(db);

  if (!useFirestore || !firestoreDb) return;

  try {
    // Save businesses
    const businessesBatch = firestoreDb.batch();
    db.businesses.forEach(b => {
      businessesBatch.set(firestoreDb.collection("businesses").doc(b.id), b);
    });
    await businessesBatch.commit();

    // Save customers
    const customersBatch = firestoreDb.batch();
    db.customers.forEach(c => {
      customersBatch.set(firestoreDb.collection("customers").doc(c.id), c);
    });
    await customersBatch.commit();

    // Save relations
    const relationsBatch = firestoreDb.batch();
    db.customer_business_relations.forEach(r => {
      relationsBatch.set(firestoreDb.collection("customer_business_relations").doc(r.id), r);
    });
    await relationsBatch.commit();

    // Save transactions
    const transactionsBatch = firestoreDb.batch();
    db.payment_transactions.forEach(tx => {
      transactionsBatch.set(firestoreDb.collection("payment_transactions").doc(tx.id), tx);
    });
    await transactionsBatch.commit();

    // Save notifications
    const notificationsBatch = firestoreDb.batch();
    db.notifications.forEach(n => {
      notificationsBatch.set(firestoreDb.collection("notifications").doc(n.id), n);
    });
    await notificationsBatch.commit();

    // Save audit logs
    const logsBatch = firestoreDb.batch();
    db.audit_logs.forEach(log => {
      logsBatch.set(firestoreDb.collection("audit_logs").doc(log.id), log);
    });
    await logsBatch.commit();

    // Save metadata
    await firestoreDb.collection("system").doc("metadata").set({
      enabledLanguages: db.enabledLanguages,
      globalExchangeRates: db.globalExchangeRates
    });
  } catch (error: any) {
    // Graceful offline fallback
    // Save is already committed locally before this try block via saveLocalDB(db)
  }
}

// Helper: Clear and reseed Firestore database
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

  try {
    await Promise.all([
      clearCollection("businesses"),
      clearCollection("customers"),
      clearCollection("customer_business_relations"),
      clearCollection("payment_transactions"),
      clearCollection("notifications"),
      clearCollection("audit_logs")
    ]);

    await saveDBToFirestore(dbToSeed);
  } catch (error: any) {
    // Graceful offline fallback
    console.log("[Database] Local state reset completed.");
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
    console.log(`[Remix Loyalty Server] running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
