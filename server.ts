import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { AppDatabase, Business, Customer, CustomerBusinessRelation, SubscriptionPlan, PaymentTransaction, NotificationMsg, AuditLog } from "./src/types";

const app = express();
const PORT = 3000;
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

// Database helper functions with automatic persistence
function loadDB(): AppDatabase {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDatabase, null, 2));
    return initialDatabase;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const loaded = JSON.parse(raw);
    loaded.subscription_plans = initialPlans;
    return loaded;
  } catch (e) {
    console.error("Error reading database file, resetting to values:", e);
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDatabase, null, 2));
    return initialDatabase;
  }
}

function saveDB(data: AppDatabase) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Ensure database file exist on load
let db = loadDB();

// Setup app middleware
app.use(express.json());

// Apply global CORS and cache-control headers
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  next();
});

// Helper: Add audit log
function addAuditLog(actor: string, action: string) {
  const log: AuditLog = {
    id: `log-${Date.now()}`,
    actor,
    action,
    timestamp: new Date().toISOString()
  };
  db.audit_logs.unshift(log);
  if (db.audit_logs.length > 100) {
    db.audit_logs = db.audit_logs.slice(0, 100);
  }
  saveDB(db);
}

// Signature Generator Helper for Dynamic QR Verification
function generateQRHash(businessId: string, amount: number, points: number, timestamp: string, nonce: string) {
  const rawString = `${businessId}:${amount}:${points}:${timestamp}:${nonce}`;
  return crypto.createHmac("sha256", QR_SECRET).update(rawString).digest("hex");
}

// ------------------------------------------
// API ENDPOINTS
// ------------------------------------------

// 1. Reset Database endpoint
app.post("/api/reset", (req, res) => {
  db = {
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
  saveDB(db);
  res.json({ success: true, message: "Database reset to original seed values successfully!" });
});

// 2. Fetch entire DB summary (useful for simple cross-panel simulations)
app.get("/api/db", (req, res) => {
  res.json(db);
});

app.get("/api/db/download", (req, res) => {
  res.download(DB_FILE, "db.json");
});

// 3. Customer self enrollment
app.post("/api/customer/register", (req, res) => {
  const { id, name, email, phone } = req.body;
  if (!id || !name || !phone) {
    return res.status(400).json({ error: "Missing customer profile ID, name, or phone" });
  }

  const normalizedId = id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  if (!normalizedId) {
    return res.status(400).json({ error: "Invalid customer ID key" });
  }

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
  addAuditLog(`Customer System`, `Registered manual customer profile for (${newCustomerObj.name}) successfully.`);
  saveDB(db);

  res.json({ success: true, customer: newCustomerObj });
});

app.post("/api/customer/enroll", (req, res) => {
  const { customerId, businessId, customerName, customerEmail, customerPhone } = req.body;
  if (!customerId || !businessId) {
    return res.status(400).json({ error: "Missing customerId or businessId" });
  }

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
    addAuditLog(`Retail Customer (${customerObj.name})`, `Enrolled in loyalty program at ${business.name}`);
    saveDB(db);
  }

  res.json({ success: true, relation: rel, customer: customerObj, business });
});

// 4. Earn stamp endpoint (with strictly monitored 12 hour server-side cooldown)
app.post("/api/customer/stamp", (req, res) => {
  const { customerId, businessId } = req.body;
  if (!customerId || !businessId) {
    return res.status(400).json({ error: "Missing customerId or businessId" });
  }

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
    addAuditLog(`Retail Customer (${customerId})`, `Claimed STAMP reward "${business.rewardDescription}" at ${business.name}`);
  } else {
    addAuditLog(`Retail Customer (${customerId})`, `Scanned STAMP card at ${business.name} (Stamps total: ${rel.stampsCount})`);
  }

  saveDB(db);
  res.json({ success: true, relation: rel, rewardAwarded, limit: business.stampRewardLimit });
});

// 5. Earn dynamic points via signed QR code (anti-forgery signature, 5 minute longevity, single-use nonce validation)
const usedQRIds = new Set<string>();

