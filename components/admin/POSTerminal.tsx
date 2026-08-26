// components/admin/POSTerminal.tsx
"use client";

import { useState } from "react";
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
} from "lucide-react";
import { FrostedCard } from "@/components/ui/FrostedCard";
import { MonoValue, PriceTag, ChipUID } from "@/components/ui/MonoValue";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { POS_TRANSACTIONS } from "@/lib/mock/adminData";
import { cn } from "@/lib/utils";

type POSMode = "HIGH_TOUCH" | "LOW_TOUCH";

// ─── Mode Switcher ─────────────────────────────────────────────────────────────

function ModeSwitcher({ mode, setMode }: { mode: POSMode; setMode: (m: POSMode) => void }) {
  return (
    <div className="flex rounded-xl border border-white/10 bg-white/3 p-1 gap-1">
      {(["HIGH_TOUCH", "LOW_TOUCH"] as POSMode[]).map((m) => (
        <button
          key={m}
          onClick={() => setMode(m)}
          className={cn(
            "relative flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200",
            mode === m
              ? "text-white"
              : "text-white/35 hover:text-white/60",
          )}
        >
          {mode === m && (
            <motion.div
              layoutId="pos-mode-indicator"
              className={cn(
                "absolute inset-0 rounded-lg border",
                m === "HIGH_TOUCH"
                  ? "bg-orange-500/20 border-orange-500/40"
                  : "bg-sky-500/15 border-sky-500/30",
              )}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
          <span className="relative z-10 flex items-center gap-2">
            {m === "HIGH_TOUCH" ? (
              <Nfc className="w-4 h-4" />
            ) : (
              <Layers className="w-4 h-4" />
            )}
            {m === "HIGH_TOUCH" ? "High-Touch" : "Low-Touch"}
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── High-Touch Flow ──────────────────────────────────────────────────────────

type HTStep = "SCAN_QR" | "TAP_NFC" | "CONFIRM_MINT" | "MINTED";

function HighTouchFlow() {
  const [step, setStep] = useState<HTStep>("SCAN_QR");

  const STEPS: HTStep[] = ["SCAN_QR", "TAP_NFC", "CONFIRM_MINT", "MINTED"];
  const stepIndex = STEPS.indexOf(step);

  const reset = () => {
    setStep("SCAN_QR");
  };

  return (
    <div className="space-y-5">
      {/* Description */}
      <div className="px-4 py-3 rounded-xl bg-orange-500/8 border border-orange-500/20">
        <p className="text-xs font-mono text-orange-300/80">
          <span className="font-semibold text-orange-300">High-Touch Mode</span> — For items
          valued \$100+. Scan buyer&apos;s Cozy Member QR, then tap the physical NFC chip to
          execute an on-site digital handshake and initial owner mint.
        </p>
      </div>

      {/* Step progress */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div
              className={cn(
                "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-mono text-[10px] border transition-all",
                i < stepIndex
                  ? "bg-orange-500 border-orange-500 text-white"
                  : i === stepIndex
                    ? "border-orange-500 text-orange-400 bg-orange-500/15"
                    : "border-white/15 text-white/25 bg-white/3",
              )}
            >
              {i < stepIndex ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-px transition-all",
                  i < stepIndex ? "bg-orange-500/50" : "bg-white/10",
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        {step === "SCAN_QR" && (
          <motion.div
            key="scan_qr"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2 }}
          >
            <FrostedCard className="flex flex-col items-center gap-4 py-8">
              <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <QrCode className="w-10 h-10 text-white/30" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-white/80">Scan Buyer&apos;s Cozy Member QR</p>
                <p className="text-xs font-mono text-white/35 mt-1">
                  Point scanner at buyer&apos;s Makerverse / Cozy app
                </p>
              </div>
              <button
                onClick={() => {
                  setStep("TAP_NFC");
                }}
                className="btn-cta flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Simulate QR Scan
              </button>
            </FrostedCard>
          </motion.div>
        )}

        {step === "TAP_NFC" && (
          <motion.div
            key="tap_nfc"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2 }}
          >
            <FrostedCard className="flex flex-col items-center gap-4 py-8">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="w-20 h-20 rounded-2xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.25)]"
              >
                <Nfc className="w-10 h-10 text-violet-300" />
              </motion.div>
              <div className="text-center">
                <StatusBadge variant="COZY_MEMBER" label="@ironwood_maren · Verified" className="mb-2" />
                <p className="text-sm font-semibold text-white/80">Tap Physical NFC Chip</p>
                <p className="text-xs font-mono text-white/35 mt-1">
                  Hold device to NTAG424 DNA chip embedded in item
                </p>
              </div>
              <button
                onClick={() => {
                  setStep("CONFIRM_MINT");
                }}
                className="btn-cta flex items-center gap-2"
              >
                <Wifi className="w-4 h-4" />
                Simulate NFC Tap
              </button>
            </FrostedCard>
          </motion.div>
        )}

        {step === "CONFIRM_MINT" && (
          <motion.div
            key="confirm_mint"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2 }}
          >
            <FrostedCard className="space-y-4">
              <h3 className="text-sm font-semibold text-white/90 text-center">Confirm Ownership Handshake</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-white/3 border border-white/8 space-y-1">
                  <p className="text-[9px] font-mono text-white/30 uppercase">Buyer</p>
                  <MonoValue className="text-xs text-white/70">@ironwood_maren</MonoValue>
                  <MonoValue className="text-[9px] text-white/30">0x8f2A...1cD9</MonoValue>
                </div>
                <div className="p-3 rounded-lg bg-white/3 border border-white/8 space-y-1">
                  <p className="text-[9px] font-mono text-white/30 uppercase">Item</p>
                  <p className="text-xs text-white/70">Blackened Copper Keyring</p>
                  <PriceTag cents={4800} className="text-xs" />
                </div>
                <div className="p-3 rounded-lg bg-white/3 border border-white/8 space-y-1">
                  <p className="text-[9px] font-mono text-white/30 uppercase">Chip UID</p>
                  <ChipUID uid="04:A3:F2:11:8E:2C:80" />
                </div>
                <div className="p-3 rounded-lg bg-white/3 border border-white/8 space-y-1">
                  <p className="text-[9px] font-mono text-white/30 uppercase">CMAC</p>
                  <MonoValue glow="cyan" className="text-[9px]">3A9F1C2E4B8D7F60</MonoValue>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={reset}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-white/10 bg-white/5 text-sm text-white/50 hover:text-white/80 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Cancel
                </button>
                <button
                  onClick={() => setStep("MINTED")}
                  className="btn-cta flex-1 flex items-center justify-center gap-2"
                >
                  <ArrowRight className="w-4 h-4" />
                  Execute Mint
                </button>
              </div>
            </FrostedCard>
          </motion.div>
        )}

        {step === "MINTED" && (
          <motion.div
            key="minted"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, type: "spring", stiffness: 200 }}
          >
            <FrostedCard className="flex flex-col items-center gap-4 py-10 border-emerald-500/25">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
                className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.25)]"
              >
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </motion.div>
              <div className="text-center">
                <p className="text-lg font-bold text-white">Ownership Minted</p>
                <p className="text-xs font-mono text-emerald-400/80 mt-1">
                  Digital handshake complete · @ironwood_maren is now registered owner
                </p>
              </div>
              <MonoValue glow="cyan" className="text-[10px] text-center">
                tx: 0xc4e1...f8d2 · block #22,841,094
              </MonoValue>
              <button
                onClick={reset}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-white/50 hover:text-white/80 transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Transaction
              </button>
            </FrostedCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Low-Touch Flow ────────────────────────────────────────────────────────────

function LowTouchFlow() {
  const [batchItems, setBatchItems] = useState([
    { id: "lt_001", sku: "FC-MTL-PNT-007", title: 'Makers Pennant — 3" Steel Stamp', price: 2200, qty: 3 },
    { id: "lt_002", sku: "FC-CPR-CFF-LNK-011", title: "Copper Coffee Link Bracelet", price: 7800, qty: 1 },
  ]);
  const [checked, setChecked] = useState(false);

  const total = batchItems.reduce((sum, i) => sum + i.price * i.qty, 0);

  return (
    <div className="space-y-5">
      <div className="px-4 py-3 rounded-xl bg-sky-500/8 border border-sky-500/20">
        <p className="text-xs font-mono text-sky-300/80">
          <span className="font-semibold text-sky-300">Low-Touch Mode</span> — For volume
          goods. Complete batch checkout keeping tags in an <em>unclaimed</em> state. Buyers
          tap and register at home via the Makerverse app.
        </p>
      </div>

      {/* Batch queue */}
      <FrostedCard noPadding>
        <div className="px-4 py-3 border-b border-white/8 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-white/60 uppercase tracking-widest">
            Batch Checkout Queue
          </h3>
          <StatusBadge variant="LOW_TOUCH" />
        </div>
        <div className="divide-y divide-white/5">
          {batchItems.map((item) => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center flex-shrink-0">
                <Package className="w-4 h-4 text-white/30" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white/80 truncate">{item.title}</p>
                <MonoValue className="text-[9px] text-white/30">{item.sku}</MonoValue>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="flex items-center gap-1.5 border border-white/10 rounded-lg">
                  <button
                    onClick={() =>
                      setBatchItems((items) =>
                        items.map((i) => (i.id === item.id ? { ...i, qty: Math.max(1, i.qty - 1) } : i)),
                      )
                    }
                    className="px-2 py-1 text-white/40 hover:text-white/80 transition-colors font-mono text-sm"
                  >
                    −
                  </button>
                  <span className="font-mono text-xs text-white/70 w-5 text-center">{item.qty}</span>
                  <button
                    onClick={() =>
                      setBatchItems((items) =>
                        items.map((i) => (i.id === item.id ? { ...i, qty: i.qty + 1 } : i)),
                      )
                    }
                    className="px-2 py-1 text-white/40 hover:text-white/80 transition-colors font-mono text-sm"
                  >
                    +
                  </button>
                </div>
                <PriceTag cents={item.price * item.qty} className="text-xs" />
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/8">
          <span className="text-xs font-mono text-white/40">Total</span>
          <PriceTag cents={total} className="text-base" />
        </div>
      </FrostedCard>

      {/* Unclaimed state note */}
      <div className="flex items-start gap-2.5 px-3 py-3 rounded-xl bg-white/3 border border-white/8">
        <Smartphone className="w-4 h-4 text-white/30 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-medium text-white/70">
            Tags remain in <span className="font-mono text-sky-400">UNCLAIMED</span> state
          </p>
          <p className="text-[10px] font-mono text-white/30 mt-0.5">
            Buyer scans or taps at home → Makerverse app guides registration → ownership recorded
          </p>
        </div>
      </div>

      {/* Confirm */}
      <AnimatePresence mode="wait">
        {!checked ? (
          <motion.button
            key="checkout"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setChecked(true)}
            className="btn-cta w-full flex items-center justify-center gap-2 text-sm"
          >
            <ShoppingBag className="w-4 h-4" />
            Complete Batch Checkout — Leave Tags Unclaimed
          </motion.button>
        ) : (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-center gap-3 py-6"
          >
            <CheckCircle2 className="w-10 h-10 text-sky-400" />
            <p className="text-sm font-semibold text-white/90">
              Batch Checked Out
            </p>
            <p className="text-xs font-mono text-white/35">
              {batchItems.reduce((s, i) => s + i.qty, 0)} items · tags unclaimed · awaiting buyer registration
            </p>
            <button
              onClick={() => setChecked(false)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-white/50 hover:text-white/80 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Batch
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Transaction Log Table ─────────────────────────────────────────────────────

function TransactionLog() {
  return (
    <FrostedCard noPadding>
      <div className="px-4 py-3 border-b border-white/8">
        <h3 className="text-xs font-semibold text-white/60 uppercase tracking-widest">
          Today&apos;s Transaction Log
        </h3>
      </div>
      <div className="divide-y divide-white/5">
        {POS_TRANSACTIONS.map((tx) => (
          <div key={tx.txId} className="flex items-center gap-3 px-4 py-3">
            <div
              className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
                tx.mode === "HIGH_TOUCH" ? "bg-orange-500/10" : "bg-sky-500/10",
              )}
            >
              {tx.mode === "HIGH_TOUCH" ? (
                <Nfc className="w-3.5 h-3.5 text-orange-400" />
              ) : (
                <Layers className="w-3.5 h-3.5 text-sky-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white/80 truncate">{tx.productTitle}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <MonoValue className="text-[9px] text-white/30">{tx.sku}</MonoValue>
                <ChipUID uid={tx.chipUid} className="text-[8px]" />
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <StatusBadge variant={tx.mode} />
              <StatusBadge variant={tx.status} />
              <PriceTag cents={tx.price} className="text-xs" />
            </div>
          </div>
        ))}
      </div>
    </FrostedCard>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function POSTerminal() {
  const [mode, setMode] = useState<POSMode>("HIGH_TOUCH");

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-white">POS Handshake Terminal</h1>
        <p className="text-xs font-mono text-white/35 mt-0.5">
          Dual-tier checkout · NFC mint · Unclaimed batch flow
        </p>
      </div>

      {/* Mode switcher */}
      <ModeSwitcher mode={mode} setMode={setMode} />

      {/* Mode content */}
      <AnimatePresence mode="wait">
        {mode === "HIGH_TOUCH" ? (
          <motion.div
            key="high"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <HighTouchFlow />
          </motion.div>
        ) : (
          <motion.div
            key="low"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <LowTouchFlow />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transaction log */}
      <TransactionLog />
    </div>
  );
}
