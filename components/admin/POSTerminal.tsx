// components/admin/POSTerminal.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Smartphone,
  Nfc,
  QrCode,
  Package,
  CheckCircle2,
  Layers,
  ArrowRight,
  RotateCcw,
  Wifi,
  ShoppingBag,
  Plus,
  Minus,
  Sparkles,
  ShieldCheck,
  Zap,
  Lock,
  ExternalLink,
  Copy,
  Check,
  CheckCheck,
  Tag,
  Receipt,
  FileCheck,
  ChevronRight,
  Search,
} from "lucide-react";
import { FrostedCard } from "@/components/ui/FrostedCard";
import { MonoValue, PriceTag, ChipUID } from "@/components/ui/MonoValue";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { VersionReleaseBadge } from "@/components/admin/VersionReleaseBadge";
import { POS_TRANSACTIONS } from "@/lib/mock/adminData";
import type { POSTransaction, POSMode } from "@/lib/mock/adminData";
import { cn } from "@/lib/utils";

// ─── Mock Customers for High-Touch Flow ────────────────────────────────────────

interface CustomerProfile {
  handle: string;
  name: string;
  address: string;
  tier: "Gold Craftsman" | "Founding Patron" | "Verified Member";
  tierBadge: string;
  discountBps: number;
}

const MOCK_CUSTOMERS: CustomerProfile[] = [
  {
    handle: "@ironwood_maren",
    name: "Maren Vance",
    address: "0x8f2A...1cD9",
    tier: "Gold Craftsman",
    tierBadge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    discountBps: 500, // 5% community royalty rebate
  },
  {
    handle: "@threadline_co",
    name: "Elena Rostova",
    address: "0x3cB7...F440",
    tier: "Founding Patron",
    tierBadge: "bg-violet-500/15 text-violet-300 border-violet-500/30",
    discountBps: 750,
  },
  {
    handle: "@dustpan_studios",
    name: "Liam O'Connor",
    address: "0x1Ab9...88D2",
    tier: "Verified Member",
    tierBadge: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    discountBps: 0,
  },
];

// ─── High-Touch Catalog Items ($100+ Crafts) ───────────────────────────────────

interface HighTouchItem {
  id: string;
  sku: string;
  title: string;
  price: number; // cents
  chipTier: string;
  chipUid: string;
  cmac: string;
  makerSharePct: number;
  platformSharePct: number;
  stakingSharePct: number;
}

const HIGH_TOUCH_CATALOG: HighTouchItem[] = [
  {
    id: "ht_001",
    sku: "FC-BLT-K1-001",
    title: "Blackened Copper Keyring — Gen 1",
    price: 14800, // $148.00
    chipTier: "NTAG424_DNA",
    chipUid: "04:A3:F2:11:8E:2C:80",
    cmac: "3A9F1C2E4B8D7F60",
    makerSharePct: 85,
    platformSharePct: 10,
    stakingSharePct: 5,
  },
  {
    id: "ht_002",
    sku: "FC-LTH-WLT-003",
    title: "Bridle Leather Bifold — Horween #003",
    price: 21000, // $210.00
    chipTier: "NTAG424_DNA",
    chipUid: "04:B7:E1:22:3D:4A:91",
    cmac: "C1A2B3D4E5F67890",
    makerSharePct: 85,
    platformSharePct: 10,
    stakingSharePct: 5,
  },
  {
    id: "ht_003",
    sku: "FC-DM-KNFE-088",
    title: "Damascus Pocket Blade — Walnut Grip",
    price: 34000, // $340.00
    chipTier: "NTAG424_DNA",
    chipUid: "04:E5:F3:55:2A:9D:C4",
    cmac: "FF00AA11CC22DD33",
    makerSharePct: 88,
    platformSharePct: 8,
    stakingSharePct: 4,
  },
];

// ─── Mode Switcher ─────────────────────────────────────────────────────────────

