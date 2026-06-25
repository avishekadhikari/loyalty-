import React, { useState, useEffect } from "react";
import { 
  User, Building2, Shield, RefreshCw, AlertCircle, Sparkles, HelpCircle, Laptop, CreditCard, X, CheckCircle2, Globe
} from "lucide-react";
import { AppDatabase } from "./types";
import CustomerPanel from "./components/CustomerPanel";
import BusinessPanel from "./components/BusinessPanel";
import AdminPanel from "./components/AdminPanel";
import MarketingPage from "./components/MarketingPage";

export default function App() {
  // Active viewing context
  const [activeRole, setActiveRole] = useState<"landing" | "customer" | "business" | "admin">("landing");
  
  // Storage State
  const [db, setDb] = useState<AppDatabase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Simulation context mappings
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("aarav-sharma");
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>("kathmandu-coffee");

  // Admin access gate states
  const [isAdminAuthed, setIsAdminAuthed] = useState<boolean>(() => sessionStorage.getItem("admin_authed") === "true");
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [adminAuthError, setAdminAuthError] = useState("");

  // Scan detection states
  const [qrScanActionStatus, setQrScanActionStatus] = useState<{ success: boolean; title: string; message: string } | null>(null);

  // Fetch full DB summary
  const fetchDB = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await fetch("/api/db");
      if (!res.ok) throw new Error("Faulty response code from platform servers");
      const data: AppDatabase = await res.json();
      setDb(data);
      setLoadError(null);
    } catch (err: any) {
      console.error("Database fetch failed:", err);
      setLoadError("Server ledger unreachable. Ensure backend is running.");
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  // Initial load & Poll
  useEffect(() => {
    fetchDB();
    
    // Auto-polling interval every 3 seconds to keep Customer, Business, and Admin panels perfectly synchronized!
    const poll = setInterval(() => {
      fetchDB(true);
    }, 3000);

    return () => clearInterval(poll);
  }, []);

  // Parse incoming QR Mobile Scans from URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get("role");
    const enrollParam = params.get("enroll");
    const claimParam = params.get("claim");

    if (roleParam === "customer") {
      setActiveRole("customer");
    }

    const processUrlScan = async () => {
      // Get base customer context
      const customerIdToUse = "aarav-sharma"; // Aarav Sharma (Nepal Showcase) as Default Customer for mobile redirects
      
      if (enrollParam) {
        setIsLoading(true);
        try {
          const res = await fetch("/api/customer/enroll", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              customerId: customerIdToUse,
              businessId: enrollParam,
              customerName: "Aarav Sharma", 
              customerEmail: "aarav.sharma@gmail.com",
              customerPhone: "9861774000"
            })
          });
          const data = await res.json();
          if (res.ok) {
            setQrScanActionStatus({
              success: true,
              title: "📱 Welcome Onboard! (Mobile Scan Verified)",
              message: `You have successfully joined the loyalty group of "${data.business?.name || enrollParam}"! Your membership card is ready.`
            });
            await fetchDB(true);
          } else {
            setQrScanActionStatus({
              success: false,
              title: "QR Scan Confirmation",
              message: data.error || "Enrollment already registered. Scanning complete!"
            });
          }
        } catch (e) {
          setQrScanActionStatus({
            success: false,
            title: "Scanner Network Sync Fault",
            message: "Unable to process enrolment scan. High-risk response code."
          });
        } finally {
          setIsLoading(false);
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } else if (claimParam === "points") {
        const bizId = params.get("bizId");
        const amount = params.get("amount");
        const points = params.get("points");
        const ts = params.get("ts");
        const nonce = params.get("nonce");
        const sig = params.get("sig");

        if (bizId && amount && points && ts && nonce && sig) {
          setIsLoading(true);
          try {
            const res = await fetch("/api/customer/points", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                customerId: customerIdToUse,
                businessId: bizId,
                amount,
                points,
                timestamp: ts,
                nonce,
                signature: sig
              })
            });
            const data = await res.json();
            if (res.ok) {
              setQrScanActionStatus({
                success: true,
                title: "🎉 Points Reward Claimed! (Success)",
                message: `You have earned +${points} points at your merchant! Simulated price spent was NPR ${amount}. Secure signature signature matches.`
              });
              await fetchDB(true);
            } else {
              setQrScanActionStatus({
                success: false,
                title: "Invalid Claim QR Code",
                message: data.error || "This QR code contains an expired signature, forged token, or duplicate single-use replay nonces."
              });
            }
          } catch (e) {
            setQrScanActionStatus({
              success: false,
              title: "Network Verification Failed",
              message: "Failed to connect to the verification ledger. Check your internet connectivity."
            });
          } finally {
            setIsLoading(false);
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }
      } else if (claimParam === "stamp") {
        const bizId = params.get("bizId");
        if (bizId) {
          setIsLoading(true);
          try {
            const res = await fetch("/api/customer/stamp", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                customerId: customerIdToUse,
                businessId: bizId
              })
            });
            const data = await res.json();
            if (res.ok) {
              setQrScanActionStatus({
                success: true,
                title: "💮 Stamp Earned! (Scan Verified)",
                message: `Congratulations! A new loyalty stamp was credited to your account. Go to your wallet card to view reward threshold.`
              });
              await fetchDB(true);
            } else {
              setQrScanActionStatus({
                success: false,
                title: "Stamp Cooldown Check Status",
                message: data.error || "Stamping rate limit exceeded. 12 hour integrity window remains active."
              });
            }
          } catch (e) {
            setQrScanActionStatus({
              success: false,
              title: "Sync Problem",
              message: "Unable to sync stamp metrics. Verify router internet configuration."
            });
          } finally {
            setIsLoading(false);
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }
      }
    };

    // Process slightly delayed to support cold startup sync
    const timer = setTimeout(() => {
      processUrlScan();
    }, 700);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center text-white space-y-4 font-sans">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
        <p className="text-sm font-mono tracking-wider">Syncing Multi-Currency Loyalty Ledgers...</p>
      </div>
    );
  }

  if (loadError || !db) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center text-white p-6 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 animate-pulse" />
        <h2 className="text-lg font-bold">Ledger Synchronization Failed</h2>
        <p className="text-xs text-slate-400 max-w-sm">{loadError || "Unspecified storage error."}</p>
        <button 
          onClick={() => fetchDB()} 
          className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition border border-slate-700"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c0e14] flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* 1. Global Role Selection Hub Navigation Banner */}
      <header className="bg-white/5 backdrop-blur-xl text-white z-50 sticky top-0 border-b border-white/10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-4">
          
          {/* Logo Name */}
          <div className="flex items-center gap-2.5">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-2 rounded-xl shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight flex items-center gap-1.5 leading-none text-white">
                REMIX LOYALTY
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/10 tracking-wider text-indigo-300 border border-white/10 font-mono">B2B2C MVP</span>
              </h1>
              <p className="text-[10px] text-slate-400 leading-none mt-1">Unified loyalty for local Nepal and Global Merchants</p>
            </div>
          </div>

          {/* Interactive Toggle Pill switcher */}
          <div className="bg-slate-950/60 p-1.5 rounded-2xl flex flex-wrap gap-1 border border-white/10 shadow-inner">
            <button
              id="role-btn-landing"
              onClick={() => setActiveRole("landing")}
              className={`px-3.5 py-2 text-xs font-black rounded-lg flex items-center gap-1.5 transition-all duration-150 cursor-pointer ${
                activeRole === "landing" 
                  ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/30 font-extrabold" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Globe className="w-3.5 h-3.5" /> Platform Homepage 🌐
            </button>
            <button
              id="role-btn-customer"
              onClick={() => setActiveRole("customer")}
              className={`px-3.5 py-2 text-xs font-black rounded-lg flex items-center gap-1.5 transition-all duration-150 cursor-pointer ${
                activeRole === "customer" 
                  ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/30 font-extrabold" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <User className="w-3.5 h-3.5" /> Customer App 📱
            </button>
            <button
              id="role-btn-business"
              onClick={() => setActiveRole("business")}
              className={`px-3.5 py-2 text-xs font-black rounded-lg flex items-center gap-1.5 transition-all duration-150 cursor-pointer ${
                activeRole === "business" 
                  ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/30 font-extrabold" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" /> Merchant Portal 🏢
            </button>
            <button
              id="role-btn-admin"
              onClick={() => setActiveRole("admin")}
              className={`px-3.5 py-2 text-xs font-black rounded-lg flex items-center gap-1.5 transition-all duration-150 cursor-pointer ${
                activeRole === "admin" 
                  ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/30 font-extrabold" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Shield className="w-3.5 h-3.5" /> Global Admin 🔑
            </button>
          </div>

          {/* Live indicator check */}
          <div className="flex items-center gap-2 text-slate-400 text-xs font-mono bg-white/5 px-3 py-1 rounded-full border border-white/10">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
            <span className="text-[10px] uppercase font-bold text-slate-300">Live Sync Engaged</span>
          </div>

        </div>
      </header>

      {/* 2. Interactive Panel Frame Viewport */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 md:py-8">
        
        {/* Quick sandbox walkthrough instructions banner (Only for sandbox dashboard contexts) */}
        {activeRole !== "landing" && (
          <div className="mb-6 bg-white/5 backdrop-blur-md text-white p-5 rounded-3xl border border-white/10 shadow-xl flex items-start gap-3.5">
            <HelpCircle className="w-6 h-6 text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1.5 leading-relaxed">
              <p className="font-extrabold text-sm tracking-wide text-indigo-300">🎉 Interactive Sandbox Sandbox Setup Guides</p>
              <p className="text-slate-300">
                The customer, business, and admin panels are connected to the <b>same centralized mock ledger store</b>. 
                Switch dashboards using the selector above. Try the following combinations:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 text-slate-300 font-medium">
                <p><b>1. Enroll Customer:</b> Select "Customer App" tab, join a rewards program, and perform sandbox stamping immediately.</p>
                <p><b>2. Anti-Abuse Stamps:</b> Scan the "Stamp QR" to try cooldown rules. Success will register only once every 12 hours server check.</p>
                <p><b>3. Signed Point QR:</b> Select "Merchant Portal", generate a dynamic Points QR with an invoice, scan it in Customer App to collect points!</p>
              </div>
            </div>
          </div>
        )}

        {/* Render Panel depending on role */}
        <div className="transition-all duration-200">
          {activeRole === "landing" && (
            <div className="animate-fadeIn">
              <MarketingPage
                db={db}
                onRefresh={async () => { await fetchDB(true); }}
                onSelectBusiness={(id) => setSelectedBusinessId(id)}
                onNavigateToRole={(role) => setActiveRole(role)}
              />
            </div>
          )}

          {activeRole === "customer" && (
            <div className="animate-fadeIn">
              <CustomerPanel 
                db={db} 
                onRefresh={() => fetchDB(true)} 
                customerId={selectedCustomerId}
                setCustomerId={setSelectedCustomerId}
              />
            </div>
          )}

          {activeRole === "business" && (
            <div className="animate-fadeIn">
              <BusinessPanel 
                db={db} 
                onRefresh={() => fetchDB(true)} 
                businessId={selectedBusinessId}
                setBusinessId={setSelectedBusinessId}
              />
            </div>
          )}

          {activeRole === "admin" && (
            <div className="animate-fadeIn">
              {!isAdminAuthed ? (
                <div className="max-w-md mx-auto my-12 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl space-y-6">
                  <div className="text-center space-y-2">
                    <div className="bg-indigo-500/20 text-indigo-400 p-4 rounded-full w-16 h-16 mx-auto flex items-center justify-center border border-indigo-500/35">
                      <Shield className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-black text-white tracking-tight uppercase">Admin Verification Required</h2>
                    <p className="text-[11px] text-slate-400 font-medium">To protect sensitive Nepal B2B & API ledger endpoints, enter your PIN.</p>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 uppercase font-extrabold tracking-wide block">System Code Keys Passphrase</label>
                      <input 
                        type="password"
                        placeholder="••••••••"
                        value={adminPasswordInput}
                        onChange={(e) => {
                          setAdminPasswordInput(e.target.value);
                          setAdminAuthError("");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            // trigger submit
                            document.getElementById("verify-admin-btn")?.click();
                          }
                        }}
                        className="w-full bg-[#0c0e14]/90 border border-white/10 rounded-xl px-4 py-3 text-center text-sm font-mono font-bold tracking-widest text-emerald-400 focus:outline-none focus:border-indigo-500"
                        id="admin-passcode-field"
                      />
                    </div>
                    {adminAuthError && (
                      <p className="text-[11px] text-red-400 font-bold text-center animate-shake">
                        ⚠️ {adminAuthError}
                      </p>
                    )}
                    <button
                      id="verify-admin-btn"
                      onClick={() => {
                        if (adminPasswordInput === "admin777") {
                          sessionStorage.setItem("admin_authed", "true");
                          setIsAdminAuthed(true);
                          setAdminPasswordInput("");
                          setAdminAuthError("");
                        } else {
                          setAdminAuthError("Invalid code key. Enter custom clz project default: admin777");
                        }
                      }}
                      className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-extrabold text-xs py-3 rounded-xl transition duration-150 hover:opacity-95 shadow-lg shadow-indigo-500/20 block text-center cursor-pointer uppercase tracking-wider"
                    >
                      Authenticate and Unlock
                    </button>
                    <p className="text-[10px] text-slate-500 text-center font-mono">
                      * Demo PIN security fallback: <span className="text-indigo-400 font-bold">admin777</span>
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-4 flex justify-between items-center bg-white/5 p-3 rounded-2xl border border-white/10">
                    <span className="text-xs font-mono text-slate-300">Logged in securely as <b className="text-indigo-300 font-bold">SYSADMIN Root</b></span>
                    <button 
                      onClick={() => {
                        sessionStorage.removeItem("admin_authed");
                        setIsAdminAuthed(false);
                      }}
                      className="text-[10px] bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold px-3 py-1.5 rounded-lg transition border border-red-500/20 cursor-pointer"
                    >
                      Logout of Admin Panel 🔓
                    </button>
                  </div>
                  <AdminPanel 
                    db={db} 
                    onRefresh={() => fetchDB(true)} 
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. FLOAT OVERLAY MESSAGE FOR ACTUAL MOBILE SCAN EVENTS */}
        {qrScanActionStatus && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
            <div className="max-w-md w-full bg-slate-900 border border-white/10 p-6 rounded-3xl shadow-2xl relative space-y-4">
              <button 
                onClick={() => setQrScanActionStatus(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center space-y-2">
                <div className={`p-4 rounded-full w-16 h-16 mx-auto flex items-center justify-center border ${
                  qrScanActionStatus.success 
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" 
                    : "bg-red-500/10 text-red-400 border-red-500/30"
                }`}>
                  {qrScanActionStatus.success ? (
                    <CheckCircle2 className="w-8 h-8" />
                  ) : (
                    <AlertCircle className="w-8 h-8" />
                  )}
                </div>
                <h3 className="text-lg font-black text-white tracking-tight">{qrScanActionStatus.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed font-semibold">{qrScanActionStatus.message}</p>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setQrScanActionStatus(null)}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs cursor-pointer ${
                    qrScanActionStatus.success 
                      ? "bg-indigo-500 hover:bg-indigo-600 text-white" 
                      : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                  }`}
                >
                  Dismiss Scan Overlay
                </button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Sandbox footer credits */}
      <footer className="bg-[#0c0e14]/80 text-slate-500 text-xs py-5 text-center font-mono border-t border-white/10 mt-auto">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="text-slate-300 font-bold uppercase tracking-wider text-[10px]">Remix: Loyalty Nepal and Worldwide B2B2C Registry Engine</p>
          <p>© 2026 Remix Loyalty. Standard esewa (Sandbox phone 9861774000) and Stripe interfaces simulated perfectly.</p>
        </div>
      </footer>

    </div>
  );
}