app.post("/api/customer/points", (req, res) => {
  const { customerId, businessId, amount, points, timestamp, nonce, signature } = req.body;
  if (!customerId || !businessId || !amount || !points || !timestamp || !nonce || !signature) {
    return res.status(400).json({ error: "Invalid points QR data. Signature signature, amount, points, timestamp, and verification nonces are mandatory." });
  }

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
    addAuditLog(`Retail Customer (${customerId})`, `Redeemed ${rewardsClaimed}x Loyalty Reward points for "${business.rewardDescription}" at ${business.name}`);
  } else {
    addAuditLog(`Retail Customer (${customerId})`, `Earned ${points} points at ${business.name} (Price amount spent: ${business.operatingCurrency} ${amount})`);
  }

  saveDB(db);
  res.json({ success: true, relation: rel, rewardAwarded, rewardsClaimed, limit: business.pointRewardLimit });
});

// 6. Business self registration (supporting local / international currency, gateways & subscription auto setup)
app.post("/api/business/register", (req, res) => {
  const { id, name, country, city, operatingCurrency, loyaltyMode, stampRewardLimit, pointRewardLimit, rewardDescription, languagePreference, planId, billingCurrency, paymentGateway, pointsRate } = req.body;

  if (!id || !name || !country || !city || !operatingCurrency || !loyaltyMode || !paymentGateway) {
    return res.status(400).json({ error: "Incomplete business profile fields. Business ID, country, city, currency, payment gateway, and name are required." });
  }

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

  addAuditLog(`Business (${name})`, `Registered new B2B2C profile inside plan "${selectedPlan.id}". Gateway: ${paymentGateway.toUpperCase()}`);
  saveDB(db);

  res.json({ success: true, business: newBiz });
});

// Update business points/stamps rule settings
app.post("/api/business/update", (req, res) => {
  const { businessId, updates } = req.body;
  if (!businessId || !updates) {
    return res.status(400).json({ error: "Missing businessId or updates parameters" });
  }

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

  addAuditLog(`Business (${biz.name})`, `Updated configuration profile parameters.`);
  saveDB(db);
  res.json({ success: true, business: biz });
});

