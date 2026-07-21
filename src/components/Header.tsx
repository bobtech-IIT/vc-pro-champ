'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, Download, Smartphone, Sparkles } from 'lucide-react';

interface HeaderProps {
  onInstallPwa?: () => void;
  canInstallPwa?: boolean;
}

export default function Header({ onInstallPwa, canInstallPwa }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80 px-4 lg:px-8 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="relative p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 text-white shadow-lg shadow-indigo-500/20">
          <CreditCard className="w-6 h-6" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-mono tracking-wider bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
              VC PRO
            </h1>
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              PWA 2-STAGE AI
            </span>
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">
            Visiting Card AI Extraction & Deep 10-Step Data Cleaning
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {canInstallPwa && (
          <button
            onClick={onInstallPwa}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 shadow-md shadow-emerald-600/20 transition-all duration-200 cursor-pointer"
          >
            <Smartphone className="w-4 h-4" />
            <span>Install App</span>
          </button>
        )}

        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-300">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span>Stage 1: WASM/Vision AI</span>
          <span className="text-slate-600">•</span>
          <span>Stage 2: Python Audit</span>
        </div>
      </div>
    </header>
  );
}