function ModeSwitcher({
  mode,
  setMode,
}: {
  mode: POSMode;
  setMode: (m: POSMode) => void;
}) {
  return (
    <div className="flex rounded-xl border border-white/10 bg-white/3 p-1 gap-1">
      {(["HIGH_TOUCH", "LOW_TOUCH"] as POSMode[]).map((m) => (
        <button
          key={m}
          onClick={() => setMode(m)}
          className={cn(
            "relative flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-xs sm:text-sm transition-all duration-200 cursor-pointer",
            mode === m ? "text-white font-semibold" : "text-white/40 hover:text-white/70",
          )}
        >
          {mode === m && (
            <motion.div
              layoutId="pos-mode-indicator"
              className={cn(
                "absolute inset-0 rounded-lg border",
                m === "HIGH_TOUCH"
                  ? "bg-orange-500/20 border-orange-500/50 shadow-[0_0_20px_rgba(204,85,0,0.25)]"
                  : "bg-sky-500/15 border-sky-500/40 shadow-[0_0_20px_rgba(56,189,248,0.2)]",
              )}
              transition={{ type: "spring", stiffness: 450, damping: 35 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-2">
            {m === "HIGH_TOUCH" ? (
              <Nfc className="w-4 h-4 text-orange-400" />
            ) : (
              <Layers className="w-4 h-4 text-sky-400" />
            )}
            <span className="truncate">
              {m === "HIGH_TOUCH" ? "High-Touch Mode ($100+ Crafts)" : "Low-Touch Mode (Volume Goods)"}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── High-Touch Flow ──────────────────────────────────────────────────────────

type HTStep = "SELECT_ITEM" | "SCAN_QR" | "TAP_NFC" | "CONFIRM_MINT" | "MINTED";

function HighTouchFlow({
  onTransactionComplete,
}: {
  onTransactionComplete: (tx: POSTransaction) => void;
}) {
  const [step, setStep] = useState<HTStep>("SELECT_ITEM");
  const [selectedItem, setSelectedItem] = useState<HighTouchItem>(HIGH_TOUCH_CATALOG[0]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile>(MOCK_CUSTOMERS[0]);
  const [isScanning, setIsScanning] = useState(false);
  const [nfcTapping, setNfcTapping] = useState(false);
  const [nfcHandshakeStage, setNfcHandshakeStage] = useState<number>(0);
  const [generatedTxHash, setGeneratedTxHash] = useState<string>("");
  const [copiedTx, setCopiedTx] = useState(false);

  const STEPS: { key: HTStep; label: string }[] = [
    { key: "SELECT_ITEM", label: "Select Craft" },
    { key: "SCAN_QR", label: "Scan Member QR" },
    { key: "TAP_NFC", label: "Tap NFC Chip" },
    { key: "CONFIRM_MINT", label: "Confirm & Mint" },
    { key: "MINTED", label: "Ownership Provenance" },
  ];

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  const reset = () => {
    setStep("SELECT_ITEM");
    setNfcHandshakeStage(0);
    setNfcTapping(false);
    setIsScanning(false);
  };

  // Simulate scanning QR code
  const handleSimulateScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setStep("TAP_NFC");
    }, 1200);
  };

  // Simulate tapping NFC chip with stage-by-stage cryptographic CMAC verification
  const handleSimulateNfcTap = () => {
    setNfcTapping(true);
    setNfcHandshakeStage(1); // 1: Detecting NFC field

    setTimeout(() => {
      setNfcHandshakeStage(2); // 2: Reading PICCData + Monotonic Counter
    }, 700);

    setTimeout(() => {
      setNfcHandshakeStage(3); // 3: AN12196 Session Key Derivation
    }, 1400);

    setTimeout(() => {
      setNfcHandshakeStage(4); // 4: CMAC Handshake Verified!
    }, 2000);

    setTimeout(() => {
      setNfcTapping(false);
      setStep("CONFIRM_MINT");
    }, 2500);
  };

  // Execute Mint & Transfer
  const handleExecuteMint = () => {
    const txHash = `0x8f39${Math.random().toString(16).substring(2, 8)}${Math.random().toString(16).substring(2, 6)}`;
    setGeneratedTxHash(txHash);

    const newTx: POSTransaction = {
      txId: `pos_tx_${Date.now()}`,
      mode: "HIGH_TOUCH",
      productTitle: selectedItem.title,
      sku: selectedItem.sku,
      price: selectedItem.price,
      buyerHandle: selectedCustomer.handle,
      chipUid: selectedItem.chipUid,
      status: "MINT_COMPLETE",
      timestamp: new Date().toISOString(),
      nfcTapped: true,
      qrScanned: true,
    };

    onTransactionComplete(newTx);
    setStep("MINTED");
  };

  // Calculated royalty cuts
  const makerPayout = Math.round((selectedItem.price * selectedItem.makerSharePct) / 100);
  const platformFee = Math.round((selectedItem.price * selectedItem.platformSharePct) / 100);
  const stakingPoolCut = selectedItem.price - makerPayout - platformFee;

  return (
    <div className="space-y-5">
      {/* Informative Banner */}
      <div className="px-4 py-3 rounded-xl bg-orange-500/8 border border-orange-500/20 flex items-center gap-3">
        <Sparkles className="w-4 h-4 text-orange-400 flex-shrink-0" />
        <p className="text-xs font-mono text-orange-300/85 leading-relaxed">
          <span className="font-semibold text-orange-300">High-Touch Mode ($100+ Crafts)</span> —
          Scan customer&apos;s Cozy Member QR, tap physical NTAG424 DNA chip, and mint verifiable digital
          ownership on-chain.
        </p>
      </div>

      {/* Step progress pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center gap-1.5 flex-1 min-w-[90px]">
            <div
              className={cn(
                "flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-mono transition-all truncate",
                i < stepIndex
                  ? "bg-orange-500/15 border-orange-500/40 text-orange-300 font-semibold"
                  : i === stepIndex
                    ? "bg-orange-500 border-orange-500 text-white font-bold shadow-[0_0_12px_rgba(204,85,0,0.4)]"
                    : "border-white/8 bg-white/2 text-white/30",
              )}
            >
              {i < stepIndex ? (
                <Check className="w-3 h-3 text-orange-400 flex-shrink-0" />
              ) : (
                <span className="w-3 h-3 rounded-full bg-white/10 flex items-center justify-center text-[9px] flex-shrink-0">
                  {i + 1}
                </span>
              )}
              <span className="truncate">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <ChevronRight className="w-3 h-3 text-white/15 flex-shrink-0" />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        {/* STEP 1: Select Craft Item */}
        {step === "SELECT_ITEM" && (
          <motion.div
            key="select_item"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <FrostedCard noPadding>
              <div className="px-4 py-3 border-b border-white/8 flex items-center justify-between">
                <h3 className="text-xs font-semibold text-white/80 uppercase tracking-widest">
                  Step 1: Select High-Value Craft Item
                </h3>
                <span className="font-mono text-[10px] text-orange-300">3 Verified Pieces In Stock</span>
              </div>
              <div className="divide-y divide-white/5">
                {HIGH_TOUCH_CATALOG.map((item) => {
                  const isSelected = selectedItem.id === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className={cn(
                        "flex items-center gap-3.5 p-4 cursor-pointer transition-all",
                        isSelected
                          ? "bg-orange-500/10 border-l-2 border-l-orange-500"
                          : "hover:bg-white/[0.02]",
                      )}
                    >
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                        <Package className="w-5 h-5 text-white/40" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white/90 truncate">{item.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <MonoValue className="text-[9px] text-white/40">{item.sku}</MonoValue>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-violet-500/10 border border-violet-500/25 text-violet-300">
                            {item.chipTier}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <PriceTag cents={item.price} className="text-sm font-semibold" />
                        <div
                          className={cn(
                            "w-5 h-5 rounded-full border flex items-center justify-center transition-all",
                            isSelected
                              ? "bg-orange-500 border-orange-500 text-white"
                              : "border-white/20 text-transparent",
                          )}
                        >
                          <Check className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </FrostedCard>

            <button
              onClick={() => setStep("SCAN_QR")}
              className="btn-cta w-full flex items-center justify-center gap-2 py-3 text-sm"
            >
              <span>Continue with {selectedItem.title}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* STEP 2: Scan Member QR */}
        {step === "SCAN_QR" && (
          <motion.div
            key="scan_qr"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <FrostedCard className="flex flex-col items-center gap-5 py-6">
              {/* QR Scanner Viewfinder Mockup */}
              <div className="relative w-44 h-44 rounded-2xl bg-black/60 border-2 border-dashed border-orange-500/40 flex items-center justify-center overflow-hidden shadow-[0_0_30px_rgba(204,85,0,0.15)]">
                {/* Viewfinder corner brackets */}
                <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-orange-400" />
                <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-orange-400" />
                <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-orange-400" />
                <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-orange-400" />

                {/* Animated scanning laser line */}
                {isScanning && (
                  <motion.div
                    animate={{ y: [-70, 70, -70] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                    className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-orange-400 to-transparent shadow-[0_0_12px_rgba(204,85,0,1)] z-10"
                  />
                )}

                <QrCode className="w-20 h-20 text-white/20" />
              </div>

              <div className="text-center space-y-1">
                <p className="text-sm font-semibold text-white/90">
                  Scan Customer&apos;s Cozy Member QR
                </p>
                <p className="text-xs font-mono text-white/40">
                  Point barcode scanner or select demo member identity below
                </p>
              </div>

              {/* Demo Member Identity Selector */}
              <div className="w-full space-y-2">
                <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest text-left">
                  Identified Cozy Members Nearby:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {MOCK_CUSTOMERS.map((cust) => {
                    const isSelected = selectedCustomer.handle === cust.handle;
                    return (
                      <button
                        key={cust.handle}
                        onClick={() => setSelectedCustomer(cust)}
                        className={cn(
                          "p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                          isSelected
                            ? "bg-orange-500/15 border-orange-500/50 shadow-[0_0_12px_rgba(204,85,0,0.2)]"
                            : "bg-white/3 border-white/8 hover:bg-white/6",
                        )}
                      >
                        <p className="text-xs font-semibold text-white/90 truncate">{cust.handle}</p>
                        <p className="text-[10px] font-mono text-white/40 truncate">{cust.address}</p>
                        <span
                          className={cn(
                            "inline-block mt-1 text-[9px] font-mono px-1.5 py-0.2 rounded border",
                            cust.tierBadge,
                          )}
                        >
                          {cust.tier}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 w-full pt-2">
                <button
                  onClick={() => setStep("SELECT_ITEM")}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-white/10 bg-white/4 hover:bg-white/10 text-xs font-mono text-white/60 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Back
                </button>
                <button
                  onClick={handleSimulateScan}
                  disabled={isScanning}
                  className="btn-cta flex-1 flex items-center justify-center gap-2 text-xs"
                >
                  {isScanning ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Scanning Member QR...
                    </>
                  ) : (
                    <>
                      <QrCode className="w-4 h-4" />
                      Simulate QR Scan for {selectedCustomer.handle}
                    </>
                  )}
                </button>
              </div>
            </FrostedCard>
          </motion.div>
        )}

        {/* STEP 3: Tap Physical NFC Chip */}
        {step === "TAP_NFC" && (
          <motion.div
            key="tap_nfc"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <FrostedCard className="flex flex-col items-center gap-5 py-6">
              {/* Pulsing Violet Tap Target */}
              <div className="relative flex items-center justify-center">
                {/* Wave animation rings */}
                <motion.div
                  animate={{ scale: [1, 1.6, 2], opacity: [0.6, 0.3, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                  className="absolute w-28 h-28 rounded-full border border-violet-500/40"
                />
                <motion.div
                  animate={{ scale: [1, 1.4, 1.8], opacity: [0.8, 0.4, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.5, ease: "easeOut" }}
                  className="absolute w-24 h-24 rounded-full border border-violet-400/50"
                />

                <motion.div
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                  className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-600/20 to-violet-900/30 border border-violet-500/40 flex items-center justify-center shadow-[0_0_40px_rgba(139,92,246,0.35)] relative z-10"
                >
                  <Nfc className="w-12 h-12 text-violet-300" />
                </motion.div>
              </div>

              <div className="text-center space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <span className="font-mono text-xs text-violet-300 font-semibold">
                    Customer Verified: {selectedCustomer.handle}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </div>
                <p className="text-sm font-semibold text-white/90">
                  Tap Physical NTAG424 DNA Chip
                </p>
                <p className="text-xs font-mono text-white/40">
                  Hold hardware terminal to chip embedded in {selectedItem.title}
                </p>
              </div>

              {/* Cryptographic Stages Real-time Feedback */}
              <div className="w-full p-4 rounded-xl bg-black/50 border border-white/8 space-y-2.5 font-mono text-xs">
                <div className="flex items-center justify-between text-[10px] text-white/35 uppercase tracking-wider">
                  <span>Cryptographic Handshake Protocol</span>
                  <span>NXP AN12196 / SP 800-38B</span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    {nfcHandshakeStage >= 1 ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-white/20" />
                    )}
                    <span className={cn(nfcHandshakeStage >= 1 ? "text-white/80" : "text-white/30")}>
                      1. Contactless Field Detected: ISO/IEC 14443-4
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {nfcHandshakeStage >= 2 ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-white/20" />
                    )}
                    <span className={cn(nfcHandshakeStage >= 2 ? "text-white/80" : "text-white/30")}>
                      2. Read PICCData Vector · UID: {selectedItem.chipUid} · Tap #143
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {nfcHandshakeStage >= 3 ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-white/20" />
                    )}
                    <span className={cn(nfcHandshakeStage >= 3 ? "text-white/80" : "text-white/30")}>
                      3. Derive K_SesSDMMAC Session Key via Vector SV2
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {nfcHandshakeStage >= 4 ? (
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-white/20" />
                    )}
                    <span className={cn(nfcHandshakeStage >= 4 ? "text-emerald-400 font-bold" : "text-white/30")}>
                      4. AES-128-CMAC Signature: {selectedItem.cmac} (MATCHED)
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 w-full pt-1">
                <button
                  onClick={() => setStep("SCAN_QR")}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-white/10 bg-white/4 hover:bg-white/10 text-xs font-mono text-white/60 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Back
                </button>
                <button
                  onClick={handleSimulateNfcTap}
                  disabled={nfcTapping}
                  className="btn-cta flex-1 flex items-center justify-center gap-2 text-xs shadow-[0_0_20px_rgba(139,92,246,0.3)] bg-violet-600 hover:bg-violet-500"
                >
                  {nfcTapping ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Performing CMAC Handshake...
                    </>
                  ) : (
                    <>
                      <Wifi className="w-4 h-4" />
                      Simulate Physical NFC Tap
                    </>
                  )}
                </button>
              </div>
            </FrostedCard>
          </motion.div>
        )}

        {/* STEP 4: Confirm Mint & Royalty Split */}
        {step === "CONFIRM_MINT" && (
          <motion.div
            key="confirm_mint"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <FrostedCard className="space-y-5">
              <div className="text-center space-y-1 border-b border-white/8 pb-4">
                <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold">
                  Handshake Verified · Authenticated
                </span>
                <h3 className="text-base font-bold text-white mt-2">
                  Confirm Mint & Ownership Transfer
                </h3>
                <p className="text-xs font-mono text-white/40">
                  Smart Contract initial owner registration + Automated split distribution
                </p>
              </div>

              {/* Handshake Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white/3 border border-white/8 space-y-1">
                  <p className="text-[10px] font-mono text-white/30 uppercase">New Registered Owner</p>
                  <p className="text-xs font-semibold text-white/90">{selectedCustomer.name}</p>
                  <div className="flex items-center gap-2">
                    <MonoValue className="text-[10px] text-cyan-300">{selectedCustomer.handle}</MonoValue>
                    <MonoValue className="text-[9px] text-white/30">{selectedCustomer.address}</MonoValue>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/3 border border-white/8 space-y-1">
                  <p className="text-[10px] font-mono text-white/30 uppercase">Physical Craft</p>
                  <p className="text-xs font-semibold text-white/90 truncate">{selectedItem.title}</p>
                  <div className="flex items-center gap-2">
                    <MonoValue className="text-[9px] text-white/40">{selectedItem.sku}</MonoValue>
                    <PriceTag cents={selectedItem.price} className="text-xs font-bold" />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/3 border border-white/8 space-y-1">
                  <p className="text-[10px] font-mono text-white/30 uppercase">Hardware Chip UID</p>
                  <ChipUID uid={selectedItem.chipUid} className="text-[11px]" />
                  <p className="text-[9px] font-mono text-white/30">NXP NTAG424 DNA (24-bit SDM)</p>
                </div>

                <div className="p-3 rounded-xl bg-white/3 border border-white/8 space-y-1">
                  <p className="text-[10px] font-mono text-white/30 uppercase">CMAC Signature</p>
                  <MonoValue glow="cyan" className="text-[11px]">
                    {selectedItem.cmac}
                  </MonoValue>
                  <p className="text-[9px] font-mono text-emerald-400/70">Verified Valid Signature</p>
                </div>
              </div>

              {/* Royalty Split Breakdown */}
              <div className="p-4 rounded-xl bg-black/40 border border-white/8 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white/80 uppercase font-mono">
                    Royalty Split Breakdown
                  </span>
                  <PriceTag cents={selectedItem.price} className="text-base font-bold" />
                </div>

                {/* Split Bars */}
                <div className="h-2 rounded-full bg-white/10 flex overflow-hidden gap-0.5">
                  <div
                    style={{ width: `${selectedItem.makerSharePct}%` }}
                    className="bg-orange-500 rounded-l-full shadow-[0_0_8px_rgba(204,85,0,0.5)]"
                    title={`Maker: ${selectedItem.makerSharePct}%`}
                  />
                  <div
                    style={{ width: `${selectedItem.platformSharePct}%` }}
                    className="bg-cyan-500"
                    title={`Platform: ${selectedItem.platformSharePct}%`}
                  />
                  <div
                    style={{ width: `${selectedItem.stakingSharePct}%` }}
                    className="bg-violet-500 rounded-r-full"
                    title={`Staking Pool: ${selectedItem.stakingSharePct}%`}
                  />
                </div>

                {/* Breakdown items */}
                <div className="grid grid-cols-3 gap-2 font-mono text-xs pt-1">
                  <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
                    <p className="text-[9px] text-orange-300 uppercase font-semibold">
                      Maker Cut ({selectedItem.makerSharePct}%)
                    </p>
                    <p className="text-xs font-bold text-white mt-0.5">${(makerPayout / 100).toFixed(2)}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                    <p className="text-[9px] text-cyan-300 uppercase font-semibold">
                      Platform ({selectedItem.platformSharePct}%)
                    </p>
                    <p className="text-xs font-bold text-white mt-0.5">${(platformFee / 100).toFixed(2)}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
                    <p className="text-[9px] text-violet-300 uppercase font-semibold">
                      Community ({selectedItem.stakingSharePct}%)
                    </p>
                    <p className="text-xs font-bold text-white mt-0.5">${(stakingPoolCut / 100).toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={reset}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg border border-white/10 bg-white/4 hover:bg-white/10 text-xs font-mono text-white/60 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Cancel
                </button>
                <button
                  onClick={handleExecuteMint}
                  className="btn-cta flex-1 flex items-center justify-center gap-2 text-sm shadow-[0_0_20px_rgba(204,85,0,0.35)]"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Execute Mint & Ownership Transfer
                </button>
              </div>
            </FrostedCard>
          </motion.div>
        )}

        {/* STEP 5: Minted Success */}
        {step === "MINTED" && (
          <motion.div
            key="minted"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <FrostedCard className="flex flex-col items-center gap-5 py-8 border-emerald-500/30">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)]"
              >
                <CheckCircle2 className="w-9 h-9 text-emerald-400" />
              </motion.div>

              <div className="text-center space-y-1">
                <p className="text-lg font-bold text-white">Ownership Successfully Minted</p>
                <p className="text-xs font-mono text-emerald-400">
                  Digital Handshake complete · Provenance recorded on-chain
                </p>
              </div>

              {/* Certificate Card */}
              <div className="w-full p-4 rounded-xl bg-black/60 border border-emerald-500/20 space-y-3">
                <div className="flex items-center justify-between border-b border-white/8 pb-2.5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="font-mono text-xs font-bold text-white">
                      MAKERVERSE PROVENANCE CERTIFICATE
                    </span>
                  </div>
                  <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                    BLOCK #22,841,094
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-white/30 uppercase block">Registered Owner</span>
                    <span className="text-cyan-300 font-medium">{selectedCustomer.handle}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-white/30 uppercase block">Craft Item</span>
                    <span className="text-white/80 font-medium truncate block">{selectedItem.title}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-white/30 uppercase block">Physical Chip UID</span>
                    <ChipUID uid={selectedItem.chipUid} className="text-[10px]" />
                  </div>
                  <div>
                    <span className="text-[10px] text-white/30 uppercase block">Transaction Hash</span>
                    <div className="flex items-center gap-1">
                      <span className="text-orange-300 text-[10px] truncate">{generatedTxHash}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(generatedTxHash);
                          setCopiedTx(true);
                          setTimeout(() => setCopiedTx(false), 2000);
                        }}
                        className="text-white/40 hover:text-white"
                      >
                        {copiedTx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={reset}
                className="btn-cta flex items-center gap-2 px-6 py-2.5 text-xs font-mono"
              >
                <Plus className="w-4 h-4" />
                Process New Transaction
              </button>
            </FrostedCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Low-Touch Flow ────────────────────────────────────────────────────────────

interface LowTouchItem {
  id: string;
  sku: string;
  title: string;
  price: number; // cents
  qty: number;
}

const INITIAL_LOW_TOUCH_ITEMS: LowTouchItem[] = [
  { id: "lt_001", sku: "FC-MTL-PNT-007", title: 'Makers Pennant — 3" Steel Stamp', price: 2200, qty: 2 },
  { id: "lt_002", sku: "FC-CPR-CFF-LNK-011", title: "Copper Coffee Link Bracelet", price: 7800, qty: 1 },
  { id: "lt_003", sku: "FC-LTH-CRD-ORG-014", title: "Veg-Tan Cord Organizer — 3-Pack", price: 1600, qty: 3 },
  { id: "lt_004", sku: "FC-BRS-PNT-022", title: "Brass Studio Monogram Pin", price: 3500, qty: 0 },
];

function LowTouchFlow({
  onTransactionComplete,
}: {
  onTransactionComplete: (tx: POSTransaction) => void;
}) {
  const [batchItems, setBatchItems] = useState<LowTouchItem[]>(INITIAL_LOW_TOUCH_ITEMS);
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkedOut, setCheckedOut] = useState(false);
  const [receiptSummary, setReceiptSummary] = useState<{ total: number; itemCount: number } | null>(null);

  const activeItems = batchItems.filter((i) => i.qty > 0);
  const totalCents = batchItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const totalItemCount = batchItems.reduce((sum, item) => sum + item.qty, 0);

  const handleQtyChange = (id: string, delta: number) => {
    setBatchItems((items) =>
      items.map((i) => (i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i)),
    );
  };

  const handleBatchCheckout = () => {
    if (totalItemCount === 0) return;
    setIsProcessing(true);

    setTimeout(() => {
      // Append generated transactions for items checked out
      activeItems.forEach((item, index) => {
        const newTx: POSTransaction = {
          txId: `pos_tx_${Date.now()}_${index}`,
          mode: "LOW_TOUCH",
          productTitle: item.title,
          sku: item.sku,
          price: item.price * item.qty,
          buyerHandle: null,
          chipUid: `04:${Math.random().toString(16).substring(2, 4).toUpperCase()}:${Math.random().toString(16).substring(2, 4).toUpperCase()}:${Math.random().toString(16).substring(2, 4).toUpperCase()}:11:22:33`,
          status: "UNCLAIMED",
          timestamp: new Date().toISOString(),
          nfcTapped: false,
          qrScanned: false,
        };
        onTransactionComplete(newTx);
      });

      setReceiptSummary({ total: totalCents, itemCount: totalItemCount });
      setIsProcessing(false);
      setCheckedOut(true);
    }, 900);
  };

  const handleResetBatch = () => {
    setCheckedOut(false);
    setBatchItems(INITIAL_LOW_TOUCH_ITEMS);
    setReceiptSummary(null);
  };

  return (
    <div className="space-y-5">
      {/* Mode Advisory Banner */}
      <div className="px-4 py-3 rounded-xl bg-sky-500/8 border border-sky-500/20 flex items-center gap-3">
        <Layers className="w-4 h-4 text-sky-400 flex-shrink-0" />
        <p className="text-xs font-mono text-sky-300/85 leading-relaxed">
          <span className="font-semibold text-sky-300">Low-Touch Mode (Volume Goods)</span> —
          Rapid batch checkout. Tags remain in <span className="font-bold underline">UNCLAIMED</span> state
          for buyer home tap registration.
        </p>
      </div>

      {/* Batch Checkout Queue */}
      <FrostedCard noPadding>
        <div className="px-4 py-3.5 border-b border-white/8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-sky-400" />
            <h3 className="text-xs font-semibold text-white/80 uppercase tracking-widest">
              Volume Goods Batch Counter
            </h3>
          </div>
          <StatusBadge variant="LOW_TOUCH" />
        </div>

        <div className="divide-y divide-white/5">
          {batchItems.map((item) => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3">
              <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center flex-shrink-0">
                <Package className="w-4 h-4 text-white/30" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white/90 truncate">{item.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <MonoValue className="text-[9px] text-white/35">{item.sku}</MonoValue>
                  <span className="text-[10px] font-mono text-white/30">
                    ${(item.price / 100).toFixed(2)}/ea
                  </span>
                </div>
              </div>

              {/* Quantity counter control */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="flex items-center border border-white/10 rounded-lg bg-white/3 overflow-hidden">
                  <button
                    onClick={() => handleQtyChange(item.id, -1)}
                    className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="font-mono text-xs text-white/90 w-7 text-center font-semibold">
                    {item.qty}
                  </span>
                  <button
                    onClick={() => handleQtyChange(item.id, 1)}
                    className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <PriceTag cents={item.price * item.qty} className="text-xs font-bold w-16 text-right" />
              </div>
            </div>
          ))}
        </div>

        {/* Batch Queue Subtotal & Total */}
        <div className="p-4 border-t border-white/8 bg-white/[0.01] flex items-center justify-between">
          <div>
            <span className="text-xs font-mono text-white/40 uppercase">
              Total ({totalItemCount} unit{totalItemCount === 1 ? "" : "s"})
            </span>
          </div>
          <PriceTag cents={totalCents} className="text-lg font-bold" />
        </div>
      </FrostedCard>

      {/* Unclaimed Physical Tag Advisory Banner */}
      <div className="p-4 rounded-xl bg-sky-500/5 border border-sky-500/25 flex items-start gap-3">
        <Smartphone className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-xs font-semibold text-white/90">
            Unclaimed Physical Tag Advisory Notice
          </p>
          <p className="text-[11px] font-mono text-sky-200/75 leading-relaxed">
            Tags will remain in <span className="text-sky-300 font-bold">UNCLAIMED</span> state for buyer home tap registration.
            The buyer unboxes, taps the physical NTAG chip at home with their smartphone, and claims digital certificate ownership.
          </p>
        </div>
      </div>

      {/* Instant Checkout Action */}
      <AnimatePresence mode="wait">
        {!checkedOut ? (
          <motion.button
            key="checkout_btn"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleBatchCheckout}
            disabled={isProcessing || totalItemCount === 0}
            className={cn(
              "w-full py-3 rounded-xl font-semibold text-xs sm:text-sm font-mono flex items-center justify-center gap-2 transition-all cursor-pointer",
              totalItemCount > 0
                ? "bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold shadow-[0_0_20px_rgba(56,189,248,0.3)]"
                : "bg-white/5 text-white/20 border border-white/10 cursor-not-allowed",
            )}
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                Processing Batch Checkout...
              </>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4" />
                Instant Batch Checkout — Leave Tags Unclaimed (${(totalCents / 100).toFixed(2)})
              </>
            )}
          </motion.button>
        ) : (
          <motion.div
            key="checkout_success"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            <FrostedCard className="flex flex-col items-center gap-4 py-6 border-sky-500/30">
              <div className="w-14 h-14 rounded-full bg-sky-500/15 border border-sky-500/30 flex items-center justify-center shadow-[0_0_24px_rgba(56,189,248,0.25)]">
                <CheckCircle2 className="w-8 h-8 text-sky-400" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-base font-bold text-white">Batch Sale Finalized</p>
                <p className="text-xs font-mono text-sky-300">
                  {receiptSummary?.itemCount} items checked out · Tags registered as UNCLAIMED
                </p>
              </div>
              <PriceTag cents={receiptSummary?.total ?? 0} className="text-lg font-bold" />
              <button
                onClick={handleResetBatch}
                className="btn-cta flex items-center gap-2 px-6 py-2 text-xs font-mono"
              >
                <Plus className="w-4 h-4" />
                Start New Batch
              </button>
            </FrostedCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Transaction Ledger Log Table ──────────────────────────────────────────────

function TransactionLedger({ transactions }: { transactions: POSTransaction[] }) {
  const [ledgerFilter, setLedgerFilter] = useState<"ALL" | POSMode>("ALL");
  const [search, setSearch] = useState("");

  const filtered = transactions.filter((tx) => {
    const matchesMode = ledgerFilter === "ALL" || tx.mode === ledgerFilter;
    const matchesSearch =
      search === "" ||
      tx.productTitle.toLowerCase().includes(search.toLowerCase()) ||
      tx.sku.toLowerCase().includes(search.toLowerCase()) ||
      (tx.buyerHandle && tx.buyerHandle.toLowerCase().includes(search.toLowerCase())) ||
      tx.chipUid.toLowerCase().includes(search.toLowerCase());
    return matchesMode && matchesSearch;
  });

  return (
    <FrostedCard noPadding className="overflow-hidden">
      {/* Table Header */}
      <div className="px-4 py-3.5 border-b border-white/8 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-orange-400" />
          <h3 className="text-xs font-semibold text-white/80 uppercase tracking-widest">
            In-Person POS Transaction Ledger
          </h3>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-white/10 bg-white/3 p-0.5 font-mono text-[10px]">
            {(["ALL", "HIGH_TOUCH", "LOW_TOUCH"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setLedgerFilter(m)}
                className={cn(
                  "px-2 py-1 rounded transition-all",
                  ledgerFilter === m
                    ? "bg-white/15 text-white font-bold"
                    : "text-white/40 hover:text-white/70",
                )}
              >
                {m === "ALL" ? "All Sales" : m === "HIGH_TOUCH" ? "High-Touch" : "Low-Touch"}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="Search UID, SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] font-mono text-white placeholder:text-white/25 focus:outline-none focus:border-orange-500/50"
          />
        </div>
      </div>

      {/* Ledger Rows */}
      <div className="divide-y divide-white/5 font-mono text-xs">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-white/30 text-xs">
            No transactions found
          </div>
        ) : (
          filtered.map((tx) => (
            <div
              key={tx.txId}
              className="flex items-center gap-3.5 px-4 py-3 transition-colors hover:bg-white/[0.02]"
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                  tx.mode === "HIGH_TOUCH" ? "bg-orange-500/10" : "bg-sky-500/10",
                )}
              >
                {tx.mode === "HIGH_TOUCH" ? (
                  <Nfc className="w-4 h-4 text-orange-400" />
                ) : (
                  <Layers className="w-4 h-4 text-sky-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white/90 truncate font-sans">
                  {tx.productTitle}
                </p>
                <div className="flex items-center gap-2.5 mt-0.5 flex-wrap">
                  <span className="text-[10px] text-white/35">{tx.sku}</span>
                  <ChipUID uid={tx.chipUid} className="text-[9px]" />
                  {tx.buyerHandle && (
                    <span className="text-[10px] text-cyan-300/80">{tx.buyerHandle}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2.5 flex-shrink-0">
                <StatusBadge variant={tx.mode} />
                <StatusBadge variant={tx.status} />
                <PriceTag cents={tx.price} className="text-xs font-bold" />
              </div>
            </div>
          ))
        )}
      </div>
    </FrostedCard>
  );
}

// ─── Main POSTerminal Component ────────────────────────────────────────────────

export function POSTerminal() {
  const [mode, setMode] = useState<POSMode>("HIGH_TOUCH");
  const [transactions, setTransactions] = useState<POSTransaction[]>(POS_TRANSACTIONS);

  const handleTransactionComplete = (newTx: POSTransaction) => {
    setTransactions((prev) => [newTx, ...prev]);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-xl font-bold text-white tracking-wide">
            Dual-Tier Point-of-Sale (POS) Terminal
          </h1>
          <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-300 font-semibold">
            Vendor Admin Suite
          </span>
          <VersionReleaseBadge variant="pill" />
        </div>
        <p className="text-xs font-mono text-white/40 mt-1">
          High-Touch NFC Cryptographic Handshake ($100+) · Low-Touch Volume Batch Checkout
        </p>
      </div>

      {/* Animated Mode Switcher Bar */}
      <ModeSwitcher mode={mode} setMode={setMode} />

      {/* Mode Workflow Component */}
      <AnimatePresence mode="wait">
        {mode === "HIGH_TOUCH" ? (
          <motion.div
            key="high_touch"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <HighTouchFlow onTransactionComplete={handleTransactionComplete} />
          </motion.div>
        ) : (
          <motion.div
            key="low_touch"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <LowTouchFlow onTransactionComplete={handleTransactionComplete} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live Transaction Ledger Log */}
      <TransactionLedger transactions={transactions} />
    </div>
  );
}