// Generate point QR data signature (For quick creation in Business Panel UI)
app.post("/api/business/generate-qr", (req, res) => {
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
app.post("/api/business/notify", (req, res) => {
  const { businessId, title, message } = req.body;
  if (!businessId || !title || !message) {
    return res.status(400).json({ error: "Missing businessId, notification title or body copy" });
  }

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

  addAuditLog(`Business (${biz.name})`, `Broadcasted announcement: "${title}" to ${reachedCount} customers (${biz.notificationsSentThisMonth}/${totalAllowed} quota spent)`);
  saveDB(db);

  res.json({ success: true, notification: newNotif, remaining: totalAllowed - biz.notificationsSentThisMonth });
});

// Buy extra notification pack add-on ($2 for 5 extra notifications)
app.post("/api/business/buy-addon", (req, res) => {
  const { businessId } = req.body;
  if (!businessId) {
    return res.status(400).json({ error: "Missing businessId" });
  }

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

  addAuditLog(`Business (${biz.name})`, `Purchased an Extra Notification Pack (adds +5 quota limits) for ${biz.billingCurrency} ${price}`);
  saveDB(db);

  res.json({ success: true, extraQuota: biz.extraQuota });
});

// Business toggle notification opt-out for customer relation
app.post("/api/customer/toggle-notification", (req, res) => {
  const { customerId, businessId, optIn } = req.body;
  if (!customerId || !businessId) {
    return res.status(400).json({ error: "Missing customerId or businessId" });
  }

  const relId = `${customerId}_${businessId}`;
  const rel = db.customer_business_relations.find(r => r.id === relId);
  if (!rel) {
    return res.status(404).json({ error: "Subscription relation not found" });
  }

  rel.optInNotifications = !!optIn;
  saveDB(db);
  res.json({ success: true, relation: rel });
});

// Update business subscription plan
app.post("/api/business/change-plan", (req, res) => {
  const { businessId, planId, billingCurrency, gateway } = req.body;
  if (!businessId || !planId) {
    return res.status(400).json({ error: "Missing businessId or planId" });
  }

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

  addAuditLog(`Business (${biz.name})`, `Upgraded subscription package to plan "${planId}" using currency ${biz.billingCurrency}`);
  saveDB(db);

  res.json({ success: true, business: biz });
});

// Record a simulated gateway payment success/failure to reactivate or test past_due/locked profiles
app.post("/api/business/simulate-payment-action", (req, res) => {
  const { businessId, forceStatus, amount, gatewayName, simulatedPhone } = req.body;
  if (!businessId) {
    return res.status(400).json({ error: "Missing businessId" });
  }

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

    addAuditLog(`Business (${biz.name})`, `Simulated SUCCESS manual subscription payment via ${(gatewayName || biz.paymentGateway).toUpperCase()}. Reactivated account!`);
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
    addAuditLog(`Business (${biz.name})`, `Simulated FAILED subscription payment (retry #${biz.paymentRetries}) via ${(gatewayName || biz.paymentGateway).toUpperCase()}`);
  }

  saveDB(db);
  res.json({ success: true, business: biz });
});

// 8. Admin endpoints

// Administrative status override
app.post("/api/admin/business/status", (req, res) => {
  const { businessId, status } = req.body;
  if (!businessId || !status) {
    return res.status(400).json({ error: "Missing businessId or status designation" });
  }

  const biz = db.businesses.find(b => b.id === businessId);
  if (!biz) {
    return res.status(404).json({ error: "Business profile not found" });
  }

  biz.status = status; // active, suspended, blocked
  addAuditLog("Admin Manager", `Manually updated business status for ${biz.name} to "${status}"`);
  saveDB(db);

  res.json({ success: true, business: biz });
});

// Administrative monthly quota override
app.post("/api/admin/business/quota", (req, res) => {
  const { businessId, overrideQuota } = req.body; // e.g. number or null to reset to plan
  if (!businessId) {
    return res.status(400).json({ error: "Missing businessId" });
  }

  const biz = db.businesses.find(b => b.id === businessId);
  if (!biz) {
    return res.status(404).json({ error: "Business profile not found" });
  }

  biz.overrideQuota = overrideQuota === "" || overrideQuota === null ? null : parseInt(overrideQuota);
  addAuditLog("Admin Manager", `Manually overrode business quota limits for ${biz.name} to ${biz.overrideQuota ? biz.overrideQuota + '/mo' : 'Plan Default'}`);
  saveDB(db);

  res.json({ success: true, business: biz });
});

// Admin configure system-wide subscription plan rates
app.post("/api/admin/plan/update", (req, res) => {
  const { planId, maxCustomers, monthlyNotifQuota, prices } = req.body;
  if (!planId || !prices) {
    return res.status(400).json({ error: "Missing planId structure or prices" });
  }

  const plan = db.subscription_plans.find(p => p.id === planId);
  if (!plan) {
    return res.status(404).json({ error: "Plan definition not found" });
  }

  if (maxCustomers !== undefined) plan.maxCustomers = parseInt(maxCustomers);
  if (monthlyNotifQuota !== undefined) plan.monthlyNotifQuota = parseInt(monthlyNotifQuota);
  plan.prices = prices;

  addAuditLog("Admin Manager", `Updated global subscription prices details for plan "${planId}"`);
  saveDB(db);

  res.json({ success: true, plan });
});

// Admin global news broadcast to all consumer dashboards
app.post("/api/admin/broadcast", (req, res) => {
  const { title, message } = req.body;
  if (!title || !message) {
    return res.status(400).json({ error: "Broadcast request is missing title or message description words" });
  }

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
  addAuditLog("Admin Manager", `Broadcasted global platform system announcement of "${title}" to all subscribers (${customerCount} connected)`);
  saveDB(db);

  res.json({ success: true, notification: sysNotif });
});

// Update currencies exchange rates details
app.post("/api/admin/rates", (req, res) => {
  const { rates } = req.body;
  if (!rates) {
    return res.status(400).json({ error: "Missing updated rates schema payload" });
  }

  db.globalExchangeRates = {
    ...db.globalExchangeRates,
    ...rates
  };

  addAuditLog("Admin Manager", `Recalibrated system exchange rates conversions parameters.`);
  saveDB(db);

  res.json({ success: true, rates: db.globalExchangeRates });
});

// Enable or disable support of a local language global translation toggle
app.post("/api/admin/languages", (req, res) => {
  const { languages } = req.body;
  if (!languages || !Array.isArray(languages)) {
    return res.status(400).json({ error: "Invalid languages array parameter style" });
  }

  db.enabledLanguages = languages;
  addAuditLog("Admin Manager", `Adjusted platform wide allowed languages setting: ${languages.join(", ")}`);
  saveDB(db);

  res.json({ success: true, enabledLanguages: db.enabledLanguages });
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

startServer();
