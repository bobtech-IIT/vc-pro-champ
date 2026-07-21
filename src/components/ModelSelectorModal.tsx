'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { testApiConnection } from '@/lib/api-client';
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
  X 
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

const PRESET_MODELS = [
  { id: 'openrouter/free', label: '⚡ openrouter/free (Auto Free Models - Default)' },
  { id: 'openrouter/auto', label: '🤖 openrouter/auto (Auto Best Match)' },
  { id: 'google/gemini-2.0-flash-exp:free', label: '✨ google/gemini-2.0-flash-exp:free' },
  { id: 'meta-llama/llama-3.2-90b-vision-instruct:free', label: '🦙 meta-llama/llama-3.2-90b-vision-instruct:free' },
  { id: 'mistralai/pixtral-12b:free', label: '🎯 mistralai/pixtral-12b:free' },
  { id: 'google/gemini-flash-1.5', label: '✨ google/gemini-flash-1.5' },
  { id: 'openai/gpt-4o-mini', label: '🤖 openai/gpt-4o-mini' },
  { id: 'openai/gpt-4o', label: '🧠 openai/gpt-4o' },
  { id: 'anthropic/claude-3.5-sonnet', label: '🎭 anthropic/claude-3.5-sonnet' },
  { id: 'tesseract-wasm', label: '⚙️ Tesseract WASM (C++ Engine - Offline)' },
  { id: 'custom', label: '✏️ Custom Model ID (Type manually...)' },
];

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
  const [isCustomModel, setIsCustomModel] = useState(
    !PRESET_MODELS.some(m => m.id === selectedModel && m.id !== 'custom')
  );
  const [customModelText, setCustomModelText] = useState(
    PRESET_MODELS.some(m => m.id === selectedModel) ? '' : selectedModel
  );

  const [testing, setTesting] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Status Light state: green if connected/has key, red if unconfigured
  const [isConnectionOk, setIsConnectionOk] = useState<boolean>(false);

  const activeModelId = isCustomModel ? customModelText : selectedModel;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (selectedModel === 'tesseract-wasm' || (apiKey && apiKey.trim().length > 5)) {
      setIsConnectionOk(true);
    } else {
      setIsConnectionOk(false);
    }
  }, [apiKey, selectedModel]);

  const handleSaveAndClose = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSaveConfig();
    if (typeof window !== 'undefined') {
      localStorage.setItem('vcpro_api_key', apiKey);
      localStorage.setItem('vcpro_selected_model', activeModelId);
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
    const result = await testApiConnection(apiKey, activeModelId, apiEndpoint);
    setTestResult(result);
    setTesting(false);

    if (result.success) {
      setIsConnectionOk(true);
      onSaveConfig();
      if (typeof window !== 'undefined') {
        localStorage.setItem('vcpro_api_key', apiKey);
        localStorage.setItem('vcpro_selected_model', activeModelId);
        localStorage.setItem('vcpro_api_endpoint', apiEndpoint);
      }
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);
    } else {
      setIsConnectionOk(false);
    }
  };

  const modalContent = isOpen ? (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      {/* Backdrop Click Listener */}
      <div 
        className="absolute inset-0 z-0" 
        onClick={() => onOpenChange(false)} 
      />

      <div className="bg-slate-900 border border-slate-700/90 rounded-3xl p-5 sm:p-6 w-full max-w-xl shadow-2xl relative text-slate-100 my-auto z-10 max-h-[90vh] overflow-y-auto space-y-4">
        
        {/* Modal Sticky Header */}
        <div className="sticky top-0 bg-slate-900 z-10 pt-1 pb-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30">
              <Settings className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                AI Engine & API Settings
                <div className="flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  <span className={`w-2 h-2 rounded-full ${isConnectionOk ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                  {isConnectionOk ? 'Connected' : 'Action Needed'}
                </div>
              </h3>
              <p className="text-xs text-slate-400">Configure AI model provider, Endpoint URL, and API key.</p>
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

        {/* Config Form Body */}
        <div className="space-y-4 pt-1">
          
          {/* 1. Model Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <span>AI Model / OCR Engine</span>
            </label>
            <div className="relative">
              <select
                value={isCustomModel ? 'custom' : selectedModel}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'custom') {
                    setIsCustomModel(true);
                  } else {
                    setIsCustomModel(false);
                    onModelChange(val);
                  }
                  setTestResult(null);
                }}
                className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer"
              >
                {PRESET_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">
                ▼
              </div>
            </div>

            {isCustomModel && (
              <div className="mt-2 relative">
                <input
                  type="text"
                  placeholder="e.g. openrouter/free"
                  value={customModelText}
                  onChange={(e) => {
                    setCustomModelText(e.target.value);
                    onModelChange(e.target.value);
                    setTestResult(null);
                  }}
                  className="w-full bg-slate-950 border border-indigo-500 text-white placeholder-slate-500 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-indigo-400 font-mono">Custom ID</span>
              </div>
            )}
          </div>

          {/* 2. API Endpoint Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-cyan-400" />
              <span>API Endpoint URL</span>
            </label>
            <input
              type="text"
              placeholder="https://openrouter.ai/api/v1"
              value={apiEndpoint}
              onChange={(e) => {
                onApiEndpointChange(e.target.value);
                setTestResult(null);
              }}
              className="w-full bg-slate-950 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>

          {/* 3. API Key & Form */}
          <form onSubmit={handleSaveAndClose} className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Key className="w-4 h-4 text-amber-400" />
                <span>API Key</span>
              </label>
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-indigo-400 hover:underline flex items-center gap-0.5"
              >
                <span>Get Free OpenRouter Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="relative">
              <input
                id="openrouter_api_key_modal"
                name="openrouter_api_key_modal"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder={activeModelId === 'tesseract-wasm' ? 'No key required' : 'sk-or-v1-...'}
                disabled={activeModelId === 'tesseract-wasm'}
                value={apiKey}
                onChange={(e) => {
                  onApiKeyChange(e.target.value);
                  setTestResult(null);
                }}
                className="w-full bg-slate-950 border border-slate-700 text-white placeholder-slate-500 rounded-xl pl-3.5 pr-10 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-50"
              />
              {activeModelId !== 'tesseract-wasm' && (
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              )}
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
      {/* Settings Header Button */}
      <button
        onClick={() => onOpenChange(true)}
        className="px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-xs font-semibold flex items-center gap-2.5 transition-all shadow-md cursor-pointer hover:border-slate-600"
        title="Configure AI Model & API Key"
      >
        <Settings className="w-4 h-4 text-indigo-400 animate-spin-slow" />
        <span className="hidden sm:inline">Settings</span>

        {/* Breathing Status LED */}
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

      {/* Render Modal into document.body using Portal */}
      {mounted && modalContent && createPortal(modalContent, document.body)}
    </>
  );
}
