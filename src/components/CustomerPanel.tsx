import React, { useState, useEffect, useRef } from "react";
import { 
  QrCode, BookOpen, Bell, Globe, CheckCircle2, AlertTriangle, 
  X, RefreshCw, Smartphone, Landmark, Award, Volume2, VolumeX, Sparkles, Languages,
  Camera, CameraOff, Play, Info
} from "lucide-react";
import { AppDatabase, Business, CustomerBusinessRelation, NotificationMsg } from "../types";
import { translations } from "../translations";
import jsQR from "jsqr";
import { motion, AnimatePresence } from "motion/react";

interface CustomerPanelProps {
  db: AppDatabase;
  onRefresh: () => void;
  customerId: string;
  setCustomerId: (id: string) => void;
}

export default function CustomerPanel({ db, onRefresh, customerId, setCustomerId }: CustomerPanelProps) {
  const [lang, setLang] = useState<"en" | "ne" | "hi">("en");
  const [activeTab, setActiveTab] = useState<"wallet" | "scanner" | "inbox" | "directory">("wallet");
  const [scannerMode, setScannerMode] = useState<"static" | "stamp" | "points">("static");
  
  // Camera state hooks
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // States for simulated scanner
  const [selectedBizId, setSelectedBizId] = useState<string>(db.businesses[0]?.id || "");
  const [customPointAmount, setCustomPointAmount] = useState<string>("100");
  const [customPointsVal, setCustomPointsVal] = useState<string>("10");

  // States for adding a new simulated customer
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserPhone, setNewUserPhone] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [addUserError, setAddUserError] = useState("");
  const [isAddingUser, setIsAddingUser] = useState(false);
  
  // Transaction Scan Results
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string; payload?: any } | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  // Translate helpers
  const t = (key: string, variables: { [key: string]: any } = {}) => {
    let text = translations[lang]?.[key] || translations["en"]?.[key] || key;
    Object.keys(variables).forEach(v => {
      text = text.replace(`{${v}}`, String(variables[v]));
    });
    return text;
  };

  // Get customer object
  const currentCustomer = db.customers.find(c => c.id === customerId);
  const customerRelations = db.customer_business_relations.filter(r => r.customerId === customerId);

  // Multi-Currency Symbol helper
  const getCurrencySymbol = (currency: string) => {
    switch (currency) {
      case "NPR": return "रू";
      case "INR": return "₹";
      case "USD": return "$";
      case "EUR": return "€";
      case "GBP": return "£";
      case "JPY": return "¥";
      default: return currency;
    }
  };

  // Switch customer accounts to showcase different users (Nepal vs World)
  const handleSwitchUser = (newId: string) => {
    setCustomerId(newId);
    setScanResult(null);
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserPhone.trim()) {
      setAddUserError("Name and phone number are required.");
      return;
    }
    setAddUserError("");
    setIsAddingUser(true);

    const generatedSlug = newUserName.toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, "")
      .substring(0, 16) + "-" + Math.floor(100 + Math.random() * 900);

    try {
      const response = await fetch("/api/customer/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: generatedSlug,
          name: newUserName.trim(),
          phone: newUserPhone.trim(),
          email: newUserEmail.trim() || `${generatedSlug}@demo.com`
        })
      });
      const data = await response.json();
      if (response.ok) {
        setNewUserName("");
        setNewUserPhone("");
        setNewUserEmail("");
        setAddUserError("");
        setShowAddUser(false);
        setCustomerId(data.customer.id);
        onRefresh();
      } else {
        setAddUserError(data.error || "Failed to add profile");
      }
    } catch (err) {
      setAddUserError("System registration timeout. Please retry.");
    } finally {
      setIsAddingUser(false);
    }
  };

  // Enroll logic
  const handleEnroll = async (bizId: string) => {
    try {
      const response = await fetch("/api/customer/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          businessId: bizId,
          customerName: currentCustomer?.name,
          customerEmail: currentCustomer?.email,
          customerPhone: currentCustomer?.phone
        })
      });
      const data = await response.json();
      if (response.ok) {
        setScanResult({ success: true, message: t("enrollmentSuccess", { name: data.business.name }), payload: data });
        onRefresh();
      } else {
        setScanResult({ success: false, message: data.error || "Enrollment failed" });
      }
    } catch (e) {
      setScanResult({ success: false, message: "Server connection failed" });
    }
  };

  // Stamp logic
  const handleStamp = async (bizId: string) => {
    try {
      const response = await fetch("/api/customer/stamp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, businessId: bizId })
      });
      const data = await response.json();
      if (response.ok) {
        setScanResult({ 
          success: true, 
          message: t("stampSuccess", { count: data.relation.stampsCount }) + 
            (data.rewardAwarded ? ` \n🎉 Reward Unlocked: "${data.relation.stampsCount === 0 ? 'Checked limit reward' : 'Limit reached'}"!` : ""), 
          payload: data 
        });
        onRefresh();
      } else {
        setScanResult({ success: false, message: data.error });
      }
    } catch (e) {
      setScanResult({ success: false, message: "Server connection failed" });
    }
  };

  // Point QR logic (We generate a signed QR code on-the-fly and scan it to simulate point scanning)
  const handleScanPoints = async () => {
    setIsScanning(true);
    setScanResult(null);
    try {
      // 1. Generate credentials from business details
      const biz = db.businesses.find(b => b.id === selectedBizId);
      if (!biz) {
        setScanResult({ success: false, message: "Selected merchant not found" });
        setIsScanning(false);
        return;
      }

      // Generate Point QR with valid HMAC signature on server first
      const qrGenResponse = await fetch("/api/business/generate-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: selectedBizId,
          amount: parseFloat(customPointAmount),
          points: parseInt(customPointsVal)
        })
      });
      const qrData = await qrGenResponse.json();

      if (!qrGenResponse.ok) {
        setScanResult({ success: false, message: qrData.error || "Failed to generate QR credentials" });
        setIsScanning(false);
        return;
      }

      // 2. Scan the credentials on customer endpoint to check server checks (nonce, expiry, hmac)
      setTimeout(async () => {
        try {
          const scanResponse = await fetch("/api/customer/points", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              customerId,
              ...qrData
            })
          });
          const result = await scanResponse.json();
          if (scanResponse.ok) {
            setScanResult({
              success: true,
              message: t("pointsSuccess", { points: qrData.points, total: result.relation.pointsCount }) + 
                (result.rewardAwarded ? `\n🎁 Ready to Claim: ${biz.rewardDescription}!` : ""),
              payload: result
            });
            onRefresh();
          } else {
            setScanResult({ success: false, message: result.error });
          }
        } catch (err) {
          setScanResult({ success: false, message: "Points transaction failed to process" });
        }
        setIsScanning(false);
      }, 700);

    } catch (e) {
      setScanResult({ success: false, message: "Error in simulated point validation" });
      setIsScanning(false);
    }
  };

  // Stop camera function
  const stopCamera = () => {
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
      requestRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    setCameraError("");
    setScanResult(null);
    setCameraActive(true);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true"); // critical compatibility
        videoRef.current.play();
        requestRef.current = requestAnimationFrame(scanTick);
      }
    } catch (err: any) {
      console.error("Camera access failed", err);
      let errorMsg = "Could not activate camera. Please ensure camera permissions are allowed.";
      if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
        errorMsg += " Secure Context (HTTPS) is required for camera streaming.";
      }
      if (window.self !== window.top) {
        errorMsg += " Running inside an iframe often blocks camera streams. Please click 'Open in New Tab' from the Settings menu at the top right of AI Studio to grant permissions!";
      }
      setCameraError(errorMsg);
      setCameraActive(false);
    }
  };

  const scanTick = () => {
    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, canvas.width, canvas.height, {
            inversionAttempts: "dontInvert"
          });
          
          if (code && code.data) {
            handleDecodedCode(code.data);
            stopCamera();
            return;
          }
        }
      }
    }
    if (cameraActive || streamRef.current) {
      requestRef.current = requestAnimationFrame(scanTick);
    }
  };

  const handleDecodedCode = async (decodedString: string) => {
    setIsScanning(true);
    setScanResult(null);
    try {
      let url: URL;
      try {
        url = new URL(decodedString);
      } catch (e) {
        if (decodedString.startsWith("join:")) {
          const bizId = decodedString.replace("join:", "").trim();
          await handleEnroll(bizId);
          setIsScanning(false);
          return;
        }
        setScanResult({ success: false, message: `Invalid scanned code format. Plaintext scanned: "${decodedString}". Please scan an official business flyer QR code or receipt points token!` });
        setIsScanning(false);
        return;
      }

      const params = new URLSearchParams(url.search);
      const enrollId = params.get("enroll");
      const claimMode = params.get("claim");
      const bizId = params.get("bizId");

      if (enrollId) {
        await handleEnroll(enrollId);
      } else if (claimMode === "stamp" && bizId) {
        await handleStamp(bizId);
      } else if (claimMode === "points" && bizId) {
        const amount = parseFloat(params.get("amount") || "0");
        const points = parseInt(params.get("points") || "0");
        const ts = params.get("ts") || "";
        const nonce = params.get("nonce") || "";
        const sig = params.get("sig") || "";

        if (!sig || !nonce || !ts || !points) {
          setScanResult({ 
            success: false, 
            message: "Scanned Points QR is missing essential cryptographic signature keys." 
          });
          setIsScanning(false);
          return;
        }

        const scanResponse = await fetch("/api/customer/points", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerId,
            businessId: bizId,
            amount,
            points,
            timestamp: ts,
            nonce,
            signature: sig
          })
        });
        const result = await scanResponse.json();
        const biz = db.businesses.find(b => b.id === bizId);
        const bizName = biz ? biz.name : "Merchant";
        if (scanResponse.ok) {
          setScanResult({
            success: true,
            message: `💎 Point Ledger Processed Successfully!\n\nYou got +${points} points from ${bizName} for spending ${biz?.operatingCurrency || 'Rs.'} ${amount} (Receipt Verification Signature: ${sig.substring(0, 10)}...)` + 
              (result.rewardAwarded ? `\n\n🎉 Congratulations! Reward unlocked: ${biz?.rewardDescription || "Gift"}!` : ""),
            payload: result
          });
          onRefresh();
        } else {
          setScanResult({ success: false, message: result.error || "Failed signature token verification checks on server" });
        }
      } else {
        setScanResult({ 
          success: false, 
          message: "Unrecognized QR code target. Please verify you are scanning a valid Loyalty Bridge QR code." 
        });
      }
    } catch (err) {
      setScanResult({ success: false, message: "Decryption system error processing code" });
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    if (activeTab !== "scanner") {
      stopCamera();
    }
  }, [activeTab]);

  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Toggle notification opt-in
  const toggleNotification = async (bizId: string, currentVal: boolean) => {
    try {
      const response = await fetch("/api/customer/toggle-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, businessId: bizId, optIn: !currentVal })
      });
      if (response.ok) {
        onRefresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Cooldown helper
  const getStampCooldown = (lastStampAt: string | null) => {
    if (!lastStampAt) return { canStampId: true, text: "" };
    const last = new Date(lastStampAt);
    const now = new Date();
    const diffHours = (now.getTime() - last.getTime()) / (1000 * 60 * 60);
    const remaining = 12 - diffHours;
    if (remaining > 0) {
      return { canStampId: false, text: remaining.toFixed(1) };
    }
    return { canStampId: true, text: "" };
  };

  // Customer notification filter
  const customerNotifs = db.notifications.filter(n => {
    if (n.customerId && n.customerId !== customerId) return false;
    if (n.businessId === "system") return true; // System broadcasts
    // Only show if customer has relation AND has notifications enabled
    const rel = customerRelations.find(r => r.businessId === n.businessId);
    return rel && rel.optInNotifications;
  });

  const [knownNotifIds, setKnownNotifIds] = useState<string[]>([]);
  const [activePopupNotif, setActivePopupNotif] = useState<NotificationMsg | null>(null);

  // Play a beautiful, elegant synthetic mobile notification tone using Web Audio API
  const playChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      // Tone 1: warm chime
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      
      gain1.gain.setValueAtTime(0.06, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.6);

      // Tone 2: secondary staggered chime
      setTimeout(() => {
        try {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.type = "sine";
          osc2.frequency.setValueAtTime(880, ctx.currentTime); // A5
          osc2.frequency.exponentialRampToValueAtTime(1174.66, ctx.currentTime + 0.15); // D6
          
          gain2.gain.setValueAtTime(0.04, ctx.currentTime);
          gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
          
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.start();
          osc2.stop(ctx.currentTime + 0.5);
        } catch (e) {
          // ignore context errors
        }
      }, 80);
    } catch (e) {
      console.warn("Web Audio chime could not play:", e);
    }
  };

  // Reset tracking when active customer identity changes
  useEffect(() => {
    setKnownNotifIds([]);
    setActivePopupNotif(null);
  }, [customerId]);

  // Sync and capture newly received notifications
  useEffect(() => {
    const currentIds = customerNotifs.map(n => n.id);
    
    // First load/mount: populate the known IDs so they do not trigger retroactively
    if (knownNotifIds.length === 0 && customerNotifs.length > 0) {
      setKnownNotifIds(currentIds);
      return;
    }

    // Detect if any new notifications appeared that aren't in our known list
    const unseenNotifs = customerNotifs.filter(n => !knownNotifIds.includes(n.id));
    if (unseenNotifs.length > 0) {
      // Pick the latest one
      const newest = unseenNotifs[0];
      setActivePopupNotif(newest);
      playChime();
      
      // Update known list so we don't trigger again
      setKnownNotifIds(prev => Array.from(new Set([...prev, ...currentIds])));
    } else if (customerNotifs.length !== knownNotifIds.length) {
      // Ensure we stay in sync if notifications are cleared or reorganized
      setKnownNotifIds(currentIds);
    }
  }, [customerNotifs, knownNotifIds, customerId]);

  // Auto-dismiss the popup banner after 7 seconds
  useEffect(() => {
    if (activePopupNotif) {
      const timer = setTimeout(() => {
        setActivePopupNotif(null);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [activePopupNotif]);

  return (
    <div id="customer-panel" className="max-w-md mx-auto glass-card min-h-[640px] shadow-2xl rounded-3xl overflow-hidden flex flex-col border border-white/10 text-white relative">
      
      {/* Simulated System Push Notification Alert Banner Overlay */}
      <AnimatePresence>
        {activePopupNotif && (
          <motion.div
            initial={{ y: -100, opacity: 0, scale: 0.95 }}
            animate={{ y: 12, opacity: 1, scale: 1 }}
            exit={{ y: -100, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            onClick={() => {
              setActiveTab("inbox");
              setActivePopupNotif(null);
            }}
            className="absolute top-0 left-3 right-3 z-50 bg-slate-900/95 backdrop-blur-xl border border-white/15 rounded-2xl p-3.5 shadow-2xl shadow-black/80 cursor-pointer flex gap-3 select-none hover:bg-slate-850/95 transition-all duration-150"
            id="mobile-push-notification-banner"
          >
            {/* App logo or category indicator */}
            <div className="w-10 h-10 shrink-0 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-sm uppercase shadow-md border border-white/10">
              {activePopupNotif.businessId === "system" ? "📢" : (db.businesses.find(b => b.id === activePopupNotif.businessId)?.logoUrl || "🎁")}
            </div>

            {/* Notification content */}
            <div className="flex-1 min-w-0 text-left">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 font-mono">
                  {activePopupNotif.businessId === "system" ? "Loyalty Bridge" : (db.businesses.find(b => b.id === activePopupNotif.businessId)?.name || "Loyalty Alert")}
                </span>
                <span className="text-[9px] text-slate-400 font-mono">now • 🔔</span>
              </div>
              <h4 className="text-xs font-black text-white mt-1 leading-snug truncate">
                {activePopupNotif.title}
              </h4>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed line-clamp-2">
                {activePopupNotif.message}
              </p>
            </div>

            {/* Manual Dismiss button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActivePopupNotif(null);
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 self-start shrink-0 transition"
              title="Dismiss alert"
              id="btn-dismiss-push"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Visual mobile notched phone border simulation */}
      <div className="bg-white/5 text-white px-5 pt-3 pb-4 flex flex-col gap-2 rounded-t-2xl border-b border-white/5">
        <div className="flex justify-between items-center text-xs text-slate-400 font-mono">
          <span>📶 LTE / WiFi</span>
          <div className="bg-indigo-500/10 border border-indigo-500/25 px-3 py-1 rounded-full text-indigo-300 font-semibold text-[10px]">PWA READY</div>
          <span>🔋 100% (2026)</span>
        </div>

        {/* Account Selector */}
        <div className="flex justify-between items-center mt-2">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5 font-display">
              <span>{t("appName")}</span>
              <span className="text-indigo-300 text-xs px-1.5 py-0.5 rounded-md bg-white/10 border border-white/10">Wallet</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">{t("nepalWorldwide")}</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Language switch */}
            <div className="relative group bg-white/5 p-1.5 rounded-lg border border-white/10 flex items-center gap-1 cursor-pointer">
              <Languages className="w-3.5 h-3.5 text-slate-400" />
              <select 
                value={lang} 
                onChange={(e) => setLang(e.target.value as any)} 
                className="bg-transparent text-[11px] font-bold text-slate-200 outline-none cursor-pointer pr-1"
                id="customer-lang-selector"
              >
                <option value="en" className="bg-slate-950 text-white">EN</option>
                <option value="ne" className="bg-slate-950 text-white">नेपाली</option>
                <option value="hi" className="bg-slate-950 text-white">हिंदी</option>
              </select>
            </div>
          </div>
        </div>

        {/* Isolated Device Customer Profile */}
        <div className="bg-white/5 p-3 rounded-xl mt-2 border border-white/10 space-y-2">
          <label className="text-[10px] text-indigo-300 uppercase font-extrabold block font-mono">Active Device Card</label>
          <div className="p-2.5 bg-slate-950/40 rounded-lg border border-white/5 text-xs text-left">
            <p className="text-white font-extrabold text-sm">{currentCustomer?.name || "Unregistered Device"}</p>
            <p className="text-slate-400 mt-1 font-mono text-[10px]">📞 {currentCustomer?.phone || "No phone linked"}</p>
            <p className="text-slate-400 font-mono text-[10px]">📧 {currentCustomer?.email || "No email linked"}</p>
            <div className="mt-2 pt-2 border-t border-white/5 flex justify-between items-center text-[9px] text-slate-500 font-mono">
              <span>DEVICE LOCK ACTIVE</span>
              <span className="text-emerald-400 font-bold">● SECURED</span>
            </div>
          </div>
          <button
            id="cust-btn-reset-device"
            onClick={() => {
              if (window.confirm("Are you sure you want to remove this loyalty card from this device? You will need to register again.")) {
                localStorage.removeItem("device_customer_id");
                window.location.reload();
              }
            }}
            className="w-full bg-red-650/10 hover:bg-red-600/25 text-red-200 border border-red-500/15 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
          >
            Reset Device Card 🚨
          </button>
        </div>
      </div>

      {/* Main Panel Frame View */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {/* Tab Selection */}
        <div className="bg-white/5 p-1 rounded-xl flex gap-1 shadow-inner border border-white/5">
          <button
            id="tab-customer-wallet"
            onClick={() => setActiveTab("wallet")}
            className={`flex-1 py-2 text-[10px] font-bold rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1 transition-all duration-150 cursor-pointer ${
              activeTab === "wallet" ? "glass-pill-active font-black shadow-sm text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            <BookOpen className="w-3 h-3" />
            <span>Cards</span>
          </button>
          <button
            id="tab-customer-scanner"
            onClick={() => setActiveTab("scanner")}
            className={`flex-1 py-2 text-[10px] font-bold rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1 transition-all duration-150 cursor-pointer ${
              activeTab === "scanner" ? "glass-pill-active font-black shadow-sm text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            <QrCode className="w-3 h-3" />
            <span>Scan QR</span>
          </button>
          <button
            id="tab-customer-directory"
            onClick={() => setActiveTab("directory")}
            className={`flex-1 py-2 text-[10px] font-bold rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1 transition-all duration-150 cursor-pointer ${
              activeTab === "directory" ? "glass-pill-active font-black shadow-sm text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            🏬 <span>Outlets</span>
          </button>
          <button
            id="tab-customer-inbox"
            onClick={() => setActiveTab("inbox")}
            className={`flex-1 py-2 text-[10px] font-bold rounded-lg flex flex-col sm:flex-row items-center justify-center gap-1 transition-all duration-150 relative cursor-pointer ${
              activeTab === "inbox" ? "glass-pill-active font-black shadow-sm text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            <Bell className="w-3 h-3" />
            <span>Inbox</span>
            {customerNotifs.length > 0 && (
              <span className="absolute top-1 right-2 bg-indigo-500 text-white font-extrabold text-[7px] px-1.2 py-0.1 rounded-full animate-pulse">
                {customerNotifs.length}
              </span>
            )}
          </button>
        </div>

        {/* ----------------- TAB: WALLET ----------------- */}
        {activeTab === "wallet" && (
          <div className="space-y-3.5">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wide font-display">
                My connected programs ({customerRelations.length})
              </h2>
              <span className="text-[11px] text-slate-350 font-mono flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                <span className="w-1.5 h-1.5 bg-emerald-450 rounded-full animate-ping"></span>
                {t("pwaActiveStatus")}
              </span>
            </div>

            {customerRelations.length === 0 ? (
              <div className="glass-item rounded-2xl p-6 text-center border border-white/10 space-y-3 shadow-sm">
                <QrCode className="w-10 h-10 text-slate-400 mx-auto" />
                <p className="text-xs text-slate-350">You are not enrolled in any loyalty programs yet.</p>
                <button 
                  onClick={() => setActiveTab("scanner")}
                  className="bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-xl hover:bg-indigo-600 shadow-md shadow-indigo-500/20 cursor-pointer"
                >
                  Join a Program Now
                </button>
              </div>
            ) : (
              customerRelations.map(relation => {
                const b = db.businesses.find(x => x.id === relation.businessId);
                if (!b) return null;

                const isStampMode = b.loyaltyMode === "stamp";
                const rewardLimit = isStampMode ? b.stampRewardLimit : b.pointRewardLimit;
                const progressCount = isStampMode ? relation.stampsCount : relation.pointsCount;
                const progressPercent = Math.min((progressCount / rewardLimit) * 100, 100);
                const isSuspended = b.status !== "active";

                // Cooldown Calculation
                const stampStatus = getStampCooldown(relation.lastStampAt);

                return (
                  <div 
                    key={relation.id} 
                    id={`loyalty-card-${b.id}`}
                    className={`glass-panel rounded-2xl p-4 shadow-sm relative overflow-hidden transition-all duration-200 hover:bg-white/8 hover:border-white/15 ${
                      isSuspended ? "opacity-60 border-red-500 bg-red-950/20" : ""
                    }`}
                  >
                    {/* Status header banner */}
                    {isSuspended && (
                      <div className="absolute top-0 right-0 left-0 bg-red-500/80 backdrop-blur-sm text-white text-[9px] font-bold text-center py-0.5 uppercase tracking-wider flex items-center justify-center gap-1">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        {t("businessSuspended").split(".")[0]}
                      </div>
                    )}

                    {/* Meta info header */}
                    <div className="flex justify-between items-start mt-1.5">
                      <div className="flex gap-2.5">
                        <span className="text-3xl bg-white/5 p-1.5 rounded-xl border border-white/10 shadow-inner inline-block select-none">{b.logoUrl}</span>
                        <div>
                          <h3 className="text-sm font-bold text-white flex items-center gap-1">
                            {b.name}
                            <span className="text-[10px] text-slate-400 font-mono">({b.city})</span>
                          </h3>
                          <p className="text-[10px] text-slate-400 font-mono font-semibold uppercase flex items-center gap-1 mt-0.5">
                            <span>📍 {b.country}</span>
                            <span>•</span>
                            <span className="bg-indigo-500/20 text-indigo-200 px-1 py-0.2 border border-indigo-500/30 rounded font-bold">{isStampMode ? "Stamps" : "Points"}</span>
                          </p>
                        </div>
                      </div>

                      {/* Notification override per business toggle */}
                      <button
                        id={`mute-btn-${b.id}`}
                        onClick={() => toggleNotification(b.id, relation.optInNotifications)}
                        className={`p-1.5 rounded-lg border transition-all duration-150 cursor-pointer ${
                          relation.optInNotifications 
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/35 hover:bg-emerald-500/30" 
                            : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
                        }`}
                        title={relation.optInNotifications ? t("optOutBtn") : t("optInBtn")}
                      >
                        {relation.optInNotifications ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Progress tracking display block */}
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between items-end text-xs">
                        <span className="font-bold text-slate-200">
                          {isStampMode 
                            ? t("stampsCount", { count: progressCount, limit: rewardLimit })
                            : t("pointsCount", { count: progressCount }) + " (" + getCurrencySymbol(b.operatingCurrency) + " spent)"
                          }
                        </span>
                        <span className="text-[11px] text-slate-350 uppercase font-bold tracking-tight">
                          {progressPercent.toFixed(0)}% Complete
                        </span>
                      </div>

                      {/* Visual progress bar */}
                      <div className="w-full bg-slate-950/40 h-3 rounded-full overflow-hidden border border-white/10 p-0.5">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            progressPercent >= 100 
                              ? "bg-gradient-to-r from-emerald-400 to-teal-400 animate-pulse" 
                              : "bg-gradient-to-r from-indigo-500 to-purple-500"
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        ></div>
                      </div>

                      {/* Reward Claim Text */}
                      <div className="flex gap-1.5 items-start text-xs rounded-xl p-2.5 bg-[#0c0e14]/40 border border-white/5">
                        <Award className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-slate-200">{t("rewardText")}:</p>
                          <p className="text-[11px] text-slate-350">{b.rewardDescription}</p>
                          {progressPercent >= 100 && (
                            <p className="text-emerald-400 font-extrabold text-[11px] mt-1 flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-amber-300" />
                              {t("readyToClaim")}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Cooldown control status for stamps */}
                    {isStampMode && (
                      <div className="mt-3 pt-2.5 border-t border-white/5 flex justify-between items-center">
                        <span className="text-[10px] text-slate-400 font-bold tracking-wide uppercase font-mono">Stamp Cooldown Checker</span>
                        {isSuspended ? (
                          <span className="text-[10px] font-bold text-red-400 uppercase">Suspended</span>
                        ) : stampStatus.canStampId ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                            {t("canStampNow")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                            {t("cooldownActive", { hours: stampStatus.text })}
                          </span>
                        )}
                      </div>
                    )}

                    {!isStampMode && (
                      <div className="mt-3 pt-2.5 border-t border-white/5 flex justify-between items-center text-[10px] text-slate-400 font-mono">
                        <span>1 {b.operatingCurrency} = {b.pointsRate} Points</span>
                        <span>Symbol: {getCurrencySymbol(b.operatingCurrency)}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ----------------- TAB: SCANNER ----------------- */}
        {activeTab === "scanner" && (
          <div className="space-y-4">
            
            {/* Real Camera vs. Mock Simulator Toggler */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#0c0e14]/80 rounded-xl border border-white/10">
              <button
                onClick={() => { stopCamera(); }}
                className={`py-1.5 px-3 rounded-lg text-[11px] font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  !cameraActive
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" /> Sandbox Simulator
              </button>
              <button
                onClick={() => startCamera()}
                className={`py-1.5 px-3 rounded-lg text-[11px] font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  cameraActive
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Camera className="w-3.5 h-3.5 text-emerald-400" /> Live Device Camera 📷
              </button>
            </div>

            {cameraActive ? (
              <div className="glass-panel rounded-2xl p-4 shadow-sm border border-white/10 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                    <Camera className="w-4 h-4 text-emerald-400 animate-pulse" /> Live Camera Decoder
                  </h3>
                  <button 
                    onClick={stopCamera}
                    className="text-[10px] text-red-400 border border-red-500/25 bg-red-500/10 hover:bg-red-500/20 px-2 py-0.5 rounded font-mono font-bold transition uppercase cursor-pointer"
                  >
                    ✕ Close Camera
                  </button>
                </div>

                {cameraError && (
                  <div className="p-3.5 bg-red-950/30 border border-red-500/30 rounded-xl text-xs text-red-200 space-y-3 text-left">
                    <p className="font-extrabold flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-red-400" /> Camera Sensor Disabled
                    </p>
                    <p className="font-semibold leading-relaxed font-sans text-slate-300">{cameraError}</p>
                    
                    <div className="bg-black/40 p-2.5 rounded-lg border border-white/5 space-y-1.5 text-[10.5px] font-mono text-slate-400">
                      <p className="font-bold text-white uppercase flex items-center gap-1"><Info className="w-3.5 h-3.5 text-amber-400" /> How to fix & scan with Phone:</p>
                      <p>1. Tap the <b className="text-indigo-400">Settings</b> wheel/icon (top right menu of Google AI Studio or your browser).</p>
                      <p>2. Select <b className="text-indigo-400">"Open in New Tab"</b> (or copy the current browser URL to your phone).</p>
                      <p>3. Allow browser camera permissions to instantly sync real merchant scans!</p>
                    </div>
                  </div>
                )}

                <div className="relative aspect-video max-w-sm mx-auto bg-slate-950/90 rounded-2xl overflow-hidden border border-white/10 flex flex-col items-center justify-center">
                  <video 
                    ref={videoRef}
                    className="absolute inset-0 w-full h-full object-cover"
                    playsInline
                    muted
                  />

                  {/* Hidden stream decoding canvas */}
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Hologram Reticle Target Grid Frame covering viewport */}
                  <div className="absolute inset-0 border-2 border-dashed border-indigo-500/20 pointer-events-none rounded-2xl flex items-center justify-center">
                    <div className="w-28 h-28 border-2 border-emerald-400/50 rounded-xl relative">
                      {/* Corner brackets */}
                      <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-emerald-400 rounded-tl"></div>
                      <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-emerald-400 rounded-tr"></div>
                      <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-emerald-400 rounded-bl"></div>
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-emerald-400 rounded-br"></div>
                      
                      {/* Glowing Scan Bar */}
                      <div className="w-full h-0.5 bg-emerald-400 absolute top-0 shadow shadow-emerald-400/80 animate-[bounce_3s_infinite]" />
                    </div>
                  </div>

                  {!cameraError && (
                    <div className="absolute bottom-2 left-2 right-2 bg-slate-950/80 backdrop-blur-md border border-white/5 rounded-lg px-2 py-1 text-center text-[9px] text-slate-300 font-mono tracking-wide z-10 pointer-events-none">
                      Focus on a Stamp QR or Signed Points Code
                    </div>
                  )}
                </div>

                <div className="bg-indigo-950/30 border border-indigo-500/20 px-3 py-2.5 rounded-xl flex items-start gap-2 max-w-sm mx-auto text-left">
                  <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <p className="text-[9.5px] text-slate-400 leading-relaxed font-mono font-semibold">
                    AUTO-RESOLVE: Point this feed at any QR shown on another screen to instantly process enrollments, active stamps, and secure cryptographically signed point vouchers inside your active wallet.
                  </p>
                </div>
              </div>
            ) : (
              <div className="glass-panel rounded-2xl p-4 shadow-sm space-y-4 border border-white/10">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                  <QrCode className="w-4 h-4 text-indigo-400" /> Scan QR Environment Simulator
                </h3>

                {/* Selector to set what kind of scan we are simulating */}
                <div className="flex gap-1.5 bg-white/5 p-1 rounded-xl border border-white/5 font-sans">
                  <button
                    id="scan-mode-static"
                    onClick={() => { setScannerMode("static"); setScanResult(null); }}
                    className={`flex-1 py-1 px-1.5 rounded-lg text-[11px] font-bold transition-all duration-150 cursor-pointer ${
                      scannerMode === "static" ? "bg-indigo-505 bg-indigo-500 text-white" : "text-slate-400 hover:text-slate-250"
                    }`}
                  >
                    Join Business
                  </button>
                  <button
                    id="scan-mode-stamp"
                    onClick={() => { setScannerMode("stamp"); setScanResult(null); }}
                    className={`flex-1 py-1 px-1.5 rounded-lg text-[11px] font-bold transition-all duration-150 cursor-pointer ${
                      scannerMode === "stamp" ? "bg-indigo-505 bg-indigo-500 text-white" : "text-slate-400 hover:text-slate-250"
                    }`}
                  >
                    Stamp QR (12h)
                  </button>
                  <button
                    id="scan-mode-points"
                    onClick={() => { setScannerMode("points"); setScanResult(null); }}
                    className={`flex-1 py-1 px-1.5 rounded-lg text-[11px] font-bold transition-all duration-150 cursor-pointer ${
                      scannerMode === "points" ? "bg-indigo-505 bg-indigo-500 text-white" : "text-slate-400 hover:text-slate-250"
                    }`}
                  >
                    Points QR (Price)
                  </button>
                </div>

                {/* Dynamic QR interactive selector */}
                <div className="bg-[#0c0e14]/40 p-3 rounded-xl border border-white/5 space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase font-extrabold block">Select Partner Merchant</label>
                    <select
                      value={selectedBizId}
                      onChange={(e) => setSelectedBizId(e.target.value)}
                      className="w-full glass-input rounded-xl px-3 py-2 text-xs font-bold text-slate-200"
                      id="scanner-merchant-select"
                    >
                      {db.businesses.map(b => (
                        <option key={b.id} value={b.id} className="bg-slate-950 text-white">
                          {b.name} ({b.operatingCurrency} - {b.loyaltyMode}) {b.status !== "active" ? "⚠️ SUSPENDED" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Additional parameters for point-based scan simulation */}
                  {scannerMode === "points" && (
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-400 uppercase font-extrabold block">Spend Amount</label>
                        <input 
                          type="number"
                          value={customPointAmount}
                          onChange={(e) => {
                            const amt = e.target.value;
                            setCustomPointAmount(amt);
                            // Auto calculate points value according to merchant rate
                            const biz = db.businesses.find(x => x.id === selectedBizId);
                            const rate = biz ? biz.pointsRate : 1;
                            setCustomPointsVal(Math.round(parseFloat(amt || "0") * rate).toString());
                          }}
                          className="w-full glass-input rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-450 uppercase font-extrabold block">Points Awarded</label>
                        <input 
                          type="number"
                          disabled
                          value={customPointsVal}
                          className="w-full bg-[#0c0e14]/60 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-400"
                        />
                      </div>
                    </div>
                  )}

                  {/* Action CTA Trigger */}
                  <div className="pt-1">
                    {scannerMode === "static" ? (
                      <button
                        id="scan-enroll-action-btn"
                        onClick={() => handleEnroll(selectedBizId)}
                        className="w-full bg-indigo-500 text-white font-extrabold text-xs py-2.5 rounded-xl transition-all duration-150 hover:bg-indigo-600 shadow-md shadow-indigo-500/25 flex justify-center items-center gap-2 cursor-pointer"
                      >
                        <QrCode className="w-4 h-4" /> Join Program (Enroll)
                      </button>
                    ) : scannerMode === "stamp" ? (
                      <button
                        id="scan-stamp-action-btn"
                        onClick={() => handleStamp(selectedBizId)}
                        className="w-full bg-indigo-500 text-white font-extrabold text-xs py-2.5 rounded-xl transition-all duration-150 hover:bg-indigo-600 shadow-md shadow-indigo-500/25 flex justify-center items-center gap-2 cursor-pointer"
                      >
                        <QrCode className="w-4 h-4" /> Scan for 1 Stamp
                      </button>
                    ) : (
                      <button
                        id="scan-points-action-btn"
                        disabled={isScanning}
                        onClick={handleScanPoints}
                        className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-extrabold text-xs py-2.5 rounded-xl transition-all duration-150 hover:opacity-90 shadow-md shadow-indigo-500/25 flex justify-center items-center gap-2 cursor-pointer"
                      >
                        {isScanning ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Check Signature Security...
                          </>
                        ) : (
                          <>
                            <QrCode className="w-4 h-4 text-emerald-300" /> Verify HMAC Signed QR & Award Points
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Scanner Screen Simulation Viewport */}
                <div className="h-44 bg-slate-950/70 rounded-2xl relative overflow-hidden flex flex-col items-center justify-center border border-white/10 shadow-inner backdrop-blur-md">
                  {isScanning ? (
                    <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center text-slate-300 space-y-2 z-10">
                      <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                      <span className="text-xs font-mono tracking-wider text-[11px]">Validating Antifraud Token...</span>
                    </div>
                  ) : null}

                  {/* Simulated frame scanning animation red line */}
                  <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-red-500 shadow-md shadow-red-500 animate-[bounce_2.5s_infinite] opacity-60 z-0"></div>

                  <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center space-y-1.5 z-0">
                    <div className="p-3 bg-slate-900/50 rounded-full border border-white/5">
                      <Smartphone className="w-7 h-7 text-slate-300" />
                    </div>
                    <p className="text-white text-xs font-bold font-sans tracking-wide">
                      {scannerMode === "static" ? "Point Camera at Merchant Code" : scannerMode === "stamp" ? "Waiting for Cashier Stamp Device" : "Detecting Single-Use Dynamic Receipt QR code"}
                    </p>
                    <p className="text-slate-450 text-[10px] max-w-[280px] font-mono leading-tight">
                      {scannerMode === "points" ? "Secure server decrypt: Exp: 5m | Nonce replay proof: enabled | SHA256 signature verified." : "Time constraints checks validation active on servers."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Validation Response Result Dialog */}
            {scanResult && (
              <div 
                id="scan-result-banner"
                className={`p-3.5 rounded-xl border animate-fadeIn text-xs space-y-1.5 backdrop-blur-md text-left ${
                  scanResult.success 
                    ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-200" 
                    : "bg-red-950/30 border-red-500/30 text-red-200"
                }`}
              >
                <div className="flex justify-between items-start font-extrabold uppercase tracking-wide">
                  <span className="flex items-center gap-1">
                    {scanResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    )}
                    {scanResult.success ? "Verification Success" : "Security Blocked"}
                  </span>
                  <button onClick={() => setScanResult(null)} className="hover:text-white cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="font-bold leading-relaxed whitespace-pre-wrap">{scanResult.message}</p>
                {scanResult.success && scanResult.payload && (
                  <div className="font-mono text-[9px] bg-slate-950/45 p-2 rounded border border-white/5 mt-2 space-y-0.5 text-slate-300">
                    <p className="font-bold text-white uppercase block">Ledger details:</p>
                    <p>Time recorded: {new Date().toLocaleTimeString()}</p>
                    <p>Mode: {scannerMode.toUpperCase()}</p>
                    {scanResult.payload.relation && (
                      <p>Latest Balance: {scanResult.payload.relation.stampsCount} stamps / {scanResult.payload.relation.pointsCount} points</p>
                    )}
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* ----------------- TAB: INBOX ----------------- */}
        {activeTab === "inbox" && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-display">{t("notificationInbox")}</h3>

            {customerNotifs.length === 0 ? (
              <div className="glass-panel rounded-2xl p-8 text-center border border-white/10 space-y-2">
                <Bell className="w-8 h-8 text-slate-450 mx-auto" />
                <p className="text-xs text-slate-400 font-medium">{t("emptyNotifications")}</p>
              </div>
            ) : (
              customerNotifs.map(notif => {
                const b = db.businesses.find(x => x.id === notif.businessId);
                const isSystem = notif.businessId === "system";

                return (
                  <div 
                    key={notif.id}
                    className={`glass-item glass-item-hover rounded-2xl p-4 shadow-sm border transition-all duration-150 border-white/10 ${
                      isSystem ? "border-l-4 border-l-amber-500 bg-amber-500/5" : "border-l-4 border-l-slate-400"
                    }`}
                  >
                    <div className="flex justify-between items-center text-[10px] text-slate-450 font-mono">
                      <span className="font-bold uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded text-slate-300">
                        {isSystem ? "📢 Platform Broadcast" : b ? b.name : "Merchant"}
                      </span>
                      <span>{new Date(notif.sentAt).toLocaleDateString()}</span>
                    </div>
                    <h4 className="text-xs font-bold text-white mt-2">{notif.title}</h4>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">{notif.message}</p>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ----------------- TAB: OUTLETS DIRECTORY ----------------- */}
        {activeTab === "directory" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-white/5 p-3 rounded-2xl border border-white/10">
              <div>
                <h3 className="text-xs font-extrabold text-indigo-300 uppercase tracking-wide flex items-center gap-1 font-mono">
                  🏬 Partner Directory
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">Browse B2B merchants details and join their rewards program.</p>
              </div>
              <span className="text-[9px] font-mono text-slate-400 bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/20 font-bold uppercase">
                {db.businesses.length} Brands
              </span>
            </div>

            <div className="space-y-3.5">
              {db.businesses.map(b => {
                const relations = db.customer_business_relations.filter(r => r.businessId === b.id);
                const isEnrolled = relations.some(r => r.customerId === customerId);

                return (
                  <div 
                    key={b.id} 
                    className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3 shadow hover:border-indigo-500/30 transition-all duration-150"
                  >
                     {/* Brand Row */}
                     <div className="flex justify-between items-start">
                       <div className="flex items-center gap-2.5">
                         {/* Styled brand round logo fallback */}
                         <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-black text-xs text-white uppercase shadow-md font-mono">
                           {b.name.substring(0, 2)}
                         </div>
                         <div>
                           <h4 className="text-xs font-black text-white leading-tight">{b.name}</h4>
                           <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                             📍 {b.city}, {b.country}
                           </p>
                         </div>
                       </div>
                       
                       <span className={`text-[9px] px-2 py-0.5 rounded-full font-extrabold uppercase border ${
                         b.loyaltyMode === "point" 
                           ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/25" 
                           : "bg-blue-500/15 text-blue-300 border-blue-500/25"
                       }`}>
                         {b.loyaltyMode.toUpperCase()}
                       </span>
                     </div>

                     {/* Program details */}
                     <div className="grid grid-cols-2 gap-3 py-2 border-t border-b border-white/5 text-[11px] font-medium text-slate-350">
                       <div>
                         <p className="text-slate-500 text-[10px] font-bold uppercase block tracking-wider">Coupon Offer</p>
                         <p className="text-white font-extrabold mt-0.5 truncate">{b.rewardDescription}</p>
                       </div>
                       <div>
                         <p className="text-slate-500 text-[10px] font-bold uppercase block tracking-wider">Conversion</p>
                         <p className="text-white font-mono font-bold mt-0.5 whitespace-nowrap">
                           {b.loyaltyMode === "point" 
                             ? `1 ${b.operatingCurrency} = ${b.pointsRate} pt` 
                             : `Cooldown: 12h`
                           }
                         </p>
                       </div>
                     </div>

                     {/* CTA button or Joined info */}
                     <div className="flex justify-between items-center pt-1 text-[11px]">
                       <span className="text-[10px] text-slate-400 font-mono">
                         Members: <b className="text-white font-black leading-none">{relations.length}</b>
                       </span>
                       
                       {isEnrolled ? (
                         <span className="text-[10.5px] font-extrabold text-emerald-400 flex items-center gap-1">
                           ✓ Wallet Registered
                         </span>
                       ) : (
                         <button
                           onClick={() => handleEnroll(b.id)}
                           className="bg-indigo-600 hover:bg-indigo-750 text-white font-extrabold text-[11px] px-3 py-1 rounded-lg transition-all cursor-pointer shadow active:scale-95"
                         >
                           Join Program 📱
                         </button>
                       )}
                     </div>

                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* Brand layout tagline */}
      <div className="bg-white/2 text-center py-2.5 border-t border-white/5 text-[10px] text-slate-400 font-mono">
        {t("appName")} Wallet • Local & Global Support
      </div>
    </div>
  );
}
