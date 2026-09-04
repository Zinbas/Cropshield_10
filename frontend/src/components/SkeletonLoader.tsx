import { Sprout, ShieldCheck, RefreshCw } from "lucide-react";

export function SkeletonLoader({ className = "", lines = 3 }: { className?: string; lines?: number }) {
  return (
    <div className={`space-y-3 animate-pulse ${className}`}>
      <div className="h-4 bg-emerald-950/10 rounded-md w-1/3" />
      <div className="h-8 bg-emerald-950/15 rounded-lg w-3/4" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 bg-emerald-950/10 rounded-md w-full" />
      ))}
    </div>
  );
}

export function MetricCardSkeleton() {
  return (
    <div className="bg-white border border-neutral-200/80 rounded-2xl p-4 shadow-sm animate-pulse space-y-3">
      <div className="flex justify-between items-center">
        <div className="h-3 bg-neutral-200 rounded w-20" />
        <div className="w-6 h-6 rounded-md bg-neutral-200" />
      </div>
      <div className="h-7 bg-neutral-200 rounded w-16" />
      <div className="h-3 bg-neutral-200 rounded w-28" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="page-stack space-y-4 animate-in fade-in duration-300">
      {/* Welcome Banner Skeleton */}
      <div className="surface-card bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 animate-pulse space-y-3">
        <div className="h-3 bg-emerald-200/60 rounded w-28" />
        <div className="h-8 bg-emerald-200/80 rounded w-52" />
        <div className="h-4 bg-emerald-200/50 rounded w-44" />
      </div>

      {/* Metric Cards Skeleton Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
      </div>

      {/* Content Card Skeleton */}
      <div className="surface-card bg-white rounded-2xl p-5 border border-neutral-200/80 space-y-4 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-5 bg-neutral-200 rounded w-36" />
          <div className="h-4 bg-neutral-200 rounded w-16" />
        </div>
        <div className="space-y-2.5">
          <div className="h-16 bg-neutral-100 rounded-xl w-full" />
          <div className="h-16 bg-neutral-100 rounded-xl w-full" />
        </div>
      </div>
    </div>
  );
}

export function AppLoadingScreen({ message = "Connecting to crop intelligence network…" }: { message?: string }) {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-5 animate-in fade-in duration-300">
      <div className="relative">
        {/* Pulsing Aura */}
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 animate-ping absolute inset-0" />
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white flex items-center justify-center shadow-xl shadow-emerald-900/20 relative z-10">
          <Sprout size={36} className="animate-bounce" />
        </div>
      </div>

      <div className="space-y-1.5 max-w-xs">
        <h3 className="text-base font-bold text-neutral-900 tracking-tight flex items-center justify-center gap-1.5">
          <span>CropShield</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">Live</span>
        </h3>
        <p className="text-xs text-neutral-500 flex items-center justify-center gap-1.5">
          <RefreshCw size={13} className="animate-spin text-emerald-600" />
          <span>{message}</span>
        </p>
      </div>

      {/* Progress Dots */}
      <div className="flex gap-1.5 pt-2">
        <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse delay-100" />
        <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse delay-200" />
      </div>
    </div>
  );
}
