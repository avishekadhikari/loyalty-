import React, { useState } from "react";
import { 
  ShieldAlert, Settings, Network, Globe, Landmark, DollarSign, 
  RefreshCw, CheckCircle2, Sliders, Bell, Award, Sparkles, BookOpen, Clock
} from "lucide-react";
import { AppDatabase, Business, SubscriptionPlan } from "../types";

interface AdminPanelProps {
  db: AppDatabase;
  onRefresh: () => void;
}

export default function AdminPanel({ db, onRefresh }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<"merchants" | "plans" | "fx" | "broadcast" | "audit">("merchants");
  
  // Quota Adjust overrides states
  const [targetBizId, setTargetBizId] = useState<string>("");
  const [manualQuotaInput, setManualQuotaInput] = useState<string>("");
  
  // Custom plan config inputs
  const [selectedPlanId, setSelectedPlanId] = useState<'free' | 'basic' | 'premium' | 'enterprise'>("free");
  const [planNotifQuota, setPlanNotifQuota] = useState("5");
  const [planPriceNPr, setPlanPriceNPr] = useState("500");
  const [planPriceUSD, setPlanPriceUSD] = useState("5");
  const [planPriceEUR, setPlanPriceEUR] = useState("4.5");

  // Custom generic system broadcast state
  const [broadTitle, setBroadTitle] = useState("");
  const [broadMsg, setBroadMsg] = useState("");
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // FX state adjustments
  const [nprRate, setNprRate] = useState("133.5");
  const [eurRate, setEurRate] = useState("0.92");
  const [gbpRate, setGbpRate] = useState("0.79");
  const [inrRate, setInrRate] = useState("83.2");

  // Status message
  const [adminMsg, setAdminMsg] = useState<{ success: boolean; text: string } | null>(null);

  const triggerAlert = (success: boolean, text: string) => {
    setAdminMsg({ success, text });
    setTimeout(() => setAdminMsg(null), 5000);
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

  // 1. Change status (approve / suspend / block override)
  const handleSetMerchantStatus = async (bizId: string, status: 'active' | 'suspended' | 'blocked') => {
    try {
      const response = await fetch("/api/admin/business/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: bizId, status })
      });
      if (response.ok) {
        triggerAlert(true, `Successfully shifted status for ${bizId} to "${status}".`);
        onRefresh();
      } else {
        const data = await response.json();
        triggerAlert(false, data.error);
      }
    } catch (e) {
      triggerAlert(false, "Network error");
    }
  };

  // 2. Override manual notification limits quota Individually
  const handleApplyQuotaOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetBizId) {
      triggerAlert(false, "Select a merchant partner first!");
      return;
    }

    try {
      const response = await fetch("/api/admin/business/quota", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: targetBizId,
          overrideQuota: manualQuotaInput === "" ? null : parseInt(manualQuotaInput)
        })
      });
      if (response.ok) {
        triggerAlert(true, `Manually re-allocated quota overrides for partner ID ${targetBizId}.`);
        setManualQuotaInput("");
        onRefresh();
      } else {
        const data = await response.json();
        triggerAlert(false, data.error);
      }
    } catch (e) {
      triggerAlert(false, "Connection error");
    }
  };

  // 3. Configure Multi-Currency Pricing
  const handleUpdatePlanRates = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/admin/plan/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlanId,
          monthlyNotifQuota: parseInt(planNotifQuota),
          prices: {
            NPR: parseFloat(planPriceNPr),
            USD: parseFloat(planPriceUSD),
            EUR: parseFloat(planPriceEUR)
          }
        })
      });
      if (response.ok) {
        triggerAlert(true, `Successfully recalibrated subscription structures for ${selectedPlanId} plan.`);
        onRefresh();
      } else {
        const data = await response.json();
        triggerAlert(false, data.error);
      }
    } catch (e) {
      triggerAlert(false, "Network failure");
    }
  };

  // 4. Send Multi-business platform broadcast
  const handleBroadcastAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadTitle || !broadMsg) {
      triggerAlert(false, "Compose headline & body text first!");
      return;
    }

    setIsBroadcasting(true);
    try {
      const response = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: broadTitle, message: broadMsg })
      });
      const data = await response.json();
      if (response.ok) {
        triggerAlert(true, `Dispatched general alert broadcast to ${data.notification.reachedCount} active consumers!`);
        setBroadTitle("");
        setBroadMsg("");
        onRefresh();
      } else {
        triggerAlert(false, data.error);
      }
    } catch (e) {
      triggerAlert(false, "Network dispatch error");
    }
    setIsBroadcasting(false);
  };

  // 5. FX updates
  const handleUpdateFXRates = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/admin/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rates: {
            NPR: parseFloat(nprRate),
            EUR: parseFloat(eurRate),
            GBP: parseFloat(gbpRate),
            INR: parseFloat(inrRate)
          }
        })
      });
      if (response.ok) {
        triggerAlert(true, "Global database exchange converter values synchronized!");
        onRefresh();
      } else {
        const data = await response.json();
        triggerAlert(false, data.error);
      }
    } catch (e) {
      triggerAlert(false, "FX sync network error");
    }
  };

  // Calculations & Analytics overview counters
  const totalCustomers = db.customers.length;
  const enrolledMerchantsCount = db.businesses.length;
  
  // Global aggregate stamps
  const aggregateStamps = db.customer_business_relations.reduce((acc, curr) => acc + curr.stampsCount, 0);
  const aggregatePoints = db.customer_business_relations.reduce((acc, curr) => acc + curr.pointsCount, 0);

  // Revenue analytics calculated manually per currency
  const mrrByCurrency: { [curr: string]: number } = {};
  db.businesses.forEach(b => {
    if (b.status === "active") {
      const plan = db.subscription_plans.find(p => p.id === b.planId);
      if (plan) {
        const price = plan.prices[b.billingCurrency] || plan.prices["USD"] || 0;
        mrrByCurrency[b.billingCurrency] = (mrrByCurrency[b.billingCurrency] || 0) + price;
      }
    }
  });

  return (
    <div className="glass-panel rounded-3xl overflow-hidden border border-white/10 shadow-2xl flex flex-col lg:flex-row min-h-[600px] text-white">
      
      {/* Admin Sidebar Navigation */}
      <div className="w-full lg:w-64 bg-black/40 backdrop-blur-md border-r border-white/5 text-white p-4 flex flex-col justify-between shrink-0">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-rose-500 to-amber-500 text-slate-900 p-2 rounded-2xl shadow-md">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-md font-extrabold tracking-tight font-display text-white">Admin System</h2>
              <p className="text-[10px] text-rose-450 font-mono tracking-wider">LOYALTY BRIDGE Global Registry</p>
            </div>
          </div>
 
          <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-1.5 font-mono text-[10px] text-slate-300">
            <span className="text-[9px] uppercase tracking-wider block font-black text-rose-400">Node Status Live</span>
            <p className="flex items-center gap-1">⏳ Database: Cloud SQL Sim</p>
            <p className="flex items-center gap-1">🛠️ Region: AP-South Nepal</p>
            <p className="flex items-center gap-1">🛡️ API Key: Server Secured</p>
          </div>
 
          {/* Navigation Links */}
          <nav className="flex flex-col gap-1">
            <button
              id="admin-nav-merchants"
              onClick={() => setActiveTab("merchants")}
              className={`w-full text-left py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all duration-150 cursor-pointer ${
                activeTab === "merchants" ? "glass-pill-active text-white bg-white/15 shadow" : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Network className="w-4 h-4" /> Merchant Audit List ({enrolledMerchantsCount})
            </button>
            <button
              id="admin-nav-plans"
              onClick={() => setActiveTab("plans")}
              className={`w-full text-left py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all duration-150 cursor-pointer ${
                activeTab === "plans" ? "glass-pill-active text-white bg-white/15 shadow" : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <DollarSign className="w-4 h-4" /> Pricing Matrices
            </button>
            <button
              id="admin-nav-fx"
              onClick={() => setActiveTab("fx")}
              className={`w-full text-left py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all duration-150 cursor-pointer ${
                activeTab === "fx" ? "glass-pill-active text-white bg-white/15 shadow" : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Globe className="w-4 h-4" /> Exchange Converter
            </button>
            <button
              id="admin-nav-broadcast"
              onClick={() => setActiveTab("broadcast")}
              className={`w-full text-left py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all duration-150 cursor-pointer ${
                activeTab === "broadcast" ? "glass-pill-active text-white bg-white/15 shadow" : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Bell className="w-4 h-4" /> System Wide Bulletin
            </button>
            <button
              id="admin-nav-audit"
              onClick={() => setActiveTab("audit")}
              className={`w-full text-left py-2.5 px-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 transition-all duration-150 cursor-pointer ${
                activeTab === "audit" ? "glass-pill-active text-white bg-white/15 shadow" : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Clock className="w-4 h-4" /> Ledger Audit Trail ({db.audit_logs.length})
            </button>
          </nav>
        </div>
 
        <div className="pt-4 border-t border-white/5 text-[10px] text-slate-500 font-mono">
          System operational checks OK • UTC 
        </div>
      </div>

      {/* Main Panel Viewport */}
      <div className="flex-1 p-6 space-y-6">

        {/* Action Banners */}
        {adminMsg && (
          <div 
            id="admin-status-banner"
            className={`p-4 rounded-2xl border flex justify-between items-start text-xs font-sans ${
              adminMsg.success 
                ? "bg-rose-500/10 border-rose-500/30 text-rose-200" 
                : "bg-red-550/10 border-red-500/30 text-red-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span className="font-bold whitespace-pre-wrap">{adminMsg.text}</span>
            </div>
            <button onClick={() => setAdminMsg(null)} className="font-extrabold hover:text-red-300 text-xs cursor-pointer">Dismiss</button>
          </div>
        )}

        {/* Global Analytics Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-panel p-4 rounded-2xl border border-white/10 shadow-md leading-none flex flex-col justify-between text-white">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Connected Users</p>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-white">{totalCustomers}</span>
              <span className="text-[10px] text-slate-400">clients online</span>
            </div>
          </div>
          <div className="glass-panel p-4 rounded-2xl border border-white/10 shadow-md leading-none flex flex-col justify-between text-white">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Registered Outlets</p>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-white">{enrolledMerchantsCount}</span>
              <span className="text-[10px] text-slate-400 font-medium font-sans">B2B brands</span>
            </div>
          </div>
          <div className="glass-panel p-4 rounded-2xl border border-white/10 shadow-md leading-none flex flex-col justify-between text-white">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Stamps Recorded</p>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-indigo-300">{aggregateStamps}</span>
              <span className="text-[10px] text-slate-400">stamps</span>
            </div>
          </div>
          <div className="glass-panel p-4 rounded-2xl border border-white/10 shadow-md leading-none flex flex-col justify-between text-white">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Points Allocated</p>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-emerald-300">{aggregatePoints}</span>
              <span className="text-[10px] text-slate-400 font-sans">points</span>
            </div>
          </div>
        </div>

        {/* ----------------- TAB: MERCHANTS AUDIT LIST ----------------- */}
        {activeTab === "merchants" && (
          <div className="space-y-6">
            
            {/* Header / Config block */}
            <div className="glass-panel p-5 rounded-3xl border border-white/10 shadow-lg space-y-4">
              <div>
                <h2 className="text-sm font-extrabold text-white uppercase tracking-widest flex items-center gap-1.5 font-display">
                  <Sliders className="w-5 h-5 text-indigo-450" /> Administrative Outlets Audit & Management controls
                </h2>
                <p className="text-xs text-slate-300 mt-1">Direct authority overrides over loyalty program registries, quotas overrides, and approvals.</p>
              </div>

              {/* Status grid summary table */}
              <div className="overflow-x-auto border border-white/5 rounded-2xl bg-black/20 text-white">
                <table className="w-full text-left text-xs font-medium border-collapse">
                  <thead>
                    <tr className="bg-white/5 text-slate-350 font-mono text-[10px] border-b border-white/10 uppercase">
                      <th className="p-3 pl-5">Merchant Details</th>
                      <th className="p-3">Loyalty Card Metric</th>
                      <th className="p-3">Country / Currency</th>
                      <th className="p-3">Billing Status</th>
                      <th className="p-3">Quota override</th>
                      <th className="p-3 pr-5 text-right font-sans">Administrative Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-205">
                    {db.businesses.map(b => {
                      const relationsCount = db.customer_business_relations.filter(r => r.businessId === b.id).length;
                      return (
                        <tr key={b.id} id={`admin-row-${b.id}`} className="hover:bg-white/5 transition-colors text-white">
                          <td className="p-3 pl-5">
                            <p className="font-bold text-white flex items-center gap-1">
                              {b.name} <span className="text-lg leading-none">{b.logoUrl}</span>
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">ID: {b.id} • Customers Joined: {relationsCount}</p>
                          </td>
                          <td className="p-3">
                            <span className="bg-white/15 text-slate-300 px-2 py-0.5 rounded font-bold uppercase text-[9px] font-mono select-none border border-white/5">{b.loyaltyMode} mode</span>
                            <span className="block text-[10px] text-slate-300 mt-0.5">{b.rewardDescription}</span>
                          </td>
                          <td className="p-3 text-slate-305">
                            <p className="font-bold text-white">{b.country} ({b.city})</p>
                            <p className="text-[10px] text-slate-400 font-mono">Cur: {b.operatingCurrency} • Gateway: {b.paymentGateway.toUpperCase()}</p>
                          </td>
                          <td className="p-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                              b.status === "active" ? "bg-emerald-500/20 text-emerald-305 border-emerald-500/30" : b.status === "suspended" ? "bg-red-500/20 text-red-300 border-red-500/30 animate-pulse" : "bg-white/5 text-slate-305 border-white/10"
                            }`}>
                              {b.status}
                            </span>
                          </td>
                          <td className="p-3 font-mono font-bold text-slate-300 text-[11px]">
                            {b.overrideQuota !== null ? `${b.overrideQuota}/mo (Override)` : "Plan Default"}
                          </td>
                          <td className="p-3 pr-5 text-right space-x-1 whitespace-nowrap">
                            {b.status !== "active" ? (
                              <button
                                id={`approve-btn-${b.id}`}
                                onClick={() => handleSetMerchantStatus(b.id, "active")}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[9px] px-2.5 py-1 rounded shadow cursor-pointer transition"
                              >
                                Approve
                              </button>
                            ) : (
                              <button
                                id={`suspend-btn-${b.id}`}
                                onClick={() => handleSetMerchantStatus(b.id, "suspended")}
                                className="bg-red-500/20 hover:bg-red-500/35 border border-red-500/30 text-red-300 font-extrabold text-[9px] px-2.5 py-1 rounded cursor-pointer transition"
                              >
                                Suspend / Past due
                              </button>
                            )}
                            <button
                              id={`adjust-btn-${b.id}`}
                              onClick={() => { setTargetBizId(b.id); setManualQuotaInput(b.overrideQuota !== null ? String(b.overrideQuota) : ""); }}
                              className="bg-indigo-500/20 hover:bg-indigo-550/30 border border-indigo-500/30 text-indigo-300 font-extrabold text-[9px] px-2 py-1 rounded cursor-pointer transition"
                            >
                              Quota Adjust
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quota override adjustment controller sub-form */}
            {targetBizId && (
              <div className="glass-panel rounded-3xl p-5 border border-white/10 shadow-lg space-y-3 max-w-md animate-fadeIn text-white">
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <h3 className="text-xs font-black uppercase text-slate-205 font-display">Configure override for {targetBizId}</h3>
                  <button onClick={() => setTargetBizId("")} className="text-slate-400 hover:text-white font-bold text-xs cursor-pointer">Close</button>
                </div>

                <form onSubmit={handleApplyQuotaOverride} className="space-y-3.5 text-xs font-semibold">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 uppercase font-extrabold block">Manual monthly Broadcast Limit Quota Override</label>
                    <input
                      id="admin-quota-override-input"
                      type="number"
                      placeholder="e.g. 50 (leave empty to restore plan value)"
                      value={manualQuotaInput}
                      onChange={(e) => setManualQuotaInput(e.target.value)}
                      className="w-full glass-input text-white border border-white/10 rounded-xl p-2 font-mono font-bold"
                    />
                  </div>

                  <button
                    id="save-quota-override-btn"
                    type="submit"
                    className="w-full bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold py-2 rounded-xl text-xs transition cursor-pointer"
                  >
                    Save Override Properties
                  </button>
                </form>
              </div>
            )}

          </div>
        )}

        {/* ----------------- TAB: PRICING MATRICES ----------------- */}
        {activeTab === "plans" && (
          <div className="space-y-6">
            
            {/* Real-time subscription revenue overview */}
            <div className="glass-panel text-white p-5 rounded-3xl border border-white/10 shadow-lg">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 font-display">Total Revenue Generated (Paying contracts)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.keys(mrrByCurrency).map(curr => (
                  <div key={curr} className="p-3.5 bg-white/5 rounded-2xl border border-white/10 leading-none">
                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block font-mono">{curr} Active Ledger MRR</span>
                    <span className="text-xl font-mono font-black text-emerald-350 block mt-2.5">
                      {getCurrencySymbol(curr)} {mrrByCurrency[curr]}
                    </span>
                  </div>
                ))}
                {Object.keys(mrrByCurrency).length === 0 && (
                  <p className="text-xs text-slate-400 font-medium col-span-2">No paying merchant profiles configured yet.</p>
                )}
              </div>
            </div>

            {/* Edit Tiers prices rules */}
            <div className="glass-panel rounded-3xl p-5 border border-white/10 shadow-lg space-y-4">
              <div>
                <h2 className="text-sm font-extrabold text-white uppercase tracking-widest font-display">Configure subscription plan Rates details</h2>
                <p className="text-xs text-slate-300 mt-1">Adjust prices standards in both local and international channels.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                
                {/* SELECT PLAN */}
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-3">
                  <label className="text-[10px] text-slate-400 uppercase font-extrabold block">Select Contract Tier</label>
                  <select
                    value={selectedPlanId}
                    onChange={(e) => {
                      const pId = e.target.value as any;
                      setSelectedPlanId(pId);
                      const plan = db.subscription_plans.find(x => x.id === pId);
                      if (plan) {
                        setPlanNotifQuota(String(plan.monthlyNotifQuota));
                        setPlanPriceNPr(String(plan.prices.NPR || 500));
                        setPlanPriceUSD(String(plan.prices.USD || 5));
                        setPlanPriceEUR(String(plan.prices.EUR || 4.5));
                      }
                    }}
                    className="w-full glass-input text-white border border-white/10 rounded-xl p-2.5 font-bold cursor-pointer"
                    id="admin-plan-select"
                  >
                    <option value="free" className="bg-slate-950 text-white font-sans">Lifetime Free Plan Tier</option>
                    <option value="basic" className="bg-slate-950 text-white font-sans">Basic Plan Tier</option>
                    <option value="premium" className="bg-slate-950 text-white font-sans">Premium Plan Tier</option>
                    <option value="enterprise" className="bg-slate-950 text-white font-sans">Enterprise Plan Tier</option>
                  </select>
                </div>

                {/* MATRIX CONFIG FILE VALUES */}
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 md:col-span-2">
                  <form onSubmit={handleUpdatePlanRates} className="space-y-4 text-xs font-semibold text-white">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 uppercase font-extrabold block">Default Notification quota</label>
                        <input
                          id="admin-plan-notif-quota"
                          type="number"
                          value={planNotifQuota}
                          onChange={(e) => setPlanNotifQuota(e.target.value)}
                          className="w-full glass-input text-white border border-white/10 rounded-lg p-2 font-bold font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 uppercase font-extrabold block">Price NPR (NPR)</label>
                        <input
                          id="admin-plan-price-npr"
                          type="number"
                          value={planPriceNPr}
                          onChange={(e) => setPlanPriceNPr(e.target.value)}
                          className="w-full glass-input text-white border border-white/10 rounded-lg p-2 font-bold font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 uppercase font-extrabold block">Price USD ($)</label>
                        <input
                          id="admin-plan-price-usd"
                          type="number"
                          value={planPriceUSD}
                          onChange={(e) => setPlanPriceUSD(e.target.value)}
                          className="w-full glass-input text-white border border-white/10 rounded-lg p-2 font-bold font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 uppercase font-extrabold block">Price EUR (€)</label>
                        <input
                          id="admin-plan-price-eur"
                          type="number"
                          value={planPriceEUR}
                          onChange={(e) => setPlanPriceEUR(e.target.value)}
                          className="w-full glass-input text-white border border-white/10 rounded-lg p-2 font-bold font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        id="update-plan-structure-btn"
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-6 py-2 rounded-xl shadow cursor-pointer transition"
                      >
                        Apply Plan Price Settings
                      </button>
                    </div>
                  </form>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* ----------------- TAB: EXCHANGE RATE CONVERSION ----------------- */}
        {activeTab === "fx" && (
          <div className="glass-panel rounded-3xl p-6 border border-white/10 shadow-lg space-y-4 text-white">
            <div className="border-b border-white/5 pb-3">
              <h2 className="text-sm font-extrabold text-white uppercase tracking-widest flex items-center gap-1.5 font-display">
                <Globe className="w-5 h-5 text-indigo-400" /> Recalibrate currency Conversion Exchange Rates
              </h2>
              <p className="text-xs text-slate-300 mt-1">Configure live translation conversions rate feed against reference 1.00 USD.</p>
            </div>

            <form onSubmit={handleUpdateFXRates} className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-semibold text-white">
              <div className="space-y-1.5 p-3.5 bg-white/5 rounded-2xl border border-white/10">
                <label className="text-[10px] text-slate-400 uppercase font-extrabold block">NPR Converter rate ($1 = X NPR)</label>
                <input
                  id="admin-fx-npr"
                  type="number"
                  step="0.01"
                  value={nprRate}
                  onChange={(e) => setNprRate(e.target.value)}
                  className="w-full glass-input text-white border border-white/10 rounded-lg p-2 font-mono font-bold"
                />
              </div>
              <div className="space-y-1.5 p-3.5 bg-white/5 rounded-2xl border border-white/10">
                <label className="text-[10px] text-slate-400 uppercase font-extrabold block">EUR Converter rate ($1 = X EUR)</label>
                <input
                  id="admin-fx-eur"
                  type="number"
                  step="0.01"
                  value={eurRate}
                  onChange={(e) => setEurRate(e.target.value)}
                  className="w-full glass-input text-white border border-white/10 rounded-lg p-2 font-mono font-bold"
                />
              </div>
              <div className="space-y-1.5 p-3.5 bg-white/5 rounded-2xl border border-white/10">
                <label className="text-[10px] text-slate-400 uppercase font-extrabold block">GBP Converter rate ($1 = X GBP)</label>
                <input
                  id="admin-fx-gbp"
                  type="number"
                  step="0.01"
                  value={gbpRate}
                  onChange={(e) => setGbpRate(e.target.value)}
                  className="w-full glass-input text-white border border-white/10 rounded-lg p-2 font-mono font-bold"
                />
              </div>
              <div className="space-y-1.5 p-3.5 bg-white/5 rounded-2xl border border-white/10">
                <label className="text-[10px] text-slate-400 uppercase font-extrabold block">INR Converter rate ($1 = X INR)</label>
                <input
                  id="admin-fx-inr"
                  type="number"
                  step="0.01"
                  value={inrRate}
                  onChange={(e) => setInrRate(e.target.value)}
                  className="w-full glass-input text-white border border-white/10 rounded-lg p-2 font-mono font-bold"
                />
              </div>

              <div className="md:col-span-4 flex justify-end pt-2">
                <button
                  id="save-fx-rates-btn"
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-md transition cursor-pointer"
                >
                  Synchronize Conversions Table
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ----------------- TAB: SYSTEM BROADCAST BULLETIN ----------------- */}
        {activeTab === "broadcast" && (
          <div className="glass-panel rounded-3xl p-6 border border-white/10 shadow-lg space-y-5 text-white">
            <div className="border-b border-white/5 pb-3">
              <h2 className="text-sm font-extrabold text-white uppercase tracking-widest flex items-center gap-1.5 font-display">
                <Bell className="w-5 h-5 text-indigo-400" /> Platform System-Wide Bulletin Announcements
              </h2>
              <p className="text-xs text-slate-300 mt-1">Blast urgent platform operations updates directly to all active consumer mobile wallets.</p>
            </div>

            <form onSubmit={handleBroadcastAnnouncement} className="space-y-4 text-xs font-semibold text-white">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-extrabold block">Broadcast Title Headline</label>
                <input
                  id="broadcast-input-title"
                  type="text"
                  placeholder="System Migration Settle Notice"
                  value={broadTitle}
                  onChange={(e) => setBroadTitle(e.target.value)}
                  className="w-full glass-input text-white border border-white/10 rounded-xl p-2.5 font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-extrabold block">Announcement Body Copy Content</label>
                <textarea
                  id="broadcast-input-body"
                  rows={4}
                  placeholder="We are updating the Kathmandu operations server nodule to improve database Cloud SQL synchronizations..."
                  value={broadMsg}
                  onChange={(e) => setBroadMsg(e.target.value)}
                  className="w-full glass-input text-white border border-white/10 rounded-xl p-2.5 font-medium"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  id="admin-btn-send-broadcast"
                  type="submit"
                  disabled={isBroadcasting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl shadow transition cursor-pointer"
                >
                  {isBroadcasting ? "Broadcasting..." : "Dispatch System Broadcast Alert"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ----------------- TAB: LEDGER AUDIT TRAIL ----------------- */}
        {activeTab === "audit" && (
          <div className="glass-panel rounded-3xl p-6 border border-white/10 shadow-lg space-y-4 text-white">
            <div className="flex justify-between items-center pb-3 border-b border-white/5">
              <div>
                <h2 className="text-sm font-extrabold text-white uppercase tracking-widest font-display">Global Platform Operational Audits Log</h2>
                <p className="text-xs text-slate-300 mt-0.5">Historical sequence of security, registration, and loyalty milestones.</p>
              </div>
              <div className="flex gap-2">
                <a 
                  href="/api/db/download"
                  download="db.json"
                  className="bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-550/30 text-emerald-300 font-extrabold text-xs py-1.5 px-3.5 rounded-lg transition cursor-pointer flex items-center justify-center"
                >
                  Download db.json
                </a>
                <button 
                  id="admin-btn-reset-db"
                  onClick={async () => {
                    if (confirm("Are you sure you want to reset the database to raw initial seeds?")) {
                      const res = await fetch("/api/reset", { method: "POST" });
                      if (res.ok) { triggerAlert(true, "Database reset to seeds successfully!"); onRefresh(); }
                    }
                  }}
                  className="bg-red-500/20 hover:bg-red-500/35 border border-red-550/30 text-rose-300 font-extrabold text-xs py-1.5 px-3.5 rounded-lg transition cursor-pointer"
                >
                  Reset Database to Seeds
                </button>
              </div>
            </div>

            <div className="divide-y divide-white/5 font-mono text-[11px] leading-relaxed">
              {db.audit_logs.map(log => (
                <div key={log.id} className="py-2 flex justify-between items-start gap-4 text-white">
                  <div className="space-y-0.5">
                    <p className="font-bold text-rose-400">[{log.actor}]</p>
                    <p className="text-slate-300 font-sans">{log.action}</p>
                  </div>
                  <span className="text-[10px] text-slate-450 shrink-0 select-none">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
              {db.audit_logs.length === 0 && (
                <p className="text-xs text-slate-450 py-3">Audit ledger is empty.</p>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
