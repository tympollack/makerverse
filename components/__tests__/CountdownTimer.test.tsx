// components/__tests__/CountdownTimer.test.tsx
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { CountdownTimer, TTLBar, formatTTL } from "@/components/ui/CountdownTimer";

describe("CountdownTimer & TTLBar Components", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("formatTTL Helper", () => {
    it("formats milliseconds into MM:SS format correctly", () => {
      expect(formatTTL(0)).toBe("00:00");
      expect(formatTTL(-5000)).toBe("00:00");
      expect(formatTTL(5000)).toBe("00:05");
      expect(formatTTL(65_000)).toBe("01:05");
      expect(formatTTL(600_000)).toBe("10:00");
      expect(formatTTL(3599_000)).toBe("59:59");
    });
  });

  describe("CountdownTimer Thresholds & States", () => {
    it("renders Green styling when TTL > 180s (> 3 mins)", () => {
      const now = Date.now();
      const expiresAt = now + 400_000; // ~6.6 min

      render(<CountdownTimer expiresAt={expiresAt} />);

      const timerEl = screen.getByText("06:40");
      expect(timerEl).toBeInTheDocument();
      expect(timerEl).toHaveClass("text-emerald-400");
    });

    it("renders Amber warning styling when TTL is between 60s and 180s (1-3 mins)", () => {
      const now = Date.now();
      const expiresAt = now + 120_000; // 2 min

      render(<CountdownTimer expiresAt={expiresAt} />);

      const timerEl = screen.getByText("02:00");
      expect(timerEl).toBeInTheDocument();
      expect(timerEl).toHaveClass("text-amber-400");
    });

    it("renders Red pulsing critical styling when TTL < 60s (< 1 min)", () => {
      const now = Date.now();
      const expiresAt = now + 45_000; // 45s

      render(<CountdownTimer expiresAt={expiresAt} />);

      const timerEl = screen.getByText("00:45");
      expect(timerEl).toBeInTheDocument();
      expect(timerEl).toHaveClass("text-red-400");
      expect(timerEl).toHaveClass("animate-pulse");
    });

    it("renders EXPIRED and triggers onExpire callback when timer hits 0", () => {
      const onExpire = vi.fn();
      const baseTime = 1_700_000_000_000;
      vi.setSystemTime(baseTime);
      const expiresAt = baseTime + 1000; // 1s remaining

      render(<CountdownTimer expiresAt={expiresAt} onExpire={onExpire} />);

      expect(screen.getByText("00:01")).toBeInTheDocument();

      // Advance both system time and timer ticks past expiry
      act(() => {
        vi.setSystemTime(baseTime + 1500);
        vi.advanceTimersByTime(1500);
      });
      // Allow AnimatePresence exit transition to complete
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(screen.getByText("EXPIRED")).toBeInTheDocument();
      expect(onExpire).toHaveBeenCalledTimes(1);
    });

    it("renders EXPIRED immediately if expiresAt is in the past", () => {
      const pastTime = Date.now() - 10_000;
      render(<CountdownTimer expiresAt={pastTime} />);

      expect(screen.getByText("EXPIRED")).toBeInTheDocument();
      const expiredEl = screen.getByText("EXPIRED");
      expect(expiredEl).toHaveClass("text-white/35");
    });
  });

  describe("TTLBar Component", () => {
    it("renders progress bar with appropriate color and width style", () => {
      const now = Date.now();
      const createdAt = now - 100_000;
      const expiresAt = now + 400_000; // Total 500s, remaining 400s -> 80%

      const { container } = render(
        <TTLBar createdAt={createdAt} expiresAt={expiresAt} className="test-bar" />
      );

      const barContainer = container.querySelector(".test-bar");
      expect(barContainer).toBeInTheDocument();

      const innerBar = barContainer?.querySelector("div");
      expect(innerBar).toHaveClass("bg-emerald-500");
      expect(innerBar).toHaveStyle({ width: "80%" });
    });

    it("transitions bar color to amber and red as TTL depletes", () => {
      const now = Date.now();
      const createdAt = now - 400_000;
      const expiresAt = now + 50_000; // 50s left -> critical

      const { container } = render(
        <TTLBar createdAt={createdAt} expiresAt={expiresAt} />
      );

      const innerBar = container.querySelector(".bg-red-500");
      expect(innerBar).toBeInTheDocument();
      expect(innerBar).toHaveClass("animate-pulse");
    });

    it("renders gray bar when expired", () => {
      const now = Date.now();
      const createdAt = now - 600_000;
      const expiresAt = now - 10_000; // expired

      const { container } = render(
        <TTLBar createdAt={createdAt} expiresAt={expiresAt} />
      );

      const innerBar = container.querySelector(".bg-white\\/10");
      expect(innerBar).toBeInTheDocument();
    });
  });
});
