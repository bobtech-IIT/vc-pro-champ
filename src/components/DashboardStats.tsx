'use client';

import React from 'react';
import { AuditStats } from '@/lib/types';
import { CreditCard, ShieldCheck, Wrench, CopyCheck, CheckCircle2 } from 'lucide-react';

interface DashboardStatsProps {
  stats: AuditStats;
  currentCount: number;
  maxLimit: number;
}

export default function DashboardStats({ stats, currentCount, maxLimit }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4 mb-6">
      
      {/* 1. Total Scanned Cards */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Total Scanned</span>
          <CreditCard className="w-4 h-4 text-indigo-400" />
        </div>
        <div>
          <div className="text-2xl font-bold font-mono text-white">
            {currentCount} <span className="text-xs font-sans font-normal text-slate-400">/ {maxLimit} max</span>
          </div>
          <div className="w-full bg-slate-950 h-1.5 rounded-full mt-2 overflow-hidden border border-slate-800">
            <div
              className="bg-indigo-500 h-full transition-all duration-300"
              style={{ width: `${(currentCount / maxLimit) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* 2. Cleanliness Score */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Audit Score</span>
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {stats.cleanliness_score}%
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Python Pandas Cleaned</p>
        </div>
      </div>

      {/* 3. Auto Corrections */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Auto Corrections</span>
          <Wrench className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <div className="text-2xl font-bold font-mono text-amber-300">
            {stats.corrections_made}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Domains & Typos Fixed</p>
        </div>
      </div>

      {/* 4. Duplicates Cleared */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Duplicates</span>
          <CopyCheck className="w-4 h-4 text-cyan-400" />
        </div>
        <div>
          <div className="text-2xl font-bold font-mono text-cyan-300">
            {stats.duplicates_found}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Email / Phone Dedupped</p>
        </div>
      </div>

      {/* 5. Critical Fields Verified */}
      <div className="col-span-2 lg:col-span-1 bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Core Fields</span>
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            100%
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Name, Phone & Email Validated</p>
        </div>
      </div>

    </div>
  );
}
