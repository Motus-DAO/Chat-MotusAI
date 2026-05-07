"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface LiquidGlassProps {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  variant?: "dark" | "light";
}

export function LiquidGlass({
  children,
  className,
  contentClassName,
  variant = "dark",
}: LiquidGlassProps) {
  const isLight = variant === "light";
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl",
        isLight
          ? "shadow-[0_12px_30px_rgba(15,23,42,0.12),0_0_0_1px_rgba(148,163,184,0.2),inset_0_1px_0_rgba(255,255,255,0.8)]"
          : "shadow-[0_16px_42px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.04),inset_0_1px_0_rgba(255,255,255,0.14)]",
        className,
      )}
      style={{
        transitionTimingFunction: "cubic-bezier(0.175, 0.885, 0.32, 1.5)",
      }}
    >
      <div
        className="absolute inset-0 z-0"
        style={{
          backdropFilter: "saturate(175%) blur(30px)",
          WebkitBackdropFilter: "saturate(175%) blur(30px)",
          filter: "url(#liquid-glass-distortion)",
          isolation: "isolate",
        }}
      />
      <div
        className={cn(
          "absolute inset-0 z-10",
          isLight ? "bg-[rgba(255,255,255,0.74)]" : "bg-[rgba(4,4,8,0.72)]",
        )}
      />
      <div
        className={cn(
          "absolute inset-0 z-20",
          isLight
            ? "bg-[linear-gradient(135deg,rgba(255,255,255,0.95)_0%,rgba(255,255,255,0.58)_100%)]"
            : "bg-[linear-gradient(135deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.035)_100%)]",
        )}
      />
      <div
        className={cn(
          "absolute inset-0 z-30",
          isLight
            ? "shadow-[inset_2px_2px_1px_0_rgba(255,255,255,0.85),inset_-1px_-1px_1px_1px_rgba(255,255,255,0.7)]"
            : "shadow-[inset_2px_2px_1px_0_rgba(255,255,255,0.16),inset_-1px_-1px_1px_1px_rgba(255,255,255,0.1)]",
        )}
      />

      <div className={cn("relative z-40", contentClassName)}>{children}</div>
    </div>
  );
}

export function LiquidGlassFilter() {
  return (
    <svg className="pointer-events-none absolute h-0 w-0" aria-hidden>
      <filter
        id="liquid-glass-distortion"
        x="0%"
        y="0%"
        width="100%"
        height="100%"
        filterUnits="objectBoundingBox"
      >
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.001 0.005"
          numOctaves="1"
          seed="17"
          result="turbulence"
        />
        <feComponentTransfer in="turbulence" result="mapped">
          <feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5" />
          <feFuncG type="gamma" amplitude="0" exponent="1" offset="0" />
          <feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5" />
        </feComponentTransfer>
        <feGaussianBlur in="turbulence" stdDeviation="2.2" result="softMap" />
        <feDisplacementMap
          in="SourceGraphic"
          in2="softMap"
          scale="120"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </svg>
  );
}
