'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { testApiConnection, PROVIDER_CONFIGS, DEFAULT_ENDPOINT, DEFAULT_MODEL } from '@/lib/api-client';
import { 
  Settings, 
  Key, 
  Cpu, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Zap, 
  Globe, 
  ExternalLink, 
  Save, 
  Check, 
  Eye, 
  EyeOff, 
  X,
  Sparkles,
  Server
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
  selectedModel,
  onModelChange,
  apiKey,
  onApiKeyChange,
  apiEndpoint,
  onApiEndpointChange,
  onSaveConfig,
}: ModelSelectorModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'openrouter' | 'gemini' | 'groq' | 'omniroute' | 'custom'>('openrouter');
  
  const [customModelText, setCustomModelText] = useState(selectedModel || DEFAULT_MODEL);
  const [testing, setTesting] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isConnectionOk, setIsConnectionOk] = useState<boolean>(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Infer provider tab from initial props
  useEffect(() => {
    if (apiEndpoint.includes('googleapis.com')) {
      setActiveTab('gemini');
    } else if (apiEndpoint.includes('groq.com')) {
      setActiveTab('groq');
    } else if (apiEndpoint.includes('localhost:20128') || apiEndpoint.includes('omniroute')) {
      setActiveTab('omniroute');
    } else if (apiEndpoint.includes('openrouter.ai') || !apiEndpoint) {
      setActiveTab('openrouter');
    } else {
      setActiveTab('custom');
    }
  }, [apiEndpoint]);

  const currentProvider = PROVIDER_CONFIGS[activeTab] || PROVIDER_CONFIGS.openrouter;

  const handleTabSwitch = (tabKey: 'openrouter' | 'gemini' | 'groq' | 'omniroute' | 'custom') => {
    setActiveTab(tabKey);
    const config = PROVIDER_CONFIGS[tabKey];
    if (config) {
      onApiEndpointChange(config.defaultEndpoint);
      if (config.models.length > 0 && tabKey !== 'custom') {
        onModelChange(config.models[0].id);
      }
    }
    setTestResult(null);
  };

  const handleSaveAndClose = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSaveConfig();
    if (typeof window !== 'undefined') {
      localStorage.setItem('vcpro_api_key', apiKey);
      localStorage.setItem('vcpro_selected_model', selectedModel);
      localStorage.setItem('vcpro_api_endpoint', apiEndpoint);
    }
    setSavedSuccess(true);
    setIsConnectionOk(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onOpenChange(false);
    }, 800);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await testApiConnection(apiKey, selectedModel, apiEndpoint);
    setTestResult(result);
    setTesting(false);

    if (result.success) {
      setIsConnectionOk(true);
      onSaveConfig();
      if (typeof window !== 'undefined') {
        localStorage.setItem('vcpro_api_key', apiKey);
        localStorage.setItem('vcpro_selected_model', selectedModel);
        localStorage.setItem('vcpro_api_endpoint', apiEndpoint);
      }
    } else {
      setIsConnectionOk(false);
    }
  };

  const modalContent = isOpen ? (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="absolute inset-0 z-0" onClick={() => onOpenChange(false)} />

      <div className="bg-slate-900 border border-slate-700/90 rounded-3xl p-5 sm:p-6 w-full max-w-xl shadow-2xl relative text-slate-100 my-auto z-10 max-h-[90vh] overflow-y-auto space-y-4">
        
        {/* Sticky Header */}
        <div className="sticky top-0 bg-slate-900 z-10 pt-1 pb-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30">
              <Settings className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                AI Engine & Provider Settings
                <div className="flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  <span className={`w-2 h-2 rounded-full ${isConnectionOk ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                  {isConnectionOk ? 'Connected' : 'Configure Provider'}
                </div>
              </h3>
              <p className="text-xs text-slate-400">Select AI Vision Provider, Endpoint URL & API Key.</p>
            </div>
          </div>

          <button
            onClick={() => onOpenChange(false)}
            className="p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-slate-700"
            title="Close Settings Window"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Provider Tabs */}
        <div className="grid grid-cols-5 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-semibold">
          {[
            { id: 'openrouter', label: 'OpenRouter' },
            { id: 'gemini', label: 'Gemini' },
            { id: 'groq', label: 'Groq' },
            { id: 'omniroute', label: 'OmniRoute' },
            { id: 'custom', label: 'Custom' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabSwitch(tab.id as any)}
              className={`py-2 rounded-lg transition-all text-center cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-md font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Config Form Body */}
        <div className="space-y-4 pt-1">
          
          {/* Model Selector for Active Provider */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-indigo-400" />
                <span>AI Vision Model</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Auto Free Model Fallback Active
              </span>
            </label>

            {activeTab !== 'custom' ? (
              <div className="relative">
                <select
                  value={selectedModel}
                  onChange={(e) => {
                    onModelChange(e.target.value);
                    setTestResult(null);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer"
                >
                  {currentProvider.models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                  ▼
                </div>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. openrouter/free or gemini-3.5-flash-lite"
                  value={selectedModel}
                  onChange={(e) => {
                    onModelChange(e.target.value);
                    setTestResult(null);
                  }}
                  className="w-full bg-slate-950 border border-indigo-500 text-white placeholder-slate-500 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* API Endpoint Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-cyan-400" />
              <span>API Endpoint URL</span>
            </label>
            <input
              type="text"
              placeholder={currentProvider.defaultEndpoint}
              value={apiEndpoint}
              onChange={(e) => {
                onApiEndpointChange(e.target.value);
                setTestResult(null);
              }}
              className="w-full bg-slate-950 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>

          {/* API Key Input */}
          <form onSubmit={handleSaveAndClose} className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Key className="w-4 h-4 text-amber-400" />
                <span>API Key</span>
              </label>
              {currentProvider.keyUrl && (
                <a
                  href={currentProvider.keyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-indigo-400 hover:underline flex items-center gap-0.5"
                >
                  <span>Get {currentProvider.name} Key</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <div className="relative">
              <input
                id="provider_api_key_modal"
                name="provider_api_key_modal"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder={activeTab === 'openrouter' ? 'Optional for openrouter/free (or enter sk-or-v1-...)' : 'Enter your provider API key'}
                value={apiKey}
                onChange={(e) => {
                  onApiKeyChange(e.target.value);
                  setTestResult(null);
                }}
                className="w-full bg-slate-950 border border-slate-700 text-white placeholder-slate-500 rounded-xl pl-3.5 pr-10 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Modal Footer Actions */}
            <div className="pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 mt-4">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/20"
              >
                {testing ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Zap className="w-4 h-4 text-amber-300" />
                )}
                <span>Test Connection</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-lg ${
                    savedSuccess
                      ? 'bg-emerald-600 border border-emerald-400'
                      : 'bg-emerald-600 hover:bg-emerald-500'
                  }`}
                >
                  {savedSuccess ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Saved!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save & Close</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Test Result Message */}
        {testResult && (
          <div
            className={`px-4 py-2.5 rounded-xl border text-xs font-mono flex items-center gap-2 transition-all ${
              testResult.success
                ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/50 border-rose-500/40 text-rose-300'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        onClick={() => onOpenChange(true)}
        className="px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-xs font-semibold flex items-center gap-2.5 transition-all shadow-md cursor-pointer hover:border-slate-600"
        title="Configure AI Engine & API Key"
      >
        <Settings className="w-4 h-4 text-indigo-400 animate-spin-slow" />
        <span className="hidden sm:inline">Settings</span>

        <div className="relative flex items-center justify-center w-3 h-3">
          <span
            className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${
              isConnectionOk ? 'bg-emerald-400' : 'bg-rose-500'
            }`}
          />
          <span
            className={`relative inline-flex rounded-full h-2.5 w-2.5 shadow-lg ${
              isConnectionOk 
                ? 'bg-emerald-500 shadow-emerald-500/80' 
                : 'bg-rose-500 shadow-rose-500/80'
            }`}
          />
        </div>
      </button>

      {mounted && modalContent && createPortal(modalContent, document.body)}
    </>
  );
}
