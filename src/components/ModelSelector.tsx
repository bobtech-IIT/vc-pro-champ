'use client';

import React, { useState } from 'react';
import { testApiConnection, DEFAULT_ENDPOINT } from '@/lib/api-client';
import { Key, Cpu, CheckCircle2, XCircle, Loader2, Zap, Globe, Save, Check, Eye, EyeOff } from 'lucide-react';

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  apiEndpoint: string;
  onApiEndpointChange: (endpoint: string) => void;
  onSaveConfig: () => void;
}

const PRESET_MODELS = [
  { id: 'openrouter/free', label: '⚡ openrouter/free (Auto Free Vision Models)' },
  { id: 'google/gemini-3.5-flash-lite', label: '✨ google/gemini-3.5-flash-lite' },
  { id: 'google/gemini-2.0-flash-exp:free', label: '✨ google/gemini-2.0-flash-exp:free' },
  { id: 'meta-llama/llama-3.2-11b-vision-instruct:free', label: '🦙 meta-llama/llama-3.2-11b-vision-instruct:free' },
  { id: 'llama-3.2-11b-vision-preview', label: '⚡ llama-3.2-11b-vision-preview (Groq)' },
  { id: 'openai/gpt-4o-mini', label: '🤖 openai/gpt-4o-mini' },
  { id: 'openai/gpt-4o', label: '🧠 openai/gpt-4o' },
  { id: 'custom', label: '✏️ Custom Model ID (Type manually...)' },
];

export default function ModelSelector({
  selectedModel,
  onModelChange,
  apiKey,
  onApiKeyChange,
  apiEndpoint,
  onApiEndpointChange,
  onSaveConfig,
}: ModelSelectorProps) {
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

  const activeModelId = isCustomModel ? customModelText : selectedModel;

  const handleSaveSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSaveConfig();
    if (typeof window !== 'undefined') {
      localStorage.setItem('vcpro_api_key', apiKey);
      localStorage.setItem('vcpro_selected_model', activeModelId);
      localStorage.setItem('vcpro_api_endpoint', apiEndpoint);
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await testApiConnection(apiKey, activeModelId, apiEndpoint);
    setTestResult(result);
    setTesting(false);
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* 1. Model Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <span>AI Vision Engine</span>
            </span>
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
              className="w-full bg-slate-950/90 border border-slate-700/80 text-white rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none cursor-pointer"
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
                className="w-full bg-slate-950 border border-indigo-500/80 text-white placeholder-slate-500 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-indigo-400 font-mono">Custom</span>
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
            placeholder={DEFAULT_ENDPOINT}
            value={apiEndpoint}
            onChange={(e) => {
              onApiEndpointChange(e.target.value);
              if (typeof window !== 'undefined') localStorage.setItem('vcpro_api_endpoint', e.target.value);
              setTestResult(null);
            }}
            className="w-full bg-slate-950/90 border border-slate-700/80 text-white placeholder-slate-500 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
        </div>

        {/* 3. API Key & Form */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Key className="w-4 h-4 text-amber-400" />
              <span>API Key</span>
            </label>
          </div>

          <form onSubmit={handleSaveSubmit} className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <input
                id="openrouter_api_key"
                name="openrouter_api_key"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="sk-or-v1-... (or leave empty for openrouter/free)"
                value={apiKey}
                onChange={(e) => {
                  const newKey = e.target.value;
                  onApiKeyChange(newKey);
                  if (typeof window !== 'undefined') localStorage.setItem('vcpro_api_key', newKey);
                  setTestResult(null);
                }}
                className="w-full bg-slate-950/90 border border-slate-700/80 text-white placeholder-slate-500 rounded-xl pl-3 pr-8 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            <button
              type="submit"
              className={`px-3 py-2.5 rounded-xl text-xs font-semibold text-white transition-all flex items-center justify-center gap-1 cursor-pointer shadow-md shrink-0 ${
                savedSuccess
                  ? 'bg-emerald-600 border border-emerald-400'
                  : 'bg-emerald-700 hover:bg-emerald-600'
              }`}
            >
              {savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="whitespace-nowrap px-3 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-1 shadow-lg shadow-indigo-600/20 cursor-pointer shrink-0"
            >
              {testing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
              ) : (
                <Zap className="w-3.5 h-3.5 text-amber-300" />
              )}
              <span>Test</span>
            </button>
          </form>
        </div>

      </div>

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
  );
}
