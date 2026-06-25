import React, { useState } from "react";
import { 
  Sparkles, ShieldCheck, Zap, Lock, Code, Coins, TrendingUp, X, 
  ChevronRight, Gift, BarChart3, ArrowRight, Building2, Check, UserPlus, 
  Coffee, Globe, HelpCircle, Activity, Laptop, CreditCard, 
  Phone, Mail, MessageCircle, MapPin
} from "lucide-react";
import { AppDatabase, Business } from "../types";

interface MarketingPageProps {
  db: AppDatabase;
  onRefresh: () => Promise<void>;
  onSelectBusiness: (bizId: string) => void;
  onNavigateToRole: (role: "customer" | "business" | "admin") => void;
}

export default function MarketingPage({ db, onRefresh, onSelectBusiness, onNavigateToRole }: MarketingPageProps) {
  // Subscription / Registration form stats
  const [showRegModal, setShowRegModal] = useState(false);
  const [successNewBiz, setSuccessNewBiz] = useState<Business | null>(null);

  // Form Fields
  const [bizId, setBizId] = useState("");
  const [bizName, setBizName] = useState("");
  const [bizCountry, setBizCountry] = useState("Nepal");
  const [bizCity, setBizCity] = useState("Kathmandu");
  const [bizCurrency, setBizCurrency] = useState("NPR");
  const [selectedLoyaltyMode, setSelectedLoyaltyMode] = useState<"stamp" | "point">("stamp");
  const [stampLimit, setStampLimit] = useState(10);
  const [pointsLimit, setPointsLimit] = useState(500);
  const [rewardDesc, setRewardDesc] = useState("");
  const [gatewayValue, setGatewayValue] = useState<"esewa" | "khalti" | "stripe">("esewa");
  const [regError, setRegError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Contact State Variables
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactBrand, setContactBrand] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactSuccess, setContactSuccess] = useState(false);

  // Helper trigger to auto-slug based on Name
  const handleNameChange = (val: string) => {
    setBizName(val);
    const slug = val.toLowerCase()
      .trim()
      .replace(/[^a-z0-9 ]/g, "")
      .replace(/\s+/g, "-");
    setBizId(slug);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bizId.trim() || !bizName.trim() || !rewardDesc.trim()) {
      setRegError("All primary fields are required. Please input business identifier, name, and reward details.");
      return;
    }

    setIsSubmitting(true);
    setRegError("");

    try {
      const res = await fetch("/api/business/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: bizId,
          name: bizName,
          country: bizCountry,
          city: bizCity,
          operatingCurrency: bizCurrency,
          loyaltyMode: selectedLoyaltyMode,
          stampRewardLimit: stampLimit,
          pointRewardLimit: pointsLimit,
          rewardDescription: rewardDesc,
          languagePreference: "en",
          planId: "premium", // Register under Premium for trial access
          billingCurrency: bizCurrency,
          paymentGateway: gatewayValue,
          pointsRate: bizCurrency === "NPR" ? 1.0 : 10.0
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessNewBiz(data.business);
        await onRefresh();
      } else {
        setRegError(data.error || "Failed registers. Business ID already taken.");
      }
    } catch (err) {
      setRegError("Network sync problem. Please retry business setup");
    } finally {
      setIsSubmitting(false);
    }
  };

  const enterMerchantDashboard = (id: string) => {
    onSelectBusiness(id);
    onNavigateToRole("business");
    setShowRegModal(false);
    setSuccessNewBiz(null);
  };

  return (
    <div id="landing-page" className="space-y-16 py-4 animate-fadeIn">
      
      {/* HERO SECTION */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/40 via-[#0c0e14] to-purple-950/20 border border-white/10 p-8 md:p-14 text-center space-y-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent -z-10" />
        
        {/* Callout badge */}
        <div className="inline-flex items-center gap-1.5 bg-indigo-500/10 text-indigo-300 px-3.5 py-1.5 rounded-full border border-indigo-500/25 text-xs font-mono font-bold mx-auto">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
          <span>CRYPTOGRAPHIC B2B LOYALTY LEDGER</span>
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
        </div>

        <div className="max-w-3xl mx-auto space-y-4">
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-none uppercase">
            Retain More Customers with <br className="hidden md:inline"/>
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Digital Loyalty Cards
            </span>
          </h1>
          <p className="text-sm md:text-base text-slate-300 leading-relaxed font-medium">
            Deploy secure mobile loyalty systems in minutes. Launch scan-to-claim stamp cards, 
            time-bound anti-counterfeit receipt vouchers, and real-time loyalty web applications 
            fully integrated with local gateways like <b className="text-white font-bold">eSewa</b> and global systems.
          </p>
        </div>

        {/* CTA Elements */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-md mx-auto">
          <button
            onClick={() => {
              setBizName("");
              setBizId("");
              setRewardDesc("");
              setSuccessNewBiz(null);
              setRegError("");
              setShowRegModal(true);
            }}
            className="w-full sm:w-auto bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-95 text-white font-black text-sm px-6 py-3.5 rounded-xl cursor-pointer shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 uppercase tracking-wider relative group overflow-hidden"
          >
            <Building2 className="w-4 h-4" />
            <span>Launch Free Trial</span>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded font-mono ml-1 font-bold">14-Days</span>
          </button>
          
          <button
            onClick={() => onNavigateToRole("customer")}
            className="w-full sm:w-auto bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border border-white/10 font-black text-sm px-6 py-3.5 rounded-xl cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider"
          >
            <span>Explore Live Sandbox</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Interactive Feature Highlights ticker */}
        <div className="pt-8 border-t border-white/5 max-w-4xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4 text-left">
          <div className="bg-white/3 border border-white/5 rounded-2xl p-4 space-y-1">
            <span className="text-xs font-mono font-black text-indigo-400">01 / STAMPS CARD</span>
            <h4 className="text-xs font-bold text-white uppercase">12H Cooldown Gate</h4>
            <p className="text-[10px] text-slate-400 leading-normal">Hardened rate limiters protect merchants from immediate double scanning.</p>
          </div>
          <div className="bg-white/3 border border-white/5 rounded-2xl p-4 space-y-1">
            <span className="text-xs font-mono font-black text-indigo-400">02 / SECURE POINTS</span>
            <h4 className="text-xs font-bold text-white uppercase">HMAC SHA256 Signature</h4>
            <p className="text-[10px] text-slate-400 leading-normal">5-minute ticket expiration with random nonces to prevent replay forgery claims.</p>
          </div>
          <div className="bg-white/3 border border-white/5 rounded-2xl p-4 space-y-1">
            <span className="text-xs font-mono font-black text-indigo-400">03 / REAL ANALYTICS</span>
            <h4 className="text-xs font-bold text-white uppercase">B2B Live Ledgers</h4>
            <p className="text-[10px] text-slate-400 leading-normal">Track revenue, active registered membership volume, and coupon claims.</p>
          </div>
          <div className="bg-white/3 border border-white/5 rounded-2xl p-4 space-y-1">
            <span className="text-xs font-mono font-black text-indigo-400">04 / EMBEDDABLE</span>
            <h4 className="text-xs font-bold text-white uppercase">Iframe Web Widget</h4>
            <p className="text-[10px] text-slate-400 leading-normal">Paste our dynamic card pass onto your existing eSewa checkout sites.</p>
          </div>
        </div>
      </section>

      {/* DETAILED DOUBLE MODE COMPASS (STAMPS AND POINTS BOTH) */}
      <section className="space-y-6">
        <div className="text-center space-y-1.5">
          <h2 className="text-xl font-black text-white uppercase tracking-wider">Two Native Loyalty Mechanics in One Account</h2>
          <p className="text-xs text-slate-400 max-w-lg mx-auto">Switch between stamps and points modes instantaneously, allowing you to choose the exact customer conversion tactic that suits your company brand.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Card Stamp Mechanics */}
          <div className="glass-panel border border-white/10 rounded-3xl p-6 md:p-8 space-y-4 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-4 right-4 text-[42px] opacity-10 select-none">💮</div>
            <div className="space-y-3.5">
              <div className="bg-indigo-500/10 text-indigo-300 w-10 h-10 rounded-lg flex items-center justify-center border border-indigo-500/20 font-bold">A</div>
              <h3 className="text-base font-black text-indigo-300 uppercase tracking-widest font-mono">Mobile Browser Stamp Card</h3>
              <p className="text-xs text-slate-300 leading-relaxed font-semibold">
                Perfect for quick high-frequency retail outlets (coffee cafes, burger joints, micro-bistros). Provide static QR stands on dining tables. Customers join without apps, collecting stamped badges inside their native browser wallets.
              </p>
              
              <ul className="text-[11px] text-slate-400 space-y-2 pt-1 font-mono">
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" /> Target thresholds customization (8, 10, or 12 stamps)</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" /> Local 12-hour antispam safety gates</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" /> Automatic claim notifications in inbox</li>
              </ul>
            </div>
            
            <div className="pt-6 border-t border-white/5 flex justify-between items-center mt-4">
              <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider">Stamps Trial Feature: <b className="text-emerald-400">ACTIVE</b></span>
              <button onClick={() => onNavigateToRole("customer")} className="text-xs text-indigo-300 font-extrabold flex items-center gap-1 hover:text-white transition cursor-pointer">
                <span>View Stamp Simulator</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Secure Points Mechanics */}
          <div className="glass-panel border border-white/10 rounded-3xl p-6 md:p-8 space-y-4 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-4 right-4 text-[42px] opacity-10 select-none">💎</div>
            <div className="space-y-3.5">
              <div className="bg-purple-500/10 text-purple-300 w-10 h-10 rounded-lg flex items-center justify-center border border-purple-500/20 font-bold">B</div>
              <h3 className="text-base font-black text-purple-300 uppercase tracking-widest font-mono">Dynamic Secure Points Matrix</h3>
              <p className="text-xs text-slate-300 leading-relaxed font-semibold">
                Designed for retail shops, organic outfitters, and high-value gear merchants. Cashiers input real purchase receipt balances. The secure sign token encrypts to distribute point conversion values dynamically upon checkout scanning.
              </p>
              
              <ul className="text-[11px] text-slate-400 space-y-2 pt-1 font-mono">
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-purple-400 shrink-0" /> Custom exchange values (e.g. 1 NPR spent = 1 point)</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-purple-400 shrink-0" /> Random single-use hashes prevent double scans</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-purple-400 shrink-0" /> Expiry Longevity windows protect network claims</li>
              </ul>
            </div>
            
            <div className="pt-6 border-t border-white/5 flex justify-between items-center mt-4">
              <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider">Points Trial Feature: <b className="text-emerald-400">ACTIVE</b></span>
              <button onClick={() => onNavigateToRole("business")} className="text-xs text-purple-300 font-extrabold flex items-center gap-1 hover:text-white transition cursor-pointer">
                <span>Generate Point QR Code</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* SPECIAL PROMO: 14-DAY PREMIUM SUB GIVING ACCESS TO BOTH STAMPS AND POINTS */}
      <section className="bg-indigo-950/20 border border-indigo-500/30 rounded-3xl p-6 md:p-10 flex flex-col lg:flex-row justify-between items-center gap-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-indigo-500/5 -z-10" />
        
        <div className="space-y-3 text-center lg:text-left">
          <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 py-1 px-2.5 rounded-full font-bold uppercase tracking-widest">
            PROMOTIONAL LIMITED TRIAL OFFER 🌟
          </span>
          <h3 className="text-lg md:text-2xl font-black text-white uppercase tracking-tight">
            Register and Unlock Both Systems Instantly
          </h3>
          <p className="text-xs text-slate-300 max-w-xl font-medium leading-relaxed">
            Unlike other legacy loyalty aggregators that lock you into rigid templates, <b>Remix Loyalty</b> gives 
            self-registering partners complete B2C permissions on the Premium ledger tier for 14 Days free. 
            Test points rewards, dispatch broadcast news, check rate-limiting algorithms, and claim stamps in one system.
          </p>
        </div>

        <button
          onClick={() => {
            setBizName("");
            setBizId("");
            setRewardDesc("");
            setSuccessNewBiz(null);
            setRegError("");
            setShowRegModal(true);
          }}
          className="bg-white text-indigo-950 font-black text-xs py-3.5 px-6 rounded-xl transition duration-150 hover:bg-slate-100 cursor-pointer shadow-lg tracking-wider uppercase shrink-0"
        >
          Activate Trial Registrations
        </button>
      </section>

      {/* PRICING PLANS SECTION */}
      <section className="space-y-6">
        <div className="text-center space-y-1.5">
          <h2 className="text-xl font-black text-white uppercase tracking-wider">Merchant Pricing Matrix</h2>
          <p className="text-xs text-slate-400 max-w-lg mx-auto">Scaling tiers for growing businesses. Select our premium configuration today with an unrestricted 14-day free trial.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Plan 1 */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 relative flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <span className="text-[9px] text-slate-400 uppercase font-black block">Tier 01</span>
              <h4 className="text-base font-black text-white uppercase">Lifetime Free Plan</h4>
              <p className="text-[10px] text-slate-300 leading-normal">Ideal for single pop-up cafes looking to digitize their immediate customers experience.</p>
              
              <div className="py-2.5">
                <span className="text-xl font-black text-indigo-300 font-mono">NPR 0</span>
                <span className="text-[10px] text-slate-400 font-mono"> / free forever</span>
              </div>
              
              <ul className="text-[11px] text-slate-400 space-y-2 border-t border-white/5 pt-4">
                <li className="flex items-center gap-1.5 font-medium"><Check className="w-3.5 h-3.5 text-slate-400" /> Up to 50 loyalty members</li>
                <li className="flex items-center gap-1.5 font-medium"><Check className="w-3.5 h-3.5 text-slate-400" /> Standard stamps or points</li>
                <li className="flex items-center gap-1.5 font-medium"><Check className="w-3.5 h-3.5 text-slate-400" /> 3 broadcast items/month</li>
              </ul>
            </div>
            <button 
              onClick={() => {
                setSelectedLoyaltyMode("stamp");
                setBizId("");
                setBizName("");
                setRewardDesc("");
                setShowRegModal(true);
              }}
              className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-extrabold text-[11px] py-2.5 rounded-xl cursor-pointer uppercase transition"
            >
              Sign Up Free
            </button>
          </div>

          {/* Plan 2: PREMIUM IN TRIAL OFFER */}
          <div className="bg-indigo-950/40 border-2 border-indigo-500 rounded-3xl p-6 relative flex flex-col justify-between space-y-6 shadow-2xl">
            <div className="absolute top-0 right-6 -translate-y-1/2 bg-indigo-500 text-white text-[9px] font-mono font-black py-1 px-3 rounded-full uppercase tracking-widest leading-none">
              14-Day Free Trial Offered ⭐
            </div>
            
            <div className="space-y-3">
              <span className="text-[9px] text-indigo-300 uppercase font-black block">Tier 02 (Premium)</span>
              <h4 className="text-base font-black text-white uppercase">Premium Growth Plan</h4>
              <p className="text-[10px] text-indigo-100 leading-normal">High-performance digital retain solutions. Test unlimited features. Fully included inside trial package.</p>
              
              <div className="py-2.5">
                <span className="text-xl font-black text-indigo-300 font-mono">NPR 1,500</span>
                <span className="text-[10px] text-slate-400 font-mono"> / mo after trial</span>
              </div>
              
              <ul className="text-[11px] text-slate-300 space-y-2 border-t border-indigo-500/20 pt-4 font-semibold">
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" /> Up to 1,000 enrolled members</li>
                <li className="flex items-center gap-1.5 text-emerald-300 font-black"><Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Dual Points & Stamp engines!</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" /> 20 broadcast alerts/month</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" /> Dynamic HMAC secure Point QR generation</li>
              </ul>
            </div>
            
            <button 
              onClick={() => {
                setSelectedLoyaltyMode("point");
                setBizId("");
                setBizName("");
                setRewardDesc("");
                setShowRegModal(true);
              }}
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-black text-[11px] py-2.5 rounded-xl cursor-pointer uppercase transition shadow-md shadow-indigo-500/20"
            >
              Start 14-Day Premium Trial
            </button>
          </div>

          {/* Plan 3 */}
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 relative flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <span className="text-[9px] text-slate-400 uppercase font-black block">Tier 03</span>
              <h4 className="text-base font-black text-white uppercase">Enterprise Ledger</h4>
              <p className="text-[10px] text-slate-300 leading-normal">Custom deployment with white-labeled merchant codes, priority settlement, and unlimited capacity API access.</p>
              
              <div className="py-2.5">
                <span className="text-xl font-black text-indigo-300 font-mono">NPR 5,000</span>
                <span className="text-[10px] text-slate-400 font-mono"> / month</span>
              </div>
              
              <ul className="text-[11px] text-slate-400 space-y-2 border-t border-white/5 pt-4">
                <li className="flex items-center gap-1.5 font-medium"><Check className="w-3.5 h-3.5 text-slate-400" /> Unlimited loyalty members</li>
                <li className="flex items-center gap-1.5 font-medium"><Check className="w-3.5 h-3.5 text-slate-400" /> Custom branding domain names</li>
                <li className="flex items-center gap-1.5 font-medium"><Check className="w-3.5 h-3.5 text-slate-400" /> 100 broadcast alerts/month</li>
                <li className="flex items-center gap-1.5 font-medium"><Check className="w-3.5 h-3.5 text-slate-400" /> Dedicated SLA support representative</li>
              </ul>
            </div>
            <button 
              onClick={() => {
                setSelectedLoyaltyMode("point");
                setBizId("");
                setBizName("");
                setRewardDesc("");
                setShowRegModal(true);
              }}
              className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-extrabold text-[11px] py-2.5 rounded-xl cursor-pointer uppercase transition"
            >
              Contact Solutions
            </button>
          </div>

        </div>
      </section>

      {/* QUICK INSTRUCTIONS ON SANDBOX INTEGRITY */}
      <section className="bg-white/3 border border-white/5 rounded-3xl p-6 space-y-4">
        <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
          <HelpCircle className="w-4 h-4 text-indigo-400" /> Frequently Asked Questions
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[11px] leading-relaxed font-sans">
          <div className="space-y-1 bg-white/2 p-4 rounded-2xl border border-white/5">
            <p className="font-extrabold text-slate-200">Is there any credit card or eSewa authorization required to register?</p>
            <p className="text-slate-400 font-medium font-sans">Absolutely not. Our self-registration utilizes open database ledgers. Simply submit your information block, configure rules, and test immediate claims instantly.</p>
          </div>
          <div className="space-y-1 bg-white/2 p-4 rounded-2xl border border-white/5">
            <p className="font-extrabold text-slate-200">How do we switch between Stamps mode and points reward Mode?</p>
            <p className="text-slate-400 font-medium font-sans">During your 14-day free trial on the Premium Growth Plan, you maintain access to both engines! Go to the 'Loyalty Rules Setup' tab in the Merchant view, select your desired option, and click save.</p>
          </div>
        </div>
      </section>

      {/* CONTACT US & ONBOARDING HUB WITH WHATSAPP INTEGRATION */}
      <section id="contact-us-section" className="bg-gradient-to-br from-indigo-950/20 via-[#0c0e14] to-emerald-950/20 border border-white/10 rounded-3xl p-6 md:p-10 space-y-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider">
            <MessageCircle className="w-3.5 h-3.5 text-emerald-400" /> Active Merchant Support Desk
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">
            Need Custom Integration? Let's Talk!
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed max-w-lg mx-auto">
            Get personalized onboarding. Register your Nepalese or global business, integrate local wallets, or requested custom features via our instant WhatsApp desk.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch pt-2">
          
          {/* Quick Contact Metas */}
          <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-xs font-black text-indigo-300 uppercase tracking-widest font-mono">
                Direct Onboarding Channels
              </h3>
              
              {/* WhatsApp Premium Support Box */}
              <a 
                href="https://wa.me/9779861774000?text=Hello%20Remix%20Loyalty!%20I%20want%20to%20onboard%20my%20business%20to%20the%20loyalty%20system."
                target="_blank" 
                rel="noopener noreferrer"
                className="block bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 hover:border-emerald-400 hover:bg-emerald-950/60 transition duration-150 group"
              >
                <div className="flex items-start gap-3.5">
                  <div className="bg-emerald-500/20 text-emerald-400 p-2.5 rounded-xl border border-emerald-500/30 group-hover:scale-105 transition duration-150">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div className="text-xs space-y-1">
                    <div className="flex items-center gap-1.5 justify-between">
                      <span className="font-black text-white uppercase">Direct WhatsApp Line</span>
                      <span className="text-[8px] bg-emerald-500/20 text-emerald-400 font-bold px-1.5 py-0.2 rounded-full tracking-wider animate-pulse flex items-center gap-1">
                        <span className="w-1 h-1 bg-emerald-400 rounded-full"></span> ONLINE
                      </span>
                    </div>
                    <p className="text-emerald-300 font-mono font-bold tracking-wide text-sm">+977 9861774000</p>
                    <p className="text-slate-400 leading-normal text-[10.5px]">Tap to instantly open WhatsApp. Chat directly with the product supervisor to get immediate privilege keys.</p>
                  </div>
                </div>
              </a>

              {/* Standard Corporate channels */}
              <div className="bg-[#0c0e14]/80 border border-white/5 rounded-2xl p-4.5 space-y-3 font-medium text-[11px]">
                <div className="flex items-center gap-3 text-slate-300">
                  <Phone className="w-4 h-4 text-indigo-400 shrink-0" />
                  <div>
                    <p className="text-slate-400 font-normal">Direct Telephone Helpline</p>
                    <p className="font-mono font-bold text-white tracking-wider">+977 9861774000</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 text-slate-300 border-t border-white/5 pt-3">
                  <Mail className="w-4 h-4 text-indigo-400 shrink-0" />
                  <div>
                    <p className="text-slate-400 font-normal">Corporate Product Inquiry</p>
                    <p className="font-mono font-bold text-white">hello@remixloyalty.com</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-slate-300 border-t border-white/5 pt-3">
                  <MapPin className="w-4 h-4 text-indigo-400 shrink-0" />
                  <div>
                    <p className="text-slate-400 font-normal">Headquarters Base</p>
                    <p className="text-white font-bold leading-normal">New Baneshwor Plaza, Ward 10, Kathmandu, Nepal</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick trust banner */}
            <div className="bg-indigo-950/20 border border-indigo-500/20 p-4 rounded-2xl text-[10px] text-indigo-200 leading-relaxed font-sans mt-4">
              🛡️ <b>Secure API Guarantee:</b> We protect your customer databases with localized nonces and zero-knowledge ledger keys. Custom developments support SMS automation via local telecom operators.
            </div>
          </div>

          {/* Interactive Form */}
          <div className="lg:col-span-7 bg-[#0c0e14]/60 border border-white/10 rounded-2xl p-5 md:p-6.5 flex flex-col justify-between space-y-4">
            
            {!contactSuccess ? (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const encodedMsg = encodeURIComponent(
                    `Hello Remix Loyalty Team!\n\nName: ${contactName}\nPhone: ${contactPhone}\nBusiness Brand: ${contactBrand}\nInquiry: ${contactMessage}`
                  );
                  window.open(`https://wa.me/9779861774000?text=${encodedMsg}`, "_blank");
                  setContactSuccess(true);
                }} 
                className="space-y-4 text-xs font-sans"
              >
                <h4 className="text-xs font-black text-slate-200 uppercase tracking-widest font-mono">
                  Send Onboarding Request Form
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-450 uppercase font-black tracking-wider block">Your Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Ramesh Giri"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      required
                      className="w-full bg-[#0c0e14]/90 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-450 uppercase font-black tracking-wider block">WhatsApp Number</label>
                    <input 
                      type="tel" 
                      placeholder="e.g. 9861774000"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      required
                      className="w-full bg-[#0c0e14]/90 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-450 uppercase font-black tracking-wider block">Retail Shop / Pizza Bar / Cafe Brand</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Baneshwor Bakery & Bistro"
                    value={contactBrand}
                    onChange={(e) => setContactBrand(e.target.value)}
                    required
                    className="w-full bg-[#0c0e14]/90 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-450 uppercase font-black tracking-wider block">Briefly describe your requirements</label>
                  <textarea 
                    rows={3}
                    placeholder="Tell us about your target rewards, expected daily customer traffic, or custom feature requests..."
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    required
                    className="w-full bg-[#0c0e14]/90 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-gradient-to-r from-emerald-500 to-indigo-600 hover:opacity-95 text-white font-black text-xs py-3 rounded-xl transition duration-150 uppercase tracking-wider shadow-md shadow-emerald-500/15 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-300" />
                  <span>Submit Inquiry & Open on WhatsApp</span>
                </button>
              </form>
            ) : (
              <div className="text-center py-6 space-y-4 animate-fadeIn text-white flex flex-col items-center justify-center h-full">
                <div className="bg-emerald-500/10 text-emerald-400 p-3 rounded-full border border-emerald-500/20">
                  <Check className="w-7 h-7" />
                </div>
                <div className="space-y-1.5">
                  <h5 className="text-sm font-black uppercase tracking-tight text-white">Inquiry Compiled Successfully!</h5>
                  <p className="text-xs text-slate-300 max-w-sm mx-auto font-medium leading-relaxed">
                    We've redirected your onboarding request to our official WhatsApp helpline at <b>+977 9861774000</b>. 
                  </p>
                </div>

                <div className="bg-[#0c0e14] border border-white/5 p-3 rounded-xl text-left text-[10.5px] font-mono text-slate-350 space-y-1 w-full max-w-sm pl-4">
                  <p>👤 <b>Applicant:</b> {contactName}</p>
                  <p>📞 <b>Phone:</b> {contactPhone}</p>
                  <p>🏢 <b>Brand:</b> {contactBrand}</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 w-full max-w-sm pt-2">
                  <a 
                    href={`https://wa.me/9779861774000?text=${encodeURIComponent(
                      `Hello Remix Loyalty Team!\n\nName: ${contactName}\nPhone: ${contactPhone}\nBusiness Brand: ${contactBrand}\nInquiry: ${contactMessage}`
                    )}`}
                    target="_blank" 
                    rel="noreferrer"
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-[10px] py-2.5 rounded-lg text-center uppercase tracking-wider block"
                  >
                    Open Chat Again 💬
                  </a>
                  <button 
                    onClick={() => {
                      setContactName("");
                      setContactPhone("");
                      setContactBrand("");
                      setContactMessage("");
                      setContactSuccess(false);
                    }}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold text-[10px] py-2.5 rounded-lg text-center uppercase tracking-wider"
                  >
                    Send Another Response
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>
      </section>

      {/* PROFESSIONAL HIGH-POLISHED PLATFORM FOOTER */}
      <footer className="border-t border-white/10 bg-[#07080c] -mx-4 -mb-4 pt-10 pb-8 rounded-b-3xl text-xs text-slate-400 font-sans mt-8">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Col 1 Brand statement */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-1.5 rounded-lg">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="font-black text-white uppercase tracking-wider font-mono text-[13px]">REMIX LOYALTY</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              Transform random walk-in traffic into highly loyal returning customers using our cryptographic sandbox stamp matrices and instant SMS receipt automation codes.
            </p>
            <p className="text-[10px] text-slate-500 font-mono">
              Designed & Engineered in Kathmandu, Nepal.
            </p>
          </div>

          {/* Col 2 Interface shortcuts */}
          <div className="space-y-3">
            <h5 className="font-extrabold uppercase font-mono tracking-widest text-[10px] text-indigo-300">Sandbox Ecosystem</h5>
            <ul className="space-y-2 text-[11px] font-medium">
              <li>
                <button onClick={() => onNavigateToRole("customer")} className="hover:text-white transition cursor-pointer text-left">
                  📱 Mobile Customer Wallet Simulator
                </button>
              </li>
              <li>
                <button onClick={() => onNavigateToRole("business")} className="hover:text-white transition cursor-pointer text-left">
                  🏢 B2B Merchant Ledger Portal
                </button>
              </li>
              <li>
                <button onClick={() => onNavigateToRole("admin")} className="hover:text-white transition cursor-pointer text-left">
                  🔑 Global System Administration Console
                </button>
              </li>
              <li>
                <a href="#contact-us-section" className="hover:text-white transition">
                  📩 WhatsApp Onboarding Form
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3 Integrations features */}
          <div className="space-y-3">
            <h5 className="font-extrabold uppercase font-mono tracking-widest text-[10px] text-indigo-300">Native Gateways</h5>
            <ul className="space-y-2 text-[11px] leading-normal font-medium text-slate-405">
              <li className="flex items-center gap-1.5 font-semibold text-slate-400">
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span> eSewa Merchant Wallet APIs
              </li>
              <li className="flex items-center gap-1.5 font-semibold text-slate-400">
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span> Khalti Instant SDK Webhooks
              </li>
              <li className="flex items-center gap-1.5 font-semibold text-slate-400">
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span> HMAC-SHA256 Ticket Engines
              </li>
              <li className="flex items-center gap-1.5 font-semibold text-slate-400">
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></span> GPS Geo Locational Fencing codes
              </li>
            </ul>
          </div>

          {/* Col 4 Direct WhatsApp Helpline desk widget */}
          <div className="space-y-3 bg-white/3 border border-white/5 p-4 rounded-2xl">
            <h5 className="font-extrabold uppercase font-mono tracking-widest text-[10px] text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span> Live Support Channel
            </h5>
            <p className="text-[10px] text-slate-400 leading-normal">
              Direct connection with the supervisor of Remix Loyalty for instant B2B setup queries and license approvals.
            </p>
            <a 
              href="https://wa.me/9779861774000?text=Hello%20Remix%20Team!%20Please%20guide%20me%20on%20how%20to%20obtain%20a%20partner%20license."
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-[10.5px] py-1.5 px-3 rounded-xl text-center uppercase tracking-wider flex items-center justify-center gap-1.5 transition"
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span>WhatsApp Chat</span>
            </a>
          </div>

        </div>

        {/* copyright metadata block */}
        <div className="max-w-7xl mx-auto px-6 border-t border-white/5 mt-8 pt-5 flex flex-col sm:flex-row justify-between items-center gap-3 text-[10px] text-slate-500 font-mono">
          <p>© 2026 Remix Loyalty Ledger Network Ltd. All rights reserved.</p>
          <div className="flex gap-4">
            <span className="hover:text-slate-350 cursor-pointer">Terms of Service</span>
            <span>•</span>
            <span className="hover:text-slate-350 cursor-pointer">Privacy Protection Ledger</span>
            <span>•</span>
            <span className="hover:text-slate-350 cursor-pointer">ISO 27001 Cryptographic Certified</span>
          </div>
        </div>
      </footer>

      {/* FLOAT STICKY WHATSAPP ASSIST WIDGET FOR CONTINUOUS OUTSIDE INTERACTION */}
      <div className="fixed bottom-5 right-5 z-40 animate-bounce group">
        <a 
          href="https://wa.me/9779861774000?text=Hello!%20I'm%20visiting%20your%20website%20and%20want%20to%20learn%20more%25."
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[11px] py-2.5 px-4 rounded-full shadow-2xl shadow-emerald-600/30 transition-all duration-150 border border-emerald-400/30"
          title="Chat on WhatsApp"
        >
          <MessageCircle className="w-4.5 h-4.5 text-white animate-pulse" />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-out font-black uppercase tracking-wider block">
            WhatsApp Support: 9861774000
          </span>
          <span className="font-black uppercase tracking-wider block sm:group-hover:hidden">
            WhatsApp Desk
          </span>
        </a>
      </div>

      {/* REGISTRATION MODAL FORM */}
      {showRegModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-white/10 max-w-lg w-full rounded-3xl p-6 md:p-8 shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto">
            
            {/* Close button */}
            <button 
              onClick={() => setShowRegModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-full bg-white/5 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {!successNewBiz ? (
              <form onSubmit={handleRegister} className="space-y-5 text-white">
                
                {/* Header */}
                <div className="space-y-1 text-center">
                  <div className="bg-indigo-500/10 text-indigo-400 p-3 rounded-2xl w-14 h-14 mx-auto flex items-center justify-center border border-indigo-500/25">
                    <UserPlus className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-black tracking-tight uppercase">Quick Merchant Registration</h3>
                  <p className="text-[11px] text-slate-400 font-medium tracking-wide">
                    Enroll instantly under the <span className="text-indigo-400 font-black">14-Day Free Trial</span>. Custom stamps & points loyalty active.
                  </p>
                </div>

                {regError && (
                  <p className="text-[11px] p-3 rounded-lg border border-red-500/20 bg-red-500/15 text-red-300 font-black text-center animate-shake">
                    ⚠️ {regError}
                  </p>
                )}

                {/* Form fields layout */}
                <div className="space-y-3 text-xs">
                  
                  {/* Name & ID Slug */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider block">Retail Brand Name</label>
                      <input 
                        type="text"
                        placeholder="e.g. Pashupatinath Coffee Roast"
                        value={bizName}
                        onChange={(e) => handleNameChange(e.target.value)}
                        required
                        className="w-full bg-[#0c0e14]/90 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold font-sans text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider block">URL Key Identifier</label>
                      <input 
                        type="text"
                        placeholder="e.g. pashupati-coffee"
                        value={bizId}
                        onChange={(e) => setBizId(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                        required
                        className="w-full bg-[#0c0e14]/90 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono font-bold text-indigo-300 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Location & Operating Currency */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider block">Country</label>
                      <input 
                        type="text"
                        placeholder="e.g. Nepal"
                        value={bizCountry}
                        onChange={(e) => setBizCountry(e.target.value)}
                        required
                        className="w-full bg-[#0c0e14]/90 border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider block">City Location</label>
                      <input 
                        type="text"
                        placeholder="e.g. Kathmandu"
                        value={bizCity}
                        onChange={(e) => setBizCity(e.target.value)}
                        required
                        className="w-full bg-[#0c0e14]/90 border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider block">Currency Code</label>
                      <select 
                        value={bizCurrency}
                        onChange={(e) => setBizCurrency(e.target.value)}
                        className="w-full bg-[#0c0e14]/90 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="NPR">NPR (Rs.)</option>
                        <option value="USD">USD ($)</option>
                        <option value="INR">INR (₹)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="EUR">EUR (€)</option>
                      </select>
                    </div>
                  </div>

                  {/* Initial Loyalty Choice */}
                  <div className="bg-white/5 p-3 rounded-2xl border border-white/10 space-y-2">
                    <label className="text-[10px] text-indigo-300 uppercase font-black tracking-wider block">
                      Starting Loyalty Mode (Flip live during trial)
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setSelectedLoyaltyMode("stamp")}
                        className={`py-2 px-3 rounded-xl border text-center font-bold font-sans cursor-pointer transition ${
                          selectedLoyaltyMode === "stamp"
                            ? "bg-indigo-500 text-white border-indigo-500"
                            : "bg-black/40 text-slate-400 border-white/10 hover:text-white"
                        }`}
                      >
                        💮 Stamp Cards
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedLoyaltyMode("point")}
                        className={`py-2 px-3 rounded-xl border text-center font-bold font-sans cursor-pointer transition ${
                          selectedLoyaltyMode === "point"
                            ? "bg-indigo-500 text-white border-indigo-500"
                            : "bg-black/40 text-slate-400 border-white/10 hover:text-white"
                        }`}
                      >
                        💎 Points Ledger
                      </button>
                    </div>
                    <p className="text-[9.5px] text-slate-400 text-center font-medium">
                      Both features are fully functional inside your trial container!
                    </p>
                  </div>

                  {/* Reward Threshold settings inputs dynamically */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {selectedLoyaltyMode === "stamp" ? (
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider block">Target Stamps Goal</label>
                        <input 
                          type="number"
                          min="3"
                          max="20"
                          value={stampLimit}
                          onChange={(e) => setStampLimit(parseInt(e.target.value || "10"))}
                          className="w-full bg-[#0c0e14]/90 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none"
                        />
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider block">Target Points Goal</label>
                        <input 
                          type="number"
                          min="50"
                          max="5000"
                          value={pointsLimit}
                          onChange={(e) => setPointsLimit(parseInt(e.target.value || "500"))}
                          className="w-full bg-[#0c0e14]/90 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none"
                        />
                      </div>
                    )}
                    
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider block">Coupon Offer Description</label>
                      <input 
                        type="text"
                        placeholder="e.g. Free Hot Cappuccino or 10% Discount"
                        value={rewardDesc}
                        onChange={(e) => setRewardDesc(e.target.value)}
                        required
                        className="w-full bg-[#0c0e14]/90 border border-white/10 rounded-xl px-3 py-2 text-xs font-sans font-bold text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Payment Gateway for simulation Billing */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider block">Local Gateway integration</label>
                    <select
                      value={gatewayValue}
                      onChange={(e) => setGatewayValue(e.target.value as any)}
                      className="w-full bg-[#0c0e14]/90 border border-white/10 rounded-xl px-3 py-2 text-xs font-sans font-extrabold text-white focus:outline-none"
                    >
                      <option value="esewa">eSewa Wallet (Nepal Sandbox Integration)</option>
                      <option value="khalti">Khalti Instant (Pokhara Outlets Integration)</option>
                      <option value="stripe">Stripe international (Global Card Settlements)</option>
                    </select>
                  </div>

                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-emerald-500 to-indigo-600 hover:opacity-95 text-white font-black text-xs py-3.5 rounded-xl transition duration-150 shadow-lg tracking-wider uppercase cursor-pointer flex justify-center items-center gap-2"
                  >
                    {isSubmitting ? (
                      <span>Synchronizing Ledger Ledger...</span>
                    ) : (
                      <>
                        <span>Activate 14-Day Free Premium Trial</span>
                        <Check className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>

                <p className="text-[8.5px] text-slate-500 text-center font-mono">
                  * Dynamic credentials setup. No actual bank details necessary. Complete local sandbox state storage.
                </p>

              </form>
            ) : (
              <div className="text-center space-y-6 py-4 text-white animate-fadeIn">
                <div className="bg-emerald-500/10 text-emerald-400 p-4 rounded-full w-20 h-20 mx-auto flex items-center justify-center border border-emerald-500/35">
                  <ShieldCheck className="w-10 h-10 animate-pulse" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-black uppercase tracking-tight">🎉 B2B Portal Activated Successfully!</h3>
                  <p className="text-xs text-slate-350 max-w-sm mx-auto font-medium">
                    Your brand <b className="text-indigo-400">{successNewBiz.name}</b> has been written to the persistent ledger.
                  </p>
                </div>

                <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-2xl text-left text-xs max-w-sm mx-auto space-y-2 font-mono">
                  <div className="flex justify-between border-b border-white/5 pb-1">
                    <span className="text-slate-400">Merchant ID:</span>
                    <span className="text-white font-black">{successNewBiz.id}</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1">
                    <span className="text-slate-400">Subscription Trial:</span>
                    <span className="text-emerald-300 font-bold">14 Days Free Active (Both modes)</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-1">
                    <span className="text-slate-400">Renewal Plan:</span>
                    <span className="text-white">Premium Tier (NPR 1,500/mo)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Coupon Code:</span>
                    <span className="text-white truncate max-w-[150px]">{successNewBiz.rewardDescription}</span>
                  </div>
                </div>

                <button
                  onClick={() => enterMerchantDashboard(successNewBiz.id)}
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black text-xs py-3.5 rounded-xl cursor-pointer shadow-lg tracking-wider uppercase transition inline-block text-center"
                >
                  Enter Merchant Dashboard Now 🏢
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
