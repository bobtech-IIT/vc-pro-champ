'use client';

import React from 'react';
import Link from 'next/link';
import { CreditCard, Smartphone, MessageSquare, FlaskConical } from 'lucide-react';
import ModelSelectorModal from './ModelSelectorModal';

interface HeaderProps {
  onInstallPwa?: () => void;
  canInstallPwa?: boolean;
  isSettingsOpen: boolean;
  onOpenSettingsChange: (open: boolean) => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  apiEndpoint: string;
  onApiEndpointChange: (endpoint: string) => void;
  onSaveConfig: () => void;
  onOpenQuickConnect: () => void;
  hasCards: boolean;
}

export default function Header({
  onInstallPwa,
  canInstallPwa,
  isSettingsOpen,
  onOpenSettingsChange,
  selectedModel,
  onModelChange,
  apiKey,
  onApiKeyChange,
  apiEndpoint,
  onApiEndpointChange,
  onSaveConfig,
  onOpenQuickConnect,
  hasCards,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-slate-950/85 border-b border-slate-800/80 px-4 lg:px-8 py-3 flex items-center justify-between">
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
            <span className="px-2 py-0.5 text-[10px] font-bold tracking-wide rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              PWA 2-STAGE AI
            </span>
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">
            Visiting Card AI Scanner & 10-Step EDA Data Audit
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Data Lab Button */}
        <Link href="/datalab"
          className="px-3.5 py-2 rounded-xl bg-violet-950/60 hover:bg-violet-900/80 border border-violet-500/40 text-violet-200 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md"
          title="Open Data Lab — EDA, Clean & GTM Export"
        >
          <FlaskConical className="w-4 h-4 text-violet-400" />
          <span className="hidden md:inline">Data Lab</span>
        </Link>

        {/* Quick Connect Generator Button */}
        <button
          onClick={onOpenQuickConnect}
          disabled={!hasCards}
          className="px-3.5 py-2 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-500/40 text-indigo-200 disabled:opacity-40 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
          title="Generate Personalized Quick Connect Welcome Greetings"
        >
          <MessageSquare className="w-4 h-4 text-emerald-400" />
          <span className="hidden md:inline">Quick Connect</span>
        </button>

        {/* Settings Button with Red/Green Breathing Pulse Status Light */}
        <ModelSelectorModal
          isOpen={isSettingsOpen}
          onOpenChange={onOpenOpen => onOpenSettingsChange(onOpenOpen)}
          selectedModel={selectedModel}
          onModelChange={onModelChange}
          apiKey={apiKey}
          onApiKeyChange={onApiKeyChange}
          apiEndpoint={apiEndpoint}
          onApiEndpointChange={onApiEndpointChange}
          onSaveConfig={onSaveConfig}
        />

        {canInstallPwa && (
          <button
            onClick={onInstallPwa}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Smartphone className="w-4 h-4" />
            <span className="hidden sm:inline">Install</span>
          </button>
        )}
      </div>
    </header>
  );
}
