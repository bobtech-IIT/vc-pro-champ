'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  testApiConnection,
  getOpenRouterKey,
  getCerebrasKey,
  CEREBRAS_MODEL,
  CEREBRAS_ENDPOINT,
  DEFAULT_MODEL,
  DEFAULT_ENDPOINT,
} from '@/lib/api-client';
import {
  Settings,
  Key,
  CheckCircle2,
  XCircle,
  Loader2,
  Zap,
  ExternalLink,
  Save,
  Check,
  Eye,
  EyeOff,
  X,
  AlertTriangle,
  Sparkles,
  Cpu,
  RefreshCw,
} from 'lucide-react';

interface ModelSelectorModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  apiEndpoint: string;
  onApiEndpointChange: (endpoint: string) => void;
  onSaveConfig: () => void;
}

export default function ModelSelectorModal({
  isOpen,
  onOpenChange,
  apiKey,
  onApiKeyChange,
  onModelChange,
  onApiEndpointChange,
  onSaveConfig,
}: ModelSelectorModalProps) {
  const [mounted, setMounted]               = useState(false);
  const [activeTab, setActiveTab]           = useState<'openrouter' | 'cerebras'>('openrouter');
  const [cerebrasKey, setCerebrasKey]       = useState('');
  const [testing, setTesting]               = useState(false);
  const [savedSuccess, setSavedSuccess]     = useState(false);
  const [showOrKey, setShowOrKey]           = useState(false);
  const [showCbKey, setShowCbKey]           = useState(false);
  const [testResult, setTestResult]         = useState<{ success: boolean; message: string } | null>(null);
  const [isConnectionOk, setIsConnectionOk] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Hydrate from localStorage on open
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;
    const savedOrKey = getOpenRouterKey();
    const savedCbKey = getCerebrasKey();
    if (savedOrKey && !apiKey) onApiKeyChange(savedOrKey);
    setCerebrasKey(savedCbKey);
    setIsConnectionOk(!!savedOrKey);
    // Ensure hardcoded values are always in state
    onModelChange(DEFAULT_MODEL);
    onApiEndpointChange(DEFAULT_ENDPOINT);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const hasOrKey = !!apiKey.trim();

  const handleSaveAndClose = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('vcpro_api_key',        apiKey.trim());
      localStorage.setItem('vcpro_openrouter_key', apiKey.trim());
      localStorage.setItem('vcpro_cerebras_key',   cerebrasKey.trim());
      // Always persist canonical values
      localStorage.setItem('vcpro_selected_model', DEFAULT_MODEL);
      localStorage.setItem('vcpro_api_endpoint',   DEFAULT_ENDPOINT);
    }
    onSaveConfig();
    setSavedSuccess(true);
    setIsConnectionOk(!!apiKey.trim());
    setTimeout(() => {
      setSavedSuccess(false);
      onOpenChange(false);
    }, 700);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await testApiConnection(apiKey, DEFAULT_MODEL, DEFAULT_ENDPOINT);
    setTestResult(result);
    setIsConnectionOk(result.success);
    if (result.success && typeof window !== 'undefined') {
      localStorage.setItem('vcpro_api_key',        apiKey.trim());
      localStorage.setItem('vcpro_openrouter_key', apiKey.trim());
    }
    setTesting(false);
  };

  // ─── Modal Content ────────────────────────────────────────────────────────────
  const modalContent = isOpen ? (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      {/* Backdrop */}
      <div className="absolute inset-0 z-0" onClick={() => onOpenChange(false)} />

      <div className="bg-slate-900 border border-slate-700/90 rounded-3xl p-5 sm:p-6 w-full max-w-lg shadow-2xl relative text-slate-100 my-auto z-10 max-h-[90vh] overflow-y-auto space-y-5">

        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30">
              <Settings className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2 flex-wrap">
                AI Engine Settings
                <span className={`inline-flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                  isConnectionOk
                    ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-950/60 border-amber-500/30 text-amber-300'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isConnectionOk ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-pulse'}`} />
                  {isConnectionOk ? 'Ready to Scan' : 'Key Required'}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                OpenRouter powers vision. Cerebras adds ultra-fast AI text cleanup.
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer border border-slate-700 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Provider Tabs ── */}
        <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          {([
            { id: 'openrouter', icon: '⚡', label: 'OpenRouter', sub: 'Primary Vision', required: true },
            { id: 'cerebras',   icon: '🧠', label: 'Cerebras',   sub: 'AI Text Cleanup', required: false },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setTestResult(null); }}
              className={`py-2.5 px-3 rounded-lg transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <span className="text-xs font-bold">{tab.icon} {tab.label}</span>
              <span className="text-[10px] opacity-75 flex items-center gap-1">
                {tab.sub}
                {tab.required && <span className="text-rose-400 font-bold">•</span>}
              </span>
            </button>
          ))}
        </div>

        {/* ── OpenRouter Panel ── */}
        {activeTab === 'openrouter' && (
          <div className="space-y-4">

            {/* Info card */}
            <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold">
                <Sparkles className="w-4 h-4" />
                openrouter/free — Smart Free Vision Router
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                OpenRouter&apos;s built-in smart router that automatically picks an available free vision
                model for your request — one that supports image understanding. Zero cost. Requires a
                free API key.
              </p>
              <div className="flex flex-wrap gap-2 text-[10px] font-mono text-slate-500">
                <span className="bg-slate-800 px-2 py-0.5 rounded-md">openrouter.ai/api/v1</span>
                <span className="bg-slate-800 px-2 py-0.5 rounded-md">model: openrouter/free</span>
              </div>
            </div>

            {/* Missing key warning */}
            {!hasOrKey && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs leading-relaxed">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <span>
                  <strong>API key required to scan cards.</strong> Get your free OpenRouter key at{' '}
                  <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer"
                    className="underline text-amber-300 hover:text-amber-100">openrouter.ai/keys</a>
                  {' '}— no credit card needed.
                </span>
              </div>
            )}

            {/* Key field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-amber-400" />
                  OpenRouter API Key
                  <span className="text-rose-400 font-bold text-[10px] ml-1">REQUIRED</span>
                </label>
                <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer"
                  className="text-[11px] text-indigo-400 hover:text-indigo-200 hover:underline flex items-center gap-0.5">
                  Get Free Key <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="relative">
                <input
                  type={showOrKey ? 'text' : 'password'}
                  placeholder="sk-or-v1-... (free, no credit card required)"
                  value={apiKey}
                  onChange={(e) => { onApiKeyChange(e.target.value); setTestResult(null); setIsConnectionOk(false); }}
                  className={`w-full bg-slate-950 border text-white placeholder-slate-500 rounded-xl pl-3.5 pr-10 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 transition-colors ${
                    hasOrKey
                      ? 'border-emerald-600/50 focus:ring-emerald-500/30'
                      : 'border-amber-500/50 focus:ring-amber-500/30'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowOrKey(!showOrKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showOrKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Retry behaviour info */}
            <div className="flex items-center gap-2 text-[10px] text-slate-500 bg-slate-950/60 px-3 py-2.5 rounded-xl border border-slate-800">
              <RefreshCw className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
              <span>
                Auto-retries <strong className="text-slate-400">3×</strong> with a 2-second delay if free
                vision models are temporarily at capacity.
              </span>
            </div>
          </div>
        )}

        {/* ── Cerebras Panel ── */}
        {activeTab === 'cerebras' && (
          <div className="space-y-4">

            {/* Info card */}
            <div className="bg-orange-950/30 border border-orange-500/20 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-orange-300 text-xs font-semibold">
                <Cpu className="w-4 h-4" />
                Cerebras gpt-oss-120b — Stage 2 Text Cleanup
                <span className="text-[10px] bg-orange-500/15 text-orange-300 px-1.5 py-0.5 rounded font-normal border border-orange-500/20">
                  Optional
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                After OpenRouter extracts raw text from the card image, Cerebras validates, removes
                OCR artifacts, and structures the JSON at{' '}
                <strong className="text-orange-300">~3,000 tokens/sec</strong>.
                Text-only processing — no image capability needed.
              </p>
              <div className="flex flex-wrap gap-2 text-[10px] font-mono text-slate-500">
                <span className="bg-slate-800 px-2 py-0.5 rounded-md">api.cerebras.ai/v1</span>
                <span className="bg-slate-800 px-2 py-0.5 rounded-md">model: gpt-oss-120b</span>
              </div>
            </div>

            {/* Cerebras key field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-orange-400" />
                  Cerebras API Key
                </label>
                <a href="https://cloud.cerebras.ai/" target="_blank" rel="noopener noreferrer"
                  className="text-[11px] text-indigo-400 hover:text-indigo-200 hover:underline flex items-center gap-0.5">
                  Get Cerebras Key <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="relative">
                <input
                  type={showCbKey ? 'text' : 'password'}
                  placeholder="Leave blank to skip Stage 2 cleanup"
                  value={cerebrasKey}
                  onChange={(e) => setCerebrasKey(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white placeholder-slate-500 rounded-xl pl-3.5 pr-10 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                />
                <button
                  type="button"
                  onClick={() => setShowCbKey(!showCbKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showCbKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Pipeline diagram */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-slate-300">Two-Stage Extraction Pipeline</p>
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-300 text-[10px] flex items-center justify-center font-bold shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <p className="text-[11px] text-slate-300 font-medium">OpenRouter Vision</p>
                    <p className="text-[10px] text-slate-500">Card image → raw text extraction using free vision AI</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pl-3">
                  <div className="w-px h-4 bg-slate-700" />
                  <span className="text-[10px] text-slate-600">↓ passes raw text</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-orange-600/30 text-orange-300 text-[10px] flex items-center justify-center font-bold shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <p className="text-[11px] text-slate-300 font-medium">Cerebras gpt-oss-120b</p>
                    <p className="text-[10px] text-slate-500">Validates emails/phones, removes artifacts, structures clean JSON</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Footer Actions ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
          {/* Test button — only on OpenRouter tab */}
          {activeTab === 'openrouter' ? (
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || !hasOrKey}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/20 transition-all"
            >
              {testing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 text-amber-300" />
              )}
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAndClose}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 flex items-center gap-1.5 cursor-pointer shadow-lg transition-all"
            >
              {savedSuccess ? (
                <><Check className="w-4 h-4" /><span>Saved!</span></>
              ) : (
                <><Save className="w-4 h-4" /><span>Save & Close</span></>
              )}
            </button>
          </div>
        </div>

        {/* Test Result Banner */}
        {testResult && (
          <div className={`px-4 py-2.5 rounded-xl border text-xs font-mono flex items-start gap-2 transition-all ${
            testResult.success
              ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/50 border-rose-500/40 text-rose-300'
          }`}>
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            <span className="leading-relaxed">{testResult.message}</span>
          </div>
        )}
      </div>
    </div>
  ) : null;

  // ─── Trigger Button (rendered in header) ──────────────────────────────────────
  return (
    <>
      <button
        onClick={() => onOpenChange(true)}
        className="px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-xs font-semibold flex items-center gap-2.5 transition-all shadow-md cursor-pointer hover:border-slate-600"
        title="Configure AI Engine & API Keys"
      >
        <Settings className="w-4 h-4 text-indigo-400 animate-spin-slow" />
        <span className="hidden sm:inline">Settings</span>

        {/* Live status LED */}
        <div className="relative flex items-center justify-center w-3 h-3">
          <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${
            isConnectionOk ? 'bg-emerald-400' : 'bg-amber-400'
          }`} />
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 shadow-lg ${
            isConnectionOk
              ? 'bg-emerald-500 shadow-emerald-500/80'
              : 'bg-amber-500 shadow-amber-500/80'
          }`} />
        </div>
      </button>

      {mounted && modalContent && createPortal(modalContent, document.body)}
    </>
  );
}
