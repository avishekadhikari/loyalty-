import React, { useState, useEffect } from "react";
import { 
  Building, Settings, Users, Bell, DollarSign, Download, Plus, 
  RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck, QrCode, FileSpreadsheet, ExternalLink,
  BarChart3, Info, TrendingUp, Coins, X
} from "lucide-react";
import { AppDatabase, Business, CustomerBusinessRelation, PaymentTransaction, NotificationMsg } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface BusinessPanelProps {
  db: AppDatabase;
  onRefresh: () => void;
  businessId: string;
  setBusinessId: (id: string) => void;
  onLogout?: () => void;
}

export default function BusinessPanel({ db, onRefresh, businessId, setBusinessId, onLogout }: BusinessPanelProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "rules" | "customers" | "broadcast" | "billing" | "analytics">("dashboard");
  
  // Registration and Profile States
  const [bizRegisterId, setBizRegisterId] = useState("");
  const [bizRegisterName, setBizRegisterName] = useState("");
  const [bizCountry, setBizCountry] = useState("Nepal");
  const [bizCity, setBizCity] = useState("Kathmandu");
  const [bizOpCurrency, setBizOpCurrency] = useState("NPR");
  const [bizLoyaltyMode, setBizLoyaltyMode] = useState<'stamp' | 'point'>("stamp");
  const [bizStampLimit, setBizStampLimit] = useState("10");
  const [bizPointLimit, setBizPointLimit] = useState("500");
  const [bizRewardDesc, setBizRewardDesc] = useState("Free Cappuccino");
  const [bizGateway, setBizGateway] = useState<'esewa' | 'khalti' | 'stripe' | 'paypal' | 'razorpay'>("esewa");
  const [bizPlanId, setBizPlanId] = useState<'free' | 'basic' | 'premium' | 'enterprise'>("free");
  
  // Alert logs banner state
  const [statusMessage, setStatusMessage] = useState<{ success: boolean; text: string } | null>(null);

  // Points QR Generator inputs
  const [qrAmount, setQrAmount] = useState("500");
  const [qrPoints, setQrPoints] = useState("500");
  const [generatedQRContents, setGeneratedQRContents] = useState<any | null>(null);
  
  // Composer notify state
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [isSendingNotif, setIsSendingNotif] = useState(false);

  // Settle Payment Simulator parameters
  const [esewaAuthPhone, setEsewaAuthPhone] = useState("9861774000"); // Standard testing number from instruction

  // Points Offer Management state (points as currency)
  const [offerTitle, setOfferTitle] = useState("");
  const [offerCost, setOfferCost] = useState("");
  const [offerDesc, setOfferDesc] = useState("");
  
  // Redeem Coupon Code state
  const [redeemCouponId, setRedeemCouponId] = useState("");

  // Get active business context
  const activeBiz = db.businesses.find(b => b.id === businessId);
  const enrolledRelations = db.customer_business_relations.filter(r => r.businessId === businessId);
  const planOfBiz = activeBiz ? db.subscription_plans.find(p => p.id === activeBiz.planId) : null;
  const transactionsOfBiz = db.payment_transactions.filter(t => t.businessId === businessId);

  // Merchant Notifications & Push Alerts Desk
  const merchantNotifs = db.notifications.filter(n => n.businessId === businessId && n.isForMerchant === true);
  const [knownNotifIds, setKnownNotifIds] = useState<string[]>([]);
  const [activePopupNotif, setActivePopupNotif] = useState<NotificationMsg | null>(null);

  const playChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      osc1.frequency.exponentialRampToValueAtTime(987.77, ctx.currentTime + 0.15); // B5
      
      gain1.gain.setValueAtTime(0.06, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.6);

      setTimeout(() => {
        try {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.type = "sine";
          osc2.frequency.setValueAtTime(987.77, ctx.currentTime); // B5
          osc2.frequency.exponentialRampToValueAtTime(1318.51, ctx.currentTime + 0.15); // E6
          
          gain2.gain.setValueAtTime(0.04, ctx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
          
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.start();
          osc2.stop(ctx.currentTime + 0.5);
        } catch (e) {}
      }, 90);
    } catch (e) {
      console.warn("Web Audio chime failed to play for merchant:", e);
    }
  };

  useEffect(() => {
    setKnownNotifIds([]);
    setActivePopupNotif(null);
  }, [businessId]);

  useEffect(() => {
    const currentIds = merchantNotifs.map(n => n.id);
    if (knownNotifIds.length === 0 && merchantNotifs.length > 0) {
      setKnownNotifIds(currentIds);
      return;
    }

    const unseenNotifs = merchantNotifs.filter(n => !knownNotifIds.includes(n.id));
    if (unseenNotifs.length > 0) {
      const newest = unseenNotifs[0];
      setActivePopupNotif(newest);
      playChime();
      setKnownNotifIds(prev => Array.from(new Set([...prev, ...currentIds])));
    } else if (merchantNotifs.length !== knownNotifIds.length) {
      setKnownNotifIds(currentIds);
    }
  }, [merchantNotifs, knownNotifIds, businessId]);

  useEffect(() => {
    if (activePopupNotif) {
      const timer = setTimeout(() => {
        setActivePopupNotif(null);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [activePopupNotif]);

  // Helpers
  const showBanner = (success: boolean, text: string) => {
    setStatusMessage({ success, text });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case "NPR": return "रू";
      case "INR": return "₹";
      case "USD": return "$";
      case "EUR": return "€";
      case "GBP": return "£";
      default: return currency;
    }
  };

  // 1. Business Registration
  const handleRegisterBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bizRegisterId || !bizRegisterName || !bizCity || !bizRewardDesc) {
      showBanner(false, "Please complete all mandatory signup parameters.");
      return;
    }

    // Sanitize business ID slug
    const sanitizedId = bizRegisterId.toLowerCase().replace(/[^a-z0-9-_]/g, "");

    const payload = {
      id: sanitizedId,
      name: bizRegisterName,
      country: bizCountry,
      city: bizCity,
      operatingCurrency: bizOpCurrency,
      loyaltyMode: bizLoyaltyMode,
      stampRewardLimit: parseInt(bizStampLimit),
      pointRewardLimit: parseInt(bizPointLimit),
      rewardDescription: bizRewardDesc,
      languagePreference: "en",
      planId: bizPlanId,
      billingCurrency: bizOpCurrency === "NPR" ? "NPR" : "USD",
      paymentGateway: bizGateway,
      pointsRate: bizOpCurrency === "NPR" ? 1.0 : 10.0
    };

    try {
      const response = await fetch("/api/business/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (response.ok) {
        showBanner(true, `Successfully created ${payload.name}! Logged in instantly.`);
        setBusinessId(sanitizedId);
        onRefresh();
        
        // Reset form
        setBizRegisterId("");
        setBizRegisterName("");
        setBizRewardDesc("");
      } else {
        showBanner(false, data.error || "Profile creation failed");
      }
    } catch (err) {
      showBanner(false, "Server storage unreachable");
    }
  };

  // 2. Profile / Rules Updates
  const handleUpdateRules = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBiz) return;

    try {
      const response = await fetch("/api/business/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          updates: {
            loyaltyMode: activeBiz.loyaltyMode,
            stampRewardLimit: activeBiz.stampRewardLimit,
            pointRewardLimit: activeBiz.pointRewardLimit,
            rewardDescription: activeBiz.rewardDescription,
            pointsRate: activeBiz.pointsRate,
            operatingCurrency: activeBiz.operatingCurrency
          }
        })
      });
      const data = await response.json();
      if (response.ok) {
        showBanner(true, "Successfully updated loyalty rules parameters.");
        onRefresh();
      } else {
        showBanner(false, data.error);
      }
    } catch (err) {
      showBanner(false, "Server update error");
    }
  };

  // Add Point Menu Catalog offer
  const handleAddOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerTitle || !offerCost) {
      showBanner(false, "Voucher item title and point cost parameters are required!");
      return;
    }
    try {
      const response = await fetch("/api/business/offers/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          title: offerTitle,
          pointsCost: parseInt(offerCost),
          description: offerDesc
        })
      });
      const data = await response.json();
      if (response.ok) {
        showBanner(true, `Successfully added Points Offer "${offerTitle}"!`);
        setOfferTitle("");
        setOfferCost("");
        setOfferDesc("");
        onRefresh();
      } else {
        showBanner(false, data.error || "Failed to add offer");
      }
    } catch (e) {
      showBanner(false, "Network error adding points menu item");
    }
  };

  // Delete Point Menu Catalog offer
  const handleDeleteOffer = async (offerId: string) => {
    if (!window.confirm("Are you sure you want to delete this catalog points reward?")) return;
    try {
      const response = await fetch("/api/business/offers/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, offerId })
      });
      const data = await response.json();
      if (response.ok) {
        showBanner(true, "Points offer successfully deleted from your catalog.");
        onRefresh();
      } else {
        showBanner(false, data.error || "Failed to delete offer");
      }
    } catch (e) {
      showBanner(false, "Network error deleting points offer");
    }
  };

  // Redeem Customer Coupon code
  const handleRedeemCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!redeemCouponId) {
      showBanner(false, "Please enter a coupon voucher code first!");
      return;
    }
    try {
      const response = await fetch("/api/business/coupon/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, couponId: redeemCouponId.trim().toUpperCase() })
      });
      const data = await response.json();
      if (response.ok) {
        showBanner(true, `SUCCESS! Redeemed Voucher Code "${redeemCouponId}": Unlocked "${data.coupon.title}" (Cost: ${data.coupon.pointsCost} points). Enjoy!`);
        setRedeemCouponId("");
        onRefresh();
      } else {
        showBanner(false, data.error || "Failed to redeem coupon code.");
      }
    } catch (e) {
      showBanner(false, "Network error validating coupon code");
    }
  };

  // Directly spend points from customer's wallet (direct cashier redemption)
  const handleDirectRedeemPoints = async (customerId: string, offerId: string) => {
    const biz = db.businesses.find(b => b.id === businessId);
    const offer = biz?.pointsOffers?.find(o => o.id === offerId);
    const cust = db.customers.find(c => c.id === customerId);
    if (!offer || !cust) return;

    if (!window.confirm(`Are you sure you want to directly spend ${offer.pointsCost} points from ${cust.name}'s balance to redeem "${offer.title}"?`)) return;

    try {
      const response = await fetch("/api/business/points/redeem-direct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, customerId, offerId })
      });
      const data = await response.json();
      if (response.ok) {
        showBanner(true, `Direct redemption successful! Deducted ${offer.pointsCost} points from ${cust.name}'s account for "${offer.title}". Remaining points: ${data.pointsCount}`);
        onRefresh();
      } else {
        showBanner(false, data.error || "Failed to directly redeem points.");
      }
    } catch (e) {
      showBanner(false, "Network connection error redeeming points directly");
    }
  };

  // 3. Dynamic QR Generator
  const handleGeneratePointsQR = async () => {
    if (!activeBiz) return;
    try {
      const response = await fetch("/api/business/generate-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          amount: parseFloat(qrAmount),
          points: parseInt(qrPoints)
        })
      });
      const data = await response.json();
      if (response.ok) {
        setGeneratedQRContents(data);
        showBanner(true, "Dynamic points QR code successfully constructed with high-security signature!");
      } else {
        showBanner(false, data.error);
      }
    } catch (err) {
      showBanner(false, "Security signing module error");
    }
  };

  // 4. Send Custom Notify Broadcast
  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBiz || !notifTitle || !notifMessage) {
      showBanner(false, "Notification parameters are incomplete!");
      return;
    }

    setIsSendingNotif(true);
    try {
      const response = await fetch("/api/business/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          title: notifTitle,
          message: notifMessage
        })
      });
      const data = await response.json();
      if (response.ok) {
        showBanner(true, `Announcement broadcasted to ${data.notification.reachedCount} customers successfully!`);
        setNotifTitle("");
        setNotifMessage("");
        onRefresh();
      } else {
        showBanner(false, data.error);
      }
    } catch (err) {
      showBanner(false, "Broadcast failure to reach servers");
    }
    setIsSendingNotif(false);
  };

  // 5. Buy Add-On Pack
  const handleBuyAddon = async () => {
    if (!activeBiz) return;
    try {
      const response = await fetch("/api/business/buy-addon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId })
      });
      if (response.ok) {
        showBanner(true, "Extra Quota Pack added instantly! (+5 notifications available top-up)");
        onRefresh();
      } else {
        const data = await response.json();
        showBanner(false, data.error || "Purchase failed");
      }
    } catch (err) {
      showBanner(false, "Payment network unreachable");
    }
  };

  // 6. Simulate a manual subscription payment / settlement gateway
  const handleSimulatePayment = async (status: "success" | "failed") => {
    if (!activeBiz) return;
    try {
      const planPrice = planOfBiz?.prices[activeBiz.billingCurrency] || 15;
      const response = await fetch("/api/business/simulate-payment-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          forceStatus: status,
          amount: planPrice,
          gatewayName: activeBiz.paymentGateway,
          simulatedPhone: esewaAuthPhone
        })
      });
      const data = await response.json();
      if (response.ok) {
        if (status === "success") {
          showBanner(true, "Succeeded! Subscription settled and account fully reactivated.");
        } else {
          showBanner(false, "Simulated payment failed. Account is still under evaluation / past_due.");
        }
        onRefresh();
      } else {
        showBanner(false, data.error);
      }
    } catch (err) {
      showBanner(false, "Gateway transaction failed");
    }
  };

  // 7. CSV Export
  const handleExportCSV = () => {
    if (enrolledRelations.length === 0) {
      showBanner(false, "No registered customers to export.");
      return;
    }

    // Create CSV content structured
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Customer ID,Name,Stamps Count,Points Count,Last Visit,Opt-In Notifications\n";

    enrolledRelations.forEach(r => {
      const custObj = db.customers.find(c => c.id === r.customerId);
      const name = custObj ? custObj.name : "Unknown";
      const lastVisit = r.lastVisitAt ? new Date(r.lastVisitAt).toLocaleDateString() : "Never";
      csvContent += `"${r.customerId}","${name}",${r.stampsCount},${r.pointsCount},"${lastVisit}",${r.optInNotifications}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${businessId}_loyalty_customers.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showBanner(true, "CSV database file generated & downloaded successfully.");
  };

  // Quota totals helpers
  const baseQuota = activeBiz?.overrideQuota !== null ? activeBiz?.overrideQuota : (planOfBiz?.monthlyNotifQuota || 5);
  const totalNotifQuota = (baseQuota || 5) + (activeBiz?.extraQuota || 0);
  const notifRemaining = Math.max(totalNotifQuota - (activeBiz?.notificationsSentThisMonth || 0), 0);
  
  const customerLimit = planOfBiz ? planOfBiz.maxCustomers : 200;
  const isSuspended = activeBiz?.status !== "active";

  return (
    <div className="glass-card rounded-3xl overflow-hidden border border-white/10 flex flex-col lg:flex-row min-h-[600px] text-white relative">
      
      {/* Real-time B2B Merchant Push Notification Alert Banner Overlay */}
      <AnimatePresence>
        {activePopupNotif && (
          <motion.div
            initial={{ y: -100, opacity: 0, scale: 0.95 }}
            animate={{ y: 16, opacity: 1, scale: 1 }}
            exit={{ y: -100, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            onClick={() => {
              setActiveTab("broadcast");
              setActivePopupNotif(null);
            }}
            className="absolute top-0 left-1/2 -translate-x-1/2 z-50 w-[90%] sm:w-[480px] bg-slate-900/95 backdrop-blur-xl border-2 border-amber-500/30 rounded-2xl p-4 shadow-2xl shadow-black/90 cursor-pointer flex gap-3 select-none hover:bg-slate-850/95 transition-all duration-150"
            id="merchant-push-notification-banner"
          >
            <div className="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white font-black text-lg shadow-md border border-white/10">
              🔔
            </div>

            <div className="flex-1 min-w-0 text-left">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 font-mono">
                  🚨 Real-time Redemption Alert
                </span>
                <span className="text-[9px] text-slate-400 font-mono font-sans">now • 🔔</span>
              </div>
              <h4 className="text-xs font-black text-white mt-1 leading-snug">
                {activePopupNotif.title}
              </h4>
              <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                {activePopupNotif.message}
              </p>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setActivePopupNotif(null);
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 self-start shrink-0 transition"
              title="Dismiss alert"
              id="btn-dismiss-merchant-push"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* 1. Sidebar Panel Management */}
      <div className="w-full lg:w-64 bg-white/5 border-r border-white/10 text-white p-4 flex flex-col justify-between shrink-0">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-indigo-500 to-purple-600 text-white p-2 rounded-2xl shadow-md shadow-indigo-500/25">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-md font-extrabold tracking-tight font-display">Merchant Portal</h2>
              <p className="text-[10px] text-indigo-300 font-mono tracking-wider">LOYALTY BRIDGE B2B</p>
            </div>
          </div>

          {/* Connected Merchant Information */}
          <div className="bg-white/5 p-3 rounded-xl border border-white/10 space-y-2">
            <label className="text-[10px] text-indigo-300 uppercase font-extrabold block font-mono">Active Store Profile</label>
            <div className="p-2.5 bg-slate-950/40 rounded-lg border border-white/5 text-xs font-bold">
              <p className="text-white truncate font-display">{activeBiz?.name || "No active business"}</p>
              <p className="text-[10px] text-indigo-300 mt-1 font-mono">Slug ID: {businessId}</p>
            </div>
            {activeBiz && (
              <div className="flex items-center justify-between mt-1 text-[10px] px-1 font-mono">
                <span className="text-slate-450">Status:</span>
                <span className={`font-bold ${isSuspended ? "text-red-400" : "text-emerald-450"}`}>
                  {activeBiz.status.toUpperCase()}
                </span>
              </div>
            )}
            {onLogout && (
              <button
                id="biz-btn-logout"
                onClick={onLogout}
                className="w-full mt-2 bg-red-600/20 hover:bg-red-600/30 text-red-200 border border-red-500/20 rounded-lg py-1.5 text-xs font-bold transition-all cursor-pointer hover:border-red-500/40 text-center"
              >
                Logout Store 🔒
              </button>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1">
            <button
              id="biz-nav-dash"
              onClick={() => setActiveTab("dashboard")}
              className={`w-full text-left py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all duration-150 cursor-pointer border ${
                activeTab === "dashboard" ? "bg-white/12 text-white border-white/15" : "text-slate-400 hover:text-white border-transparent"
              }`}
            >
              <Building className="w-4 h-4" /> Store Dashboard
            </button>
            <button
              id="biz-nav-rules"
              onClick={() => setActiveTab("rules")}
              className={`w-full text-left py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all duration-150 cursor-pointer border ${
                activeTab === "rules" ? "bg-white/12 text-white border-white/15" : "text-slate-400 hover:text-white border-transparent"
              }`}
            >
              <Settings className="w-4 h-4" /> Loyalty Rules Setup
            </button>
            <button
              id="biz-nav-analytics"
              onClick={() => setActiveTab("analytics")}
              className={`w-full text-left py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all duration-150 cursor-pointer border ${
                activeTab === "analytics" ? "bg-white/12 text-white border-white/15" : "text-slate-400 hover:text-white border-transparent"
              }`}
            >
              <BarChart3 className="w-4 h-4" /> B2B Point Analytics 📊
            </button>
            <button
              id="biz-nav-cust"
              onClick={() => setActiveTab("customers")}
              className={`w-full text-left py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all duration-150 cursor-pointer border ${
                activeTab === "customers" ? "bg-white/12 text-white border-white/15" : "text-slate-400 hover:text-white border-transparent"
              }`}
            >
              <Users className="w-4 h-4" /> Customer Manager ({enrolledRelations.length})
            </button>
            <button
              id="biz-nav-notif"
              onClick={() => setActiveTab("broadcast")}
              className={`w-full text-left py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all duration-150 cursor-pointer border ${
                activeTab === "broadcast" ? "bg-white/12 text-white border-white/15" : "text-slate-400 hover:text-white border-transparent"
              }`}
            >
              <Bell className="w-4 h-4" /> Notify Broadcast
              {notifRemaining <= 1 && (
                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-ping ml-auto"></span>
              )}
            </button>
            <button
              id="biz-nav-bill"
              onClick={() => setActiveTab("billing")}
              className={`w-full text-left py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all duration-150 cursor-pointer border ${
                activeTab === "billing" ? "bg-white/12 text-white border-white/15" : "text-slate-400 hover:text-white border-transparent"
              }`}
            >
              <DollarSign className="w-4 h-4" /> Subscription Ledger
            </button>
          </nav>
        </div>

        {/* Footer info brand */}
        <div className="pt-4 border-t border-white/5 text-[10px] text-slate-500 font-mono mt-4 lg:mt-0">
          Loyalty Bridge Admin B2B Engine v1.0.4 <br /> Secure Token Verification Settle
        </div>
      </div>

      {/* 2. Main content view block */}
      <div className="flex-1 p-6 space-y-6">

        {/* Dynamic State Alert Banners */}
        {statusMessage && (
          <div 
            id="biz-status-banner"
            className={`p-4 rounded-2xl border flex justify-between items-start text-xs font-sans backdrop-blur-md ${
              statusMessage.success 
                ? "bg-emerald-950/30 border-emerald-555/30 text-emerald-200" 
                : "bg-red-950/30 border-red-555/30 text-red-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
              <span className="font-bold whitespace-pre-wrap">{statusMessage.text}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="font-extrabold hover:text-white text-xs cursor-pointer">OK</button>
          </div>
        )}

        {isSuspended && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-red-650 to-red-550 text-white flex justify-between items-center text-xs shadow-lg shadow-red-900/10">
            <div className="space-y-1">
              <p className="font-bold flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-amber-305" /> Merchant Subscription Status Blocked
              </p>
              <p className="opacity-90 font-mono text-[10px]">Reason: Payment process is overdue (past-due check). Customers are locked from stamp scanning!</p>
            </div>
            <button 
              onClick={() => setActiveTab("billing")}
              className="bg-white text-red-600 font-extrabold text-[11px] px-3.5 py-1.5 rounded-lg hover:bg-slate-100 transition-all shadow cursor-pointer"
            >
              Settle Ledger
            </button>
          </div>
        )}

        {/* ----------------- TAB: STORE DASHBOARD & NEW REGISTRATION ----------------- */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            
            {/* Header info */}
            <div className="flex justify-between items-center glass-panel p-5 rounded-2xl border border-white/10 shadow-lg flex-wrap gap-4 text-white">
              <div>
                <h1 className="text-xl font-extrabold text-white flex items-center gap-1.5 leading-none">
                  {activeBiz ? activeBiz.name : "Demo General Outlet"}
                  <span className="text-3xl select-none">{activeBiz?.logoUrl}</span>
                </h1>
                <p className="text-xs text-slate-300 font-medium">
                  📍 {activeBiz?.city}, {activeBiz?.country} • Operational Currency: <span className="font-bold text-white">{activeBiz?.operatingCurrency}</span>
                </p>
              </div>

              {/* Status display */}
              <div className="flex items-center gap-2.5">
                <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${
                  isSuspended ? "bg-red-500/20 text-red-305 border border-red-500/30" : "bg-emerald-500/20 text-emerald-305 border border-emerald-500/30"
                }`}>
                  {activeBiz?.status} status
                </span>
                <span className="text-xs bg-white/10 text-slate-200 px-3 py-1 rounded-full font-bold border border-white/5">
                  {planOfBiz?.name}
                </span>
              </div>
            </div>

            {/* Quick Metrics grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="glass-panel hover:bg-white/5 p-5 rounded-2xl border border-white/10 shadow-lg flex flex-col justify-between text-white">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-none">Active Loyal Customers</p>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-white">{enrolledRelations.length}</span>
                  <span className="text-xs text-slate-400 font-mono">/ {customerLimit === -1 ? "∞" : customerLimit} enrolled</span>
                </div>
                <div className="mt-2 text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  Registration Capacity
                </div>
              </div>

              <div className="glass-panel hover:bg-white/5 p-5 rounded-2xl border border-white/10 shadow-lg flex flex-col justify-between text-white">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-none">Notifications Left</p>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-white">{notifRemaining}</span>
                  <span className="text-xs text-slate-400 font-mono">/ {totalNotifQuota} allowed</span>
                </div>
                <div className="mt-2 text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  Includes {activeBiz?.extraQuota} Top-up Addon
                </div>
              </div>

              <div className="glass-panel hover:bg-white/5 p-5 rounded-2xl border border-white/10 shadow-lg flex flex-col justify-between text-white">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-none">Loyalty Rules Program</p>
                <div className="mt-3">
                  <span className="text-xs font-bold text-indigo-200 uppercase bg-indigo-500/20 px-3 py-1 rounded-lg border border-indigo-500/30">
                    {activeBiz?.loyaltyMode.toUpperCase()} MODE
                  </span>
                </div>
                <p className="text-slate-300 text-[10px] mt-2 font-mono flex items-center leading-normal">
                  Goal: {activeBiz?.loyaltyMode === "stamp" ? `${activeBiz.stampRewardLimit} stamps` : `${activeBiz?.pointRewardLimit} points`} to unlock {activeBiz?.rewardDescription}
                </p>
              </div>
            </div>

            {/* Interactive Section: QR Manager */}
            {activeBiz && (
              <div className="glass-panel rounded-3xl p-6 border border-white/10 shadow-lg space-y-6">
                <div>
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-widest flex items-center gap-1.5 font-display">
                    <QrCode className="w-5 h-5 text-indigo-400" /> Interactive Cashier Customer QR Suite
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">Generate both static enrollment and dynamic transaction vouchers here.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  
                  {/* LEFT: STATIC QR */}
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold border-b border-white/5 pb-1.5 mb-2 flex items-center gap-1.5 uppercase text-indigo-300 leading-none">
                        Static Enrollment Join QR
                      </h4>
                      <p className="text-[11px] text-slate-300">Display this static enrollment QR code in-store. Customers scan this via their mobile browser to join your loyalty program instantly.</p>
                      <p className="text-[9.5px] text-amber-400 mt-2 font-mono pb-2">⚠️ Dev Note: Mobile phone scans will be blocked unless you deploy a public Shared App URL. For testing now, use the 'Copy Link' button below.</p>
                    </div>

                    {/* Virtual Qr View transformed to REAL Scannable QR Code */}
                    <div className="my-4 p-3 bg-white w-44 h-44 mx-auto rounded-xl border border-white/10 shadow-inner flex flex-col justify-center items-center gap-1.5">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=0c0e14&bgcolor=ffffff&data=${encodeURIComponent(
                          typeof window !== "undefined" ? `${window.location.href.split('?')[0].replace(/\/$/, '')}/?role=customer&enroll=${activeBiz.id}` : ""
                        )}`}
                        alt="Join Program QR"
                        className="w-32 h-32"
                      />
                      <span className="text-[9px] text-[#0c0e14] font-mono font-black uppercase tracking-wider select-none leading-none">Scan to Join Us</span>
                    </div>

                    <div className="flex gap-2">
                      <div className="flex-1 text-[10px] text-slate-300 bg-white/10 p-2 rounded text-center font-mono truncate">
                        Url: {typeof window !== "undefined" ? `${window.location.href.split('?')[0].replace(/\/$/, '')}/?role=customer&enroll=${activeBiz.id}` : activeBiz.id}
                      </div>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.href.split('?')[0].replace(/\/$/, '')}/?role=customer&enroll=${activeBiz.id}`);
                          showBanner(true, "Enrollment link copied to clipboard! Paste in a new tab to test.");
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-2 rounded font-bold text-[10px] transition cursor-pointer"
                      >
                        Copy Link
                      </button>
                    </div>
                  </div>

                  {/* RIGHT: DYNAMIC SIGNED QR */}
                  <div className="bg-white/5 p-4 rounded-2xl border border-white/10 flex flex-col justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-bold border-b border-white/5 pb-1.5 mb-2 flex items-center gap-1.5 uppercase text-indigo-300 leading-none">
                        {activeBiz.loyaltyMode === "point" ? "Dynamic Price Point Code Generator" : "Interactive Card Stamp QR"}
                      </h4>
                      <p className="text-[11px] text-slate-300 mb-2">
                        {activeBiz.loyaltyMode === "point" 
                          ? "Input receipt price spend values below to request verified point vouchers secure token signature keys."
                          : "Provide this interactive Stamp QR code at your checkout terminal counter. Stamping is constrained by standard 12-hour antispam filters."
                        }
                      </p>
                      <p className="text-[9.5px] text-amber-400 font-mono">⚠️ Real mobile scans require Public Shared URL. Use 'Copy Link' for desktop testing.</p>
                      
                      {activeBiz.loyaltyMode !== "point" ? (
                        <div className="space-y-4">
                          {/* REAL Scannable Stamp QR */}
                          <div className="my-2 p-3 bg-white w-44 h-44 mx-auto rounded-xl border border-white/10 shadow-inner flex flex-col justify-center items-center gap-1.5">
                            <img 
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=0c0e14&bgcolor=ffffff&data=${encodeURIComponent(
                                typeof window !== "undefined" ? `${window.location.href.split('?')[0].replace(/\/$/, '')}/?role=customer&claim=stamp&bizId=${activeBiz.id}` : ""
                              )}`}
                              alt="Loyalty Stamp QR"
                              className="w-32 h-32"
                            />
                            <span className="text-[9px] text-indigo-750 font-mono font-black uppercase tracking-wider select-none leading-none">Scan for Stamp</span>
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1 text-[10px] text-slate-350 bg-white/10 p-2 rounded text-center font-mono truncate">
                              Url: {typeof window !== "undefined" ? `${window.location.href.split('?')[0].replace(/\/$/, '')}/?role=customer&claim=stamp&bizId=${activeBiz.id}` : ""}
                            </div>
                            <button 
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.href.split('?')[0].replace(/\/$/, '')}/?role=customer&claim=stamp&bizId=${activeBiz.id}`);
                                showBanner(true, "Stamp claim link copied to clipboard! Paste in a new tab.");
                              }}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white px-2 rounded font-bold text-[10px] transition cursor-pointer"
                            >
                              Copy
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[10px] text-slate-400 uppercase font-extrabold block">Spend Amount ({activeBiz.operatingCurrency})</label>
                              <input 
                                type="number" 
                                value={qrAmount}
                                onChange={(e) => {
                                  const amt = e.target.value;
                                  setQrAmount(amt);
                                  setQrPoints(Math.round(parseFloat(amt || "0") * activeBiz.pointsRate).toString());
                                }}
                                className="w-full glass-input text-white p-1.5 text-xs font-mono font-bold rounded-lg border border-white/10 focus:border-indigo-500 focus:outline-none"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] text-slate-400 uppercase font-extrabold block">Target Points conversion</label>
                              <input 
                                type="number" 
                                disabled
                                value={qrPoints}
                                className="w-full bg-white/10 border border-white/5 rounded-lg p-1.5 text-xs font-mono font-bold text-slate-400"
                              />
                            </div>
                          </div>
                          
                          <button
                            id="biz-btn-gen-points-qr"
                            onClick={handleGeneratePointsQR}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-2 rounded-lg transition-all cursor-pointer uppercase tracking-wider shadow-md active:scale-[0.98]"
                          >
                            Construct QR Signature Secure Token
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Output display of generated details & REAL Point QR */}
                    {activeBiz.loyaltyMode === "point" && generatedQRContents && (
                      <div className="space-y-3 animate-fadeIn">
                        <div className="p-3 bg-white w-44 h-44 mx-auto rounded-xl border border-white/10 shadow-inner flex flex-col justify-center items-center gap-1.5">
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=0c0e14&bgcolor=ffffff&data=${encodeURIComponent(
                              typeof window !== "undefined" 
                                ? `${window.location.href.split('?')[0].replace(/\/$/, '')}/?role=customer&claim=points&bizId=${activeBiz.id}&amount=${generatedQRContents.amount}&points=${generatedQRContents.points}&ts=${generatedQRContents.timestamp}&nonce=${generatedQRContents.nonce}&sig=${generatedQRContents.signature}`
                                : ""
                            )}`}
                            alt="Dynamic Points Claim QR"
                            className="w-32 h-32"
                          />
                          <span className="text-[9px] text-[#0c0e14] font-mono font-black uppercase tracking-wider select-none leading-none">Scan to Claim {generatedQRContents.points} Pts</span>
                        </div>

                        <div className="flex gap-2">
                          <div className="flex-1 text-[10px] text-slate-350 bg-indigo-950/20 p-2 rounded text-center border border-indigo-500/10 font-mono truncate">
                            Url: {typeof window !== "undefined" ? `${window.location.href.split('?')[0].replace(/\/$/, '')}/?role=customer&claim=points&bizId=${activeBiz.id}&...` : ""}
                          </div>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.href.split('?')[0].replace(/\/$/, '')}/?role=customer&claim=points&bizId=${activeBiz.id}&amount=${generatedQRContents.amount}&points=${generatedQRContents.points}&ts=${generatedQRContents.timestamp}&nonce=${generatedQRContents.nonce}&sig=${generatedQRContents.signature}`);
                              showBanner(true, "Points claim link copied to clipboard! Paste in a new tab.");
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-2 rounded font-bold text-[10px] transition cursor-pointer"
                          >
                            Copy
                          </button>
                        </div>

                        <div className="p-2.5 bg-indigo-950/40 rounded-xl border border-indigo-500/30 text-[10px] font-mono text-indigo-200 space-y-1 relative">
                          <div className="flex justify-between items-center">
                            <span className="font-extrabold text-indigo-300">SHA256 Token Signature Header:</span>
                            <span className="text-[8px] bg-indigo-500/30 px-1 py-0.2 rounded font-bold text-indigo-300">VALID 5M</span>
                          </div>
                          <p className="truncate">Sig: {generatedQRContents.signature}</p>
                          <p>Nonce: {generatedQRContents.nonce}</p>
                          <p>Amt: {activeBiz.operatingCurrency} {generatedQRContents.amount} spend</p>
                          <p>Points Val: {generatedQRContents.points}</p>
                          <p>Time generated: {new Date(generatedQRContents.timestamp).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}

            {/* Cashier Voucher Code Redemption desk */}
            {activeBiz && activeBiz.loyaltyMode === "point" && (
              <div className="glass-panel rounded-3xl p-6 border border-amber-500/25 bg-[#121625]/80 shadow-xl space-y-4 animate-fadeIn" id="cashier-redemption-desk">
                <div className="border-b border-white/5 pb-2.5 flex items-center gap-2">
                  <div className="bg-amber-500 text-slate-950 p-1.5 rounded-xl text-xs font-black">🎟️</div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white uppercase tracking-widest font-display">
                      Cashier Coupon Redemption Desk
                    </h3>
                    <p className="text-[11px] text-slate-355">Redeem claimed customer food/drink vouchers instantly by inputting their unique coupon code.</p>
                  </div>
                </div>

                <form onSubmit={handleRedeemCoupon} className="flex gap-3 text-xs max-w-lg">
                  <input
                    type="text"
                    placeholder="Enter Coupon Code (e.g., CPN-X9F4B)"
                    value={redeemCouponId}
                    onChange={(e) => setRedeemCouponId(e.target.value)}
                    className="flex-1 glass-input text-white p-3 rounded-xl border border-white/10 font-mono text-center text-sm font-black tracking-widest uppercase bg-slate-950/40 focus:border-amber-400 focus:outline-none"
                    id="cashier-redeem-input"
                  />
                  <button
                    type="submit"
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs px-5 rounded-xl border border-amber-400 cursor-pointer shadow-md shadow-amber-500/10 uppercase tracking-wider"
                    id="cashier-redeem-submit-btn"
                  >
                    Redeem Code ➔
                  </button>
                </form>
              </div>
            )}

            {/* Business self registration section */}
            <div className="glass-panel rounded-3xl p-6 border border-white/10 shadow-lg space-y-4">
              <div className="border-b border-white/5 pb-3">
                <h3 className="text-sm font-extrabold text-white uppercase tracking-widest font-display">
                  Sign up a new Merchant profile (Self-Signup Demo)
                </h3>
                <p className="text-xs text-slate-350 mt-1">Simulate multiple merchants to showcase global payments routing and multi-tier loyalty regimes.</p>
              </div>

              <form onSubmit={handleRegisterBusiness} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-semibold text-white">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-extrabold block">Store Unique URL Slug</label>
                  <input 
                    type="text" 
                    placeholder="kathmandu-coffee-2" 
                    value={bizRegisterId} 
                    onChange={(e) => setBizRegisterId(e.target.value)}
                    className="w-full glass-input text-white p-2.5 rounded-xl border border-white/10 font-mono"
                    id="reg-biz-id"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-405 uppercase font-extrabold block">Store Label / Name</label>
                  <input 
                    type="text" 
                    placeholder="Himalayan Blue Cafe" 
                    value={bizRegisterName} 
                    onChange={(e) => setBizRegisterName(e.target.value)}
                    className="w-full glass-input text-white p-2.5 rounded-xl border border-white/10"
                    id="reg-biz-name"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-405 uppercase font-extrabold block">Operational City Location</label>
                  <input 
                    type="text" 
                    placeholder="Lalitpur" 
                    value={bizCity} 
                    onChange={(e) => setBizCity(e.target.value)}
                    className="w-full glass-input text-white p-2.5 rounded-xl border border-white/10"
                    id="reg-biz-city"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-405 uppercase font-extrabold block">Country Region</label>
                  <select 
                    value={bizCountry} 
                    onChange={(e) => {
                      const c = e.target.value;
                      setBizCountry(c);
                      setBizOpCurrency(c === "Nepal" ? "NPR" : "USD");
                      setBizGateway(c === "Nepal" ? "esewa" : "stripe");
                    }} 
                    className="w-full glass-input text-white p-2.5 border border-white/10 rounded-xl cursor-pointer font-bold"
                    id="reg-biz-country"
                  >
                    <option value="Nepal" className="bg-slate-950 text-white">Nepal 🇳🇵</option>
                    <option value="United States" className="bg-slate-950 text-white">United States 🇺🇸</option>
                    <option value="United Kingdom" className="bg-slate-950 text-white">United Kingdom 🇬🇧</option>
                    <option value="Germany" className="bg-slate-950 text-white">Germany 🇪🇺</option>
                    <option value="India" className="bg-slate-950 text-white">India 🇮🇳</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-450 uppercase font-extrabold block">Operating Currency Selection</label>
                  <select 
                    value={bizOpCurrency} 
                    onChange={(e) => setBizOpCurrency(e.target.value)} 
                    className="w-full glass-input text-white p-2.5 border border-white/10 rounded-xl cursor-pointer font-bold"
                    id="reg-biz-currency"
                  >
                    <option value="NPR" className="bg-slate-950 text-white">NPR (रू)</option>
                    <option value="USD" className="bg-slate-950 text-white">USD ($)</option>
                    <option value="EUR" className="bg-slate-950 text-white">EUR (€)</option>
                    <option value="GBP" className="bg-slate-950 text-white">GBP (£)</option>
                    <option value="INR" className="bg-slate-950 text-white">INR (₹)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-450 uppercase font-extrabold block">Payment Gateway Gateway</label>
                  <select 
                    value={bizGateway} 
                    onChange={(e) => setBizGateway(e.target.value as any)} 
                    className="w-full glass-input text-white p-2.5 border border-white/10 rounded-xl cursor-pointer font-bold font-mono"
                    id="reg-biz-gateway"
                  >
                    {bizCountry === "Nepal" ? (
                      <>
                        <option value="esewa" className="bg-slate-950 text-white font-sans">eSewa Wallet</option>
                        <option value="khalti" className="bg-slate-950 text-white font-sans">Khalti Digital SDK</option>
                      </>
                    ) : (
                      <>
                        <option value="stripe" className="bg-slate-950 text-white font-sans">Stripe Checkout / Cards</option>
                        <option value="paypal" className="bg-slate-950 text-white font-sans">PayPal Direct</option>
                        <option value="razorpay" className="bg-slate-950 text-white font-sans">Razorpay Checkout</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-450 uppercase font-extrabold block">Subscription Tier Choice</label>
                  <select 
                    value={bizPlanId} 
                    onChange={(e) => setBizPlanId(e.target.value as any)} 
                    className="w-full glass-input text-white p-2.5 border border-white/10 rounded-xl cursor-pointer font-bold"
                    id="reg-biz-plan"
                  >
                    <option value="free" className="bg-slate-950 text-white font-sans">Lifetime Free Plan (3 limits quota)</option>
                    <option value="basic" className="bg-slate-950 text-white font-sans">Basic Plan (5 limits quota)</option>
                    <option value="premium" className="bg-slate-950 text-white font-sans">Premium Plan (20 limits quota)</option>
                    <option value="enterprise" className="bg-slate-950 text-white font-sans">Enterprise Plan (100 limits quota)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-450 uppercase font-extrabold block">Loyalty Scheme Regime</label>
                  <select 
                    value={bizLoyaltyMode} 
                    onChange={(e) => setBizLoyaltyMode(e.target.value as any)} 
                    className="w-full glass-input text-white p-2.5 border border-white/10 rounded-xl cursor-pointer font-bold"
                    id="reg-biz-mode"
                  >
                    <option value="stamp" className="bg-slate-950 text-white font-sans">Stamp Cards Mode (1 per 12h)</option>
                    <option value="point" className="bg-slate-950 text-white font-sans">Points Mode (Spends dynamic)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-450 uppercase font-extrabold block">Free Reward Description</label>
                  <input 
                    type="text" 
                    placeholder="Free organic drip coffee" 
                    value={bizRewardDesc} 
                    onChange={(e) => setBizRewardDesc(e.target.value)}
                    className="w-full glass-input text-white p-2.5 border border-white/10 rounded-xl"
                    id="reg-biz-rewards-desc"
                  />
                </div>

                <div className="md:col-span-3 pt-3 flex justify-end">
                  <button
                    id="submit-biz-register"
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold px-6 py-3 rounded-xl transition-all shadow-md flex items-center gap-2 text-xs cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Finalize Merchant Onboarding Dashboard
                  </button>
                </div>
              </form>
            </div>

          </div>
        )}

        {/* ----------------- TAB: RULES SETUP ----------------- */}
        {activeTab === "rules" && activeBiz && (
          <div className="glass-panel rounded-3xl p-6 border border-white/10 shadow-lg space-y-6">
            <div className="border-b border-white/5 pb-3">
              <h2 className="text-base font-extrabold text-white uppercase tracking-widest flex items-center gap-1.5 font-display">
                <Settings className="w-5 h-5 text-indigo-400" /> Advanced Loyalty Rules Settings Configuration
              </h2>
              <p className="text-xs text-slate-350 mt-1">Configure conversion tiers and targets description parameters. All updates save server-side.</p>
            </div>

            <form onSubmit={handleUpdateRules} className="space-y-4 text-xs font-semibold text-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 uppercase font-extrabold block">Earning loyalty Mode</label>
                  <select
                    value={activeBiz.loyaltyMode}
                    onChange={(e) => {
                      activeBiz.loyaltyMode = e.target.value as any;
                      onRefresh();
                    }}
                    className="w-full glass-input border border-white/10 rounded-xl p-2.5 text-white font-bold"
                  >
                    <option value="stamp" className="bg-slate-950 text-white">Stamp mode (1 stamp/12 hours via scans)</option>
                    <option value="point" className="bg-slate-950 text-white">Point mode (Dynamic based on transaction price)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-450 uppercase font-extrabold block">Operating Currency Indicator</label>
                  <input
                    type="text"
                    disabled
                    value={activeBiz.operatingCurrency}
                    className="w-full bg-white/10 border border-white/5 rounded-xl p-2.5 text-slate-400 font-mono"
                  />
                  <p className="text-[10px] text-slate-450 mt-0.5">Contact support to modify operational business currency ledger rates.</p>
                </div>
              </div>

              {activeBiz.loyaltyMode === "stamp" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase font-extrabold block">Stamps required for Reward Claim</label>
                    <input
                      type="number"
                      value={activeBiz.stampRewardLimit}
                      onChange={(e) => {
                        activeBiz.stampRewardLimit = parseInt(e.target.value || "10");
                        onRefresh();
                      }}
                      className="w-full glass-input text-white border border-white/10 rounded-xl p-2.5 font-bold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase font-extrabold block">In-Card Visual Theme</label>
                    <input
                      type="text"
                      disabled
                      value="Standard Classic Stamp Grid (Anti-abuse Cooldown active)"
                      className="w-full bg-white/10 border border-white/5 rounded-xl p-2.5 text-slate-400 font-medium"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase font-extrabold block">Points target reward limit</label>
                    <input
                      type="number"
                      value={activeBiz.pointRewardLimit}
                      onChange={(e) => {
                        activeBiz.pointRewardLimit = parseInt(e.target.value || "500");
                        onRefresh();
                      }}
                      className="w-full glass-input border border-white/10 rounded-xl p-2.5 text-white font-bold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase font-extrabold block">Points conversion rate per spend unit</label>
                    <input
                      type="number"
                      step="0.1"
                      value={activeBiz.pointsRate}
                      onChange={(e) => {
                        activeBiz.pointsRate = parseFloat(e.target.value || "1.0");
                        onRefresh();
                      }}
                      className="w-full glass-input border border-white/10 rounded-xl p-2.5 text-white font-bold"
                    />
                    <p className="text-[10px] text-indigo-300 font-mono">Points conversion scale: 1 {activeBiz.operatingCurrency} spent = {activeBiz.pointsRate} points</p>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-450 uppercase font-extrabold block">Loyalty Free Reward Claim Description</label>
                <input
                  type="text"
                  value={activeBiz.rewardDescription}
                  onChange={(e) => {
                    activeBiz.rewardDescription = e.target.value;
                    onRefresh();
                  }}
                  className="w-full glass-input border border-white/10 rounded-xl p-2.5 text-xs font-mono text-white"
                  placeholder="E.g., Free regular high tea with scones."
                />
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  id="biz-btn-save-rules"
                  type="submit"
                  className="bg-indigo-600 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl hover:bg-indigo-700 transition-all shadow-md cursor-pointer"
                >
                  Save Loyalty Rules Properties
                </button>
              </div>
            </form>

            {activeBiz.loyaltyMode === "point" && (
              <div className="mt-8 pt-6 border-t border-white/10 space-y-6">
                <div className="border-b border-white/5 pb-2">
                  <h3 className="text-sm font-extrabold text-white uppercase tracking-widest flex items-center gap-1.5 font-display text-indigo-300">
                    🍽️ Points Currency Catalog Setup
                  </h3>
                  <p className="text-xs text-slate-350 mt-1">Designate individual menu food items or gifts that customers can purchase using their points as a currency (certain points = item).</p>
                </div>

                {/* Add new catalog offer form */}
                <form onSubmit={handleAddOffer} className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white/5 p-4 rounded-2xl border border-white/10 text-xs text-white">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase font-extrabold block">Menu Item / Reward Title</label>
                    <input
                      type="text"
                      placeholder="E.g., Butter Chicken momo"
                      value={offerTitle}
                      onChange={(e) => setOfferTitle(e.target.value)}
                      className="w-full glass-input text-white border border-white/10 rounded-xl p-2.5 font-bold focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase font-extrabold block">Points Cost (Price in Points)</label>
                    <input
                      type="number"
                      placeholder="E.g., 150"
                      value={offerCost}
                      onChange={(e) => setOfferCost(e.target.value)}
                      className="w-full glass-input text-white border border-white/10 rounded-xl p-2.5 font-bold focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase font-extrabold block">Description (Short note)</label>
                    <input
                      type="text"
                      placeholder="E.g., Delicious plate of 10 momos"
                      value={offerDesc}
                      onChange={(e) => setOfferDesc(e.target.value)}
                      className="w-full glass-input text-white border border-white/10 rounded-xl p-2.5 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div className="md:col-span-3 flex justify-end">
                    <button
                      type="submit"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Add Menu Currency Offer
                    </button>
                  </div>
                </form>

                {/* Current offerings table list */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-355">Current Active points Currency Offers:</h4>
                  <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/20">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-white/5 border-b border-white/10 text-slate-400 text-[10px] uppercase font-mono">
                          <th className="p-3">Title</th>
                          <th className="p-3 text-center">Points Cost</th>
                          <th className="p-3">Description</th>
                          <th className="p-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {(activeBiz.pointsOffers || []).map(offer => (
                          <tr key={offer.id} className="hover:bg-white/3" id={`mgr-offer-row-${offer.id}`}>
                            <td className="p-3 font-bold text-white">{offer.title}</td>
                            <td className="p-3 text-center">
                              <span className="bg-amber-400/10 text-amber-300 font-bold px-2 py-0.5 rounded font-mono text-[11px]">
                                🪙 {offer.pointsCost} pts
                              </span>
                            </td>
                            <td className="p-3 text-slate-350">{offer.description || "-"}</td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => handleDeleteOffer(offer.id)}
                                className="text-[10px] bg-red-650/10 text-red-300 border border-red-500/15 hover:bg-red-600/25 px-2.5 py-1 rounded-lg font-bold transition cursor-pointer"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                        {(activeBiz.pointsOffers || []).length === 0 && (
                          <tr>
                            <td colSpan={4} className="p-6 text-center italic text-slate-500">
                              Your menu points catalog is empty. Setup some dishes/rewards to allow point redemption as a currency!
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ----------------- TAB: CUSTOMERS MANAGER ----------------- */}
        {activeTab === "customers" && (
          <div className="space-y-4">
            
            <div className="flex justify-between items-center glass-panel p-4 rounded-2xl border border-white/10 shadow-lg text-white">
              <div>
                <h2 className="text-sm font-extrabold text-white uppercase tracking-widest flex items-center gap-1.5 font-display">
                  <Users className="w-5 h-5 text-indigo-400" /> Connected Customers ({enrolledRelations.length})
                </h2>
                <p className="text-[11px] text-slate-300 mt-0.5">Catalog of all clients associated with your outlet program.</p>
              </div>

              {/* CSV download button */}
              <button
                id="biz-btn-export-csv"
                onClick={handleExportCSV}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" /> {activeBiz?.languagePreference === "ne" ? "CSV डाउन्लोड" : "Export Customer List (CSV)"}
              </button>
            </div>

            {enrolledRelations.length === 0 ? (
              <div className="glass-panel rounded-3xl p-10 text-center border border-white/10 text-slate-300 space-y-2">
                <Users className="w-10 h-10 mx-auto text-slate-400" />
                <p className="text-xs">No customer enrollments detected yet.</p>
              </div>
            ) : (
              <div className="glass-panel rounded-2xl border border-white/10 shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-medium border-collapse text-slate-200">
                    <thead>
                      <tr className="bg-white/5 text-slate-300 font-mono text-[10px] uppercase border-b border-white/10">
                        <th className="p-3.5 pl-5">Customer Profile</th>
                        <th className="p-3.5">Points Card Balance</th>
                        <th className="p-3.5">Stamps Balance</th>
                        <th className="p-3.5">Opt-In Alerts Feed</th>
                        <th className="p-3.5">Last Transaction Visit</th>
                        <th className="p-3.5 pr-5">Direct Point Redeem (Cashier)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {enrolledRelations.map(rel => {
                        const c = db.customers.find(x => x.id === rel.customerId);
                        if (!c) return null;

                        return (
                          <tr key={rel.id} className="hover:bg-white/5 transition-colors">
                            <td className="p-3.5 pl-5">
                              <p className="font-bold text-white">{c.name}</p>
                              <p className="font-mono text-[10px] text-slate-400">{c.email} • {c.phone}</p>
                            </td>
                            <td className="p-3.5 font-bold text-indigo-300">{rel.pointsCount} Points</td>
                            <td className="p-3.5 font-bold text-slate-200">{rel.stampsCount} stamps</td>
                            <td className="p-3.5">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                rel.optInNotifications ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-white/10 text-slate-400"
                              }`}>
                                {rel.optInNotifications ? "Enabled Alerts" : "Muted"}
                              </span>
                            </td>
                            <td className="p-3.5 text-slate-400 font-mono text-[11px]">
                              {rel.lastVisitAt ? new Date(rel.lastVisitAt).toLocaleString() : "Never"}
                            </td>
                            <td className="p-3.5 pr-5">
                              {activeBiz?.loyaltyMode === "point" ? (
                                <div className="flex items-center gap-1.5" id={`direct-redeem-row-${rel.customerId}`}>
                                  <select
                                    id={`select-offer-${rel.customerId}`}
                                    className="bg-[#0c0e14] border border-white/15 text-[11px] rounded p-1 text-slate-200 outline-none max-w-[120px] font-bold"
                                    defaultValue=""
                                  >
                                    <option value="" disabled>Select food...</option>
                                    {(activeBiz.pointsOffers || []).map(offer => {
                                      const disabled = rel.pointsCount < offer.pointsCost;
                                      return (
                                        <option key={offer.id} value={offer.id} disabled={disabled} className="bg-[#0c0e14] text-white">
                                          {offer.title} ({offer.pointsCost}p) {disabled ? '❌' : '✓'}
                                        </option>
                                      );
                                    })}
                                  </select>
                                  <button
                                    onClick={() => {
                                      const select = document.getElementById(`select-offer-${rel.customerId}`) as HTMLSelectElement;
                                      if (select && select.value) {
                                        handleDirectRedeemPoints(rel.customerId, select.value);
                                        select.value = ""; // reset
                                      } else {
                                        showBanner(false, "Please select a menu food item to redeem first!");
                                      }
                                    }}
                                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[10px] px-2 py-1 rounded transition border border-amber-400 cursor-pointer shadow"
                                  >
                                    Redeem 🍽️
                                  </button>
                                </div>
                              ) : (
                                <span className="text-slate-500 italic text-[11px]">No direct points actions</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ----------------- TAB: BROADCAST CONNOTIFY ----------------- */}
        {activeTab === "broadcast" && (
          <div className="space-y-6">
            
            <div className="glass-panel rounded-3xl p-6 border border-white/10 shadow-lg space-y-6">
              <div className="border-b border-white/5 pb-3 flex justify-between items-center flex-wrap gap-4 text-white">
                <div>
                  <h2 className="text-base font-extrabold text-white uppercase tracking-widest flex items-center gap-1.5 font-display">
                    <Bell className="w-5 h-5 text-indigo-400 animate-swing" /> Compose Customer Promotion Announcement
                  </h2>
                  <p className="text-xs text-slate-300 mt-1">Direct instant notifications to all opt-in enrolled clients.</p>
                </div>

                <div className="text-right">
                  <span className="text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full border border-indigo-500/30">
                    Remaining Alerts Limit this month: {notifRemaining} / {totalNotifQuota}
                  </span>
                </div>
              </div>

              {notifRemaining <= 0 ? (
                <div className="p-5 bg-red-500/10 border-2 border-red-500/20 text-red-200 rounded-2xl text-xs space-y-3">
                  <p className="font-extrabold uppercase flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-red-500 animate-bounce" /> Monthly Broadcast Limit Exhausted!
                  </p>
                  <p className="font-medium text-slate-300">You have fully consumed your package threshold ({totalNotifQuota}/{totalNotifQuota} sent). Elevate your plan or purchase an instant add-on boost pack (+5 alerts credit instantly).</p>
                  <button
                    onClick={handleBuyAddon}
                    className="bg-red-650 hover:bg-red-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
                  >
                    Top-Up +5 Quota Packs ($2 equivalent)
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSendNotification} className="space-y-4 text-xs font-semibold text-white">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-extrabold block">Alert Headline Title</label>
                    <input 
                      type="text" 
                      placeholder="Monsoon Special Discount Voucher!" 
                      value={notifTitle}
                      onChange={(e) => setNotifTitle(e.target.value)}
                      className="w-full glass-input p-2.5 text-xs text-white rounded-xl border border-white/10 font-bold"
                      id="notif-input-title"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-extrabold block">Message copy details</label>
                    <textarea 
                      rows={5}
                      placeholder="Show this alert overlay dashboard in-store to claim 10% off any of our items!" 
                      value={notifMessage}
                      onChange={(e) => setNotifMessage(e.target.value)}
                      className="w-full glass-input p-2.5 text-xs text-white rounded-xl border border-white/10 font-medium"
                      id="notif-input-body"
                    />
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <button
                      type="button"
                      onClick={handleBuyAddon}
                      className="bg-white/10 hover:bg-white/20 text-white border border-white/10 font-bold text-xs px-4 py-2 rounded-xl cursor-pointer"
                    >
                      Top-Up Add-on Pack (+5 Quota)
                    </button>
                    <button
                      id="biz-btn-send-notif"
                      type="submit"
                      disabled={isSendingNotif}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl shadow transition cursor-pointer"
                    >
                      {isSendingNotif ? "Broadcasting out..." : "Send Announcement Broadcast Alert"}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Merchant Live Redemption Alerts Desk */}
            <div className="glass-panel rounded-3xl p-6 border border-white/10 shadow-lg space-y-4">
              <h3 className="text-xs font-extrabold text-amber-400 uppercase tracking-widest flex items-center gap-1.5 font-display">
                <Bell className="w-4 h-4 text-amber-400 animate-pulse" /> Merchant Live Redemption & Reward Alerts Desk ({merchantNotifs.length})
              </h3>
              <p className="text-[11px] text-slate-300">These are real-time alerts pushed from customer devices when they claim coupon codes or unlock stamp/points rewards.</p>
              
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {merchantNotifs.length === 0 ? (
                  <div className="p-6 bg-white/5 border border-white/5 rounded-2xl text-center text-xs text-slate-400">
                    🔔 Waiting for customer transactions... No redemption alerts received yet.
                  </div>
                ) : (
                  merchantNotifs.map(n => (
                    <div key={n.id} className="p-3 bg-slate-950/40 border-l-4 border-l-amber-500 border-white/10 rounded-r-xl text-white flex justify-between items-start gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-amber-400 uppercase font-mono tracking-wider">[Live Alert]</span>
                          <span className="text-[9px] text-slate-400 font-mono">{new Date(n.sentAt).toLocaleTimeString()}</span>
                        </div>
                        <h4 className="text-xs font-extrabold text-white mt-1 leading-snug">{n.title}</h4>
                        <p className="text-[11px] text-slate-300 leading-normal mt-1 max-w-[480px] font-sans">{n.message}</p>
                      </div>
                      <span className="shrink-0 bg-amber-500/15 text-amber-300 border border-amber-500/25 text-[9px] px-2 py-0.5 rounded uppercase font-mono font-bold tracking-wider">
                        Pending Verify
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* List past announcements */}
            <div className="glass-panel rounded-3xl p-6 border border-white/10 shadow-lg space-y-4">
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest">Broadcast Logs History ({db.notifications.filter(x => x.businessId === businessId && !x.isForMerchant).length})</h3>
              <div className="space-y-2.5">
                {db.notifications.filter(x => x.businessId === businessId && !x.isForMerchant).length === 0 ? (
                  <p className="text-xs text-slate-405 font-medium">No prior notifications sent from this account.</p>
                ) : (
                  db.notifications.filter(x => x.businessId === businessId && !x.isForMerchant).map(n => (
                    <div key={n.id} className="p-3 bg-white/5 border border-white/10 rounded-2xl flex justify-between items-center text-white">
                      <div>
                        <h4 className="text-xs font-bold text-white">{n.title}</h4>
                        <p className="text-[11px] text-slate-300 leading-normal mt-1 max-w-[480px]">{n.message}</p>
                        <p className="text-[9px] text-slate-400 font-mono mt-1">Dispatched on: {new Date(n.sentAt).toLocaleString()}</p>
                      </div>
                      <div className="text-right shrink-0 bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] px-2.5 py-1 rounded font-mono font-bold">
                        REACHED: {n.reachedCount} opt-in users
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

        {/* ----------------- TAB: BILLING LEDGER ----------------- */}
        {activeTab === "billing" && activeBiz && (
          <div className="space-y-6">

            <div className="glass-panel rounded-3xl p-6 border border-white/10 shadow-lg space-y-4 text-white">
              <div className="border-b border-white/5 pb-3 flex justify-between items-center flex-wrap gap-4 text-white">
                <div>
                  <h2 className="text-base font-extrabold text-white uppercase tracking-widest flex items-center gap-1.5 font-display">
                    <DollarSign className="w-5 h-5 text-indigo-400" /> Plan & Subscription Ledger Accounting
                  </h2>
                  <p className="text-xs text-slate-300 mt-1">Monitor subscription invoices, billing gateways, and test recurring integrations.</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-3 py-1 rounded-full uppercase font-bold border ${
                    isSuspended ? "bg-red-500/20 text-red-300 border-red-505/30 animate-pulse" : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                  }`}>
                    Account Status: {activeBiz.subscriptionStatus.replace("_", " ")}
                  </span>
                </div>
              </div>

              {/* Grid of details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-3.5">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10 leading-relaxed text-xs">
                    <p className="font-bold flex items-center justify-between text-white">
                      <span>Store Plan Tier:</span>
                      <span className="font-extrabold text-indigo-300">{planOfBiz?.name}</span>
                    </p>
                    <p className="flex justify-between items-center pt-2 mt-2 border-t border-white/10 text-slate-300">
                      <span>Gateway Account setup:</span>
                      <span className="font-bold uppercase font-mono text-white">{activeBiz.paymentGateway}</span>
                    </p>
                    <p className="flex justify-between items-center pt-1 text-slate-300">
                      <span>Billing operational currency:</span>
                      <span className="font-bold text-white">{activeBiz.billingCurrency}</span>
                    </p>
                    <p className="flex justify-between items-center pt-1 text-slate-300">
                      <span>Next recurring payment due:</span>
                      <span className="font-bold font-mono text-white">{new Date(activeBiz.nextBillingAt).toLocaleDateString()}</span>
                    </p>
                  </div>

                  {/* Gateway selector updates */}
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                    <label className="text-[10px] text-slate-400 uppercase font-extrabold block">Change subscription package Tier & gateway</label>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        id="billing-plan-tier-select"
                        value={activeBiz.planId}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          // API call of simulation can update instantly
                          fetch("/api/business/change-plan", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ businessId, planId: val })
                          }).then(() => { onRefresh(); showBanner(true, `Successfully moved to ${val} contract plan!`); });
                        }}
                        className="glass-input text-white border border-white/10 rounded-lg p-2 text-xs font-bold"
                      >
                        <option value="free" className="bg-slate-950 text-white">Lifetime Free Plan (3 limits)</option>
                        <option value="basic" className="bg-slate-950 text-white">Basic Plan (5 limits)</option>
                        <option value="premium" className="bg-slate-950 text-white">Premium Plan (20 limits)</option>
                        <option value="enterprise" className="bg-slate-950 text-white">Enterprise Plan (100 limits)</option>
                      </select>
                      
                      <select
                        id="billing-gateway-select"
                        value={activeBiz.paymentGateway}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          activeBiz.paymentGateway = val;
                          onRefresh();
                          showBanner(true, "Gateway default updated.");
                        }}
                        className="glass-input text-white border border-white/10 rounded-lg p-2 text-xs font-bold"
                      >
                        <option value="esewa" className="bg-slate-950 text-white font-sans">eSewa Mobile SDK</option>
                        <option value="khalti" className="bg-slate-950 text-white font-sans">Khalti Hub</option>
                        <option value="stripe" className="bg-slate-950 text-white font-sans">Stripe Connect</option>
                        <option value="paypal" className="bg-slate-950 text-white font-sans">PayPal</option>
                        <option value="razorpay" className="bg-slate-950 text-white font-sans">Razorpay</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Settle ledger simulator */}
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-3">
                  <h3 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4 text-indigo-400" /> Gateway Sandbox simulator
                  </h3>
                  <p className="text-[11px] text-slate-300 mb-2">Easily trigger a payment retry or force transaction failures to verify subscription auto-suspensions blocks.</p>
                  
                  {activeBiz.paymentGateway === "esewa" && (
                    <div className="space-y-1.5 p-2 bg-indigo-950/40 border border-indigo-500/20 rounded-lg">
                      <p className="text-[10px] text-indigo-300 font-bold leading-normal">eSewa Testing credentials:</p>
                      <input 
                        type="tel" 
                        value={esewaAuthPhone}
                        onChange={(e) => setEsewaAuthPhone(e.target.value)}
                        className="glass-input text-white border border-white/10 rounded p-1.5 font-mono text-[10px] w-full font-bold"
                        placeholder="Auth Phone Number (9861774000)"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      id="simulate-pay-fail-btn"
                      onClick={() => handleSimulatePayment("failed")}
                      className="bg-red-500/20 hover:bg-red-500/35 border border-red-505/30 text-red-300 font-extrabold text-[10px] py-2 rounded-lg cursor-pointer"
                    >
                      Simulate Fail (Past Due)
                    </button>
                    <button
                      id="simulate-pay-success-btn"
                      onClick={() => handleSimulatePayment("success")}
                      className="bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-505/30 text-emerald-305 font-extrabold text-[10px] py-2 rounded-lg cursor-pointer"
                    >
                      Settle (Simulate Checkout)
                    </button>
                  </div>
                  <span className="block text-center text-[9px] text-slate-450 font-semibold font-mono">Simulated fee: {activeBiz.billingCurrency} {planOfBiz?.prices[activeBiz.billingCurrency] || 15}</span>
                </div>
              </div>
            </div>

            {/* Invoices collection logs */}
            <div className="glass-panel rounded-3xl p-6 border border-white/10 shadow-lg space-y-4 text-white">
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2 font-display">
                <FileSpreadsheet className="w-4 h-4 text-slate-400" /> Gateway Ledger Transaction Invoices ({transactionsOfBiz.length})
              </h3>
              <div className="divide-y divide-white/5">
                {transactionsOfBiz.length === 0 ? (
                  <p className="text-xs text-slate-400 font-medium py-2">No prior ledger invoice receipts mapped.</p>
                ) : (
                  transactionsOfBiz.map(tx => (
                    <div key={tx.id} className="py-2.5 flex justify-between items-center text-xs">
                      <div>
                        <p className="font-bold text-white font-mono">Invoice #{tx.id}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">Tx ID: {tx.gatewayTxnId}</p>
                        <p className="text-[10px] text-slate-300">Date settled: {new Date(tx.createdAt).toLocaleString()}</p>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                          tx.status === "success" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-red-500/20 text-red-300 border-red-500/30"
                        }`}>
                          {tx.status.toUpperCase()}
                        </span>
                        <div className="text-right">
                          <p className="font-mono font-bold text-white">{getCurrencySymbol(tx.currency)} {tx.amount}</p>
                          <a 
                            href="#" 
                            onClick={(e) => { e.preventDefault(); showBanner(true, "Downloading simulated legal invoice PDF."); }}
                            className="text-[10px] text-indigo-400 hover:underline flex items-center gap-1 font-bold pt-0.5"
                          >
                            PDF Receipt <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

        {/* ----------------- TAB: B2B POINT ANALYTICS ----------------- */}
        {activeTab === "analytics" && activeBiz && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Header info */}
            <div className="glass-panel p-6 rounded-3xl border border-white/10 shadow-lg text-white space-y-4">
              <div className="border-b border-white/5 pb-4 flex justify-between items-center flex-wrap gap-4">
                <div>
                  <h2 className="text-base font-extrabold text-indigo-300 uppercase tracking-widest flex items-center gap-2 font-mono">
                    <BarChart3 className="w-5 h-5 text-indigo-400" /> B2B Real-time Loyalty Analytics Dashboard
                  </h2>
                  <p className="text-xs text-slate-300 mt-1">
                    Evaluate operational metrics, points-to-cash conversion records, and ledger distribution histories.
                  </p>
                </div>
                <div className="text-xs bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-3 py-1.5 rounded-xl font-mono font-bold">
                  Currency Mode: {activeBiz.operatingCurrency}
                </div>
              </div>

              {/* Parser Logic */}
              {(() => {
                const bizRelations = db.customer_business_relations.filter(r => r.businessId === activeBiz.id);
                const bizAuditLogs = db.audit_logs.filter(log => log.action.includes(activeBiz.name));
                
                let historicalPointsSum = 0;
                let historicalStampsSum = 0;
                let historicalRevenueSum = 0;
                let claimsCount = 0;

                const pointsHistory: { date: string; pts: number; amt: number; customer: string }[] = [];
                const scanHistory: { date: string; desc: string; customerId: string }[] = [];

                bizAuditLogs.forEach(log => {
                  const customerMatch = log.actor.match(/\(([^)]+)\)/);
                  const custId = customerMatch ? customerMatch[1] : "Walk-in Customer";
                  
                  if (log.action.includes("Earned") && log.action.includes("points")) {
                    const ptsMatch = log.action.match(/Earned (\d+) points/);
                    const amtMatch = log.action.match(/spent:\s*\w+\s*([\d.]+)/);
                    const ptsVal = ptsMatch ? parseInt(ptsMatch[1]) : 0;
                    const amtVal = amtMatch ? parseFloat(amtMatch[1]) : 0;

                    historicalPointsSum += ptsVal;
                    historicalRevenueSum += amtVal;
                    pointsHistory.push({
                      date: new Date(log.timestamp).toLocaleDateString(),
                      pts: ptsVal,
                      amt: amtVal,
                      customer: custId
                    });
                    scanHistory.push({
                      date: new Date(log.timestamp).toLocaleTimeString(),
                      desc: `Issued +${ptsVal} points (Receipt spend: ${activeBiz.operatingCurrency} ${amtVal})`,
                      customerId: custId
                    });
                  } else if (log.action.includes("Scanned STAMP")) {
                    historicalStampsSum += 1;
                    scanHistory.push({
                      date: new Date(log.timestamp).toLocaleTimeString(),
                      desc: `Added stamp to card (Stamp accumulated successfully)`,
                      customerId: custId
                    });
                  } else if (log.action.includes("Redeemed")) {
                    claimsCount += 1;
                    scanHistory.push({
                      date: new Date(log.timestamp).toLocaleTimeString(),
                      desc: `Redeemed Reward: "${activeBiz.rewardDescription}"`,
                      customerId: custId
                    });
                  }
                });

                // Cumulative counts fallback based on current live relations
                let activePointsBalance = 0;
                let activeStampsBalance = 0;
                bizRelations.forEach(r => {
                  activePointsBalance += r.pointsCount;
                  activeStampsBalance += r.stampsCount;
                });

                return (
                  <div className="space-y-6">
                    {/* Key Metrics grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      
                      {/* Operational Revenue tracked */}
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-1.5 relative overflow-hidden">
                        <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                          <Coins className="w-3.5 h-3.5" />
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Tracked Revenue</p>
                        <h4 className="text-xl font-black font-mono text-emerald-400">
                          {activeBiz.operatingCurrency} {historicalRevenueSum.toLocaleString()}
                        </h4>
                        <p className="text-[9.5px] text-slate-400 leading-none">Derived from scanned QR receipts</p>
                      </div>

                      {/* Cumulative points */}
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-1.5 relative overflow-hidden">
                        <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/25">
                          <TrendingUp className="w-3.5 h-3.5" />
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Historical Points Given</p>
                        <h4 className="text-xl font-black font-mono text-white">
                          {historicalPointsSum} <span className="text-[10px] text-slate-400 font-normal">pts</span>
                        </h4>
                        <p className="text-[9.5px] text-slate-400 leading-none">
                          Current Active Balance: {activePointsBalance} pts
                        </p>
                      </div>

                      {/* Members */}
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-1.5 relative overflow-hidden">
                        <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/25">
                          <Users className="w-3.5 h-3.5" />
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Loyalty Members</p>
                        <h4 className="text-xl font-black font-mono text-white">
                          {bizRelations.length} <span className="text-xs text-indigo-300">enrolled</span>
                        </h4>
                        <p className="text-[9.5px] text-slate-400 leading-none">
                          Stamps Distributed: {historicalStampsSum || activeStampsBalance}
                        </p>
                      </div>

                      {/* Redemptions count */}
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-1.5 relative overflow-hidden">
                        <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/25">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Rewards Redeemed</p>
                        <h4 className="text-xl font-black font-mono text-white">
                          {claimsCount} <span className="text-[10px] text-slate-400 font-normal">claims</span>
                        </h4>
                        <p className="text-[9.5px] text-slate-400 leading-none truncate">
                          Reward: {activeBiz.rewardDescription}
                        </p>
                      </div>

                    </div>

                    {/* SVG Analytics Visual Trends Chart */}
                    <div className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-3.5">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                          <BarChart3 className="w-4 h-4 text-indigo-400" /> Hourly Point Issuance and Scans Pulse
                        </h4>
                        <span className="text-[9px] font-mono font-black py-0.5 px-2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">
                          Static SVG Render Engine
                        </span>
                      </div>

                      {/* Dynamic Visual Line representation representing point rewards */}
                      <div className="h-44 w-full bg-[#0c0e14]/80 p-3 rounded-xl border border-white/5 flex flex-col justify-between">
                        {pointsHistory.length < 2 ? (
                          <div className="flex-1 flex flex-col justify-center items-center text-center space-y-2 text-slate-505 py-8">
                            <Info className="w-6 h-6 text-slate-400 animate-pulse" />
                            <p className="text-[11px] font-sans text-slate-400">Scan points from the Customer Dashboard to populate visual transaction matrices.</p>
                          </div>
                        ) : (
                          <div className="flex-1 relative">
                            {/* Simple line plot SVG calculated */}
                            <svg className="w-full h-full" viewBox="0 0 500 120" preserveAspectRatio="none">
                              <defs>
                                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                                </linearGradient>
                              </defs>
                              {/* Grid lines */}
                              <line x1="0" y1="30" x2="500" y2="30" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                              <line x1="0" y1="60" x2="500" y2="60" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                              <line x1="0" y1="90" x2="500" y2="90" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />

                              {/* Compute path coordinates dynamically */}
                              {(() => {
                                const paddingX = 40;
                                const width = 500;
                                const height = 120;
                                const step = (width - paddingX * 2) / (pointsHistory.length - 1);
                                const maxPts = Math.max(...pointsHistory.map(h => h.pts), 50);
                                const pointsArr: string[] = [];

                                pointsHistory.forEach((h, index) => {
                                  const x = paddingX + index * step;
                                  // Invert y: height - calculation
                                  const y = height - 15 - ((h.pts / maxPts) * (height - 30));
                                  pointsArr.push(`${x},${y}`);
                                });

                                const linePath = `M ${pointsArr.join(" L ")}`;
                                const areaPath = `${linePath} L ${paddingX + (pointsArr.length - 1) * step},${height - 15} L ${paddingX},${height - 15} Z`;

                                return (
                                  <>
                                    <path d={areaPath} fill="url(#chartGrad)" />
                                    <path d={linePath} fill="none" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                    {pointsHistory.map((h, idx) => {
                                      const parts = pointsArr[idx].split(",");
                                      const cx = parseFloat(parts[0]);
                                      const cy = parseFloat(parts[1]);
                                      return (
                                        <g key={idx}>
                                          <circle cx={cx} cy={cy} r="4" fill="#4f46e5" stroke="#ffffff" strokeWidth="1.5" className="cursor-pointer hover:r-5 transition-all" />
                                          <text x={cx} y={cy - 8} fill="#a5b4fc" fontSize="7" fontWeight="bold" textAnchor="middle" className="font-mono">
                                            {h.pts}p
                                          </text>
                                        </g>
                                      );
                                    })}
                                  </>
                                );
                              })()}
                            </svg>
                            <div className="flex justify-between text-[8.5px] text-slate-400 font-mono pt-1">
                              <span>Start block (Scan #1)</span>
                              <span>Time Sequence Flow</span>
                              <span>Recent scan (Scan #{pointsHistory.length})</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Left/Right layout for scan logs and embedding instructions */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      
                      {/* Interactive Point Ledger */}
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
                        <h4 className="text-xs font-extrabold text-slate-300 uppercase tracking-widest font-mono">
                          Live Merchant Activity Stream
                        </h4>

                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                          {scanHistory.length === 0 ? (
                            <p className="text-xs text-slate-450 font-medium py-3 text-center">No terminal transactions parsed yet. Try scanning values!</p>
                          ) : (
                            scanHistory.reverse().map((h, i) => (
                              <div key={i} className="p-3 bg-[#0c0e14]/55 border border-white/5 rounded-xl flex justify-between items-start text-xs space-y-0.5">
                                <div>
                                  <p className="text-white font-bold max-w-[280px]">{h.desc}</p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">User mapping: <b className="text-indigo-300">{h.customerId}</b></p>
                                </div>
                                <span className="text-[9.5px] text-slate-400 shrink-0 font-mono bg-white/5 px-2 py-0.5 rounded border border-white/5">
                                  {h.date}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Setup and Embed Guide */}
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 text-slate-300">
                        <h4 className="text-xs font-extrabold text-slate-100 uppercase tracking-widest font-mono">
                          Merchant Brand Page Setup guide
                        </h4>
                        
                        <div className="space-y-3 text-xs leading-relaxed font-sans">
                          <p>
                            To utilize this loyalty program on your distinct website or landing code (eSewa widgets, checkout portals), read these recommendations below:
                          </p>

                          <div className="space-y-2 text-[11px]">
                            <div className="flex gap-2 items-start bg-white/5 p-2 rounded-xl">
                              <span className="bg-indigo-505 text-indigo-400 font-extrabold px-1.5 py-0.2 select-none border border-indigo-500/25 rounded">1</span>
                              <p><b>Deploy QR Stand cards:</b> Print the <span className="text-indigo-300 font-bold">Static Enrollment Join QR</span> at your restaurant table or cashier terminals. It redirects customers to register instantly.</p>
                            </div>
                            <div className="flex gap-2 items-start bg-white/5 p-2 rounded-xl">
                              <span className="bg-indigo-505 text-indigo-400 font-extrabold px-1.5 py-0.2 select-none border border-indigo-500/25 rounded">2</span>
                              <p><b>Inject Iframe Widget Embed:</b> Add our widget embed script on your landing dashboard to display real-time reward tier progress inside your customer portals.</p>
                            </div>
                            <div className="flex gap-2 items-start bg-white/5 p-2 rounded-xl">
                              <span className="bg-indigo-505 text-indigo-400 font-extrabold px-1.5 py-0.2 select-none border border-indigo-500/25 rounded">3</span>
                              <p><b>eSewa Token Settlement:</b> Handle client callback points allocation using standard cryptographic HMAC signatures matching secure backend codes.</p>
                            </div>
                          </div>

                          {/* Code widget block copy-paste helper */}
                          <div className="space-y-1">
                            <label className="text-[9px] uppercase text-slate-400 font-black tracking-wide block">HTML embed iframe card model snippet</label>
                            <pre className="p-2.5 bg-slate-950 font-mono text-[9.5px] rounded-lg border border-white/5 text-emerald-400 hover:text-white transition overflow-x-auto">
{`<iframe 
  src="${typeof window !== "undefined" ? window.location.href.split('?')[0].replace(/\/$/, '') : "https://loyalty-bridge.app"}/?role=customer&enroll=${activeBiz.id}"
  width="100%" 
  height="600px" 
  style="border:none; border-radius:16px; background:#0c0e14;"
  allow="camera">
</iframe>`}
                            </pre>
                            <span className="block text-[8px] text-slate-500 uppercase font-mono text-right">Copy snippet into index.html blocks</span>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })()}

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
