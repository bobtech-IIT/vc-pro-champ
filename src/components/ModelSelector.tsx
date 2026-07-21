'use client';

import React, { useState } from 'react';
import { testApiConnection } from '@/lib/api-client';
import { Key, Cpu, CheckCircle2, XCircle, Loader2, Zap, Globe, ExternalLink, Save, Check } from 'lucide-react';

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
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const activeModelId = isCustomModel ? customModelText : selectedModel;

  const handleSave = () => {
    onSaveConfig();
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
              <span>AI Model / OCR Engine</span>
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
              className="w-full bg-slate-950/90 border border-slate-700/80 text-white rounded-xl px-3.5 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
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

          {/* Custom Model ID Input */}
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
            placeholder="https://openrouter.ai/api/v1"
            value={apiEndpoint}
            onChange={(e) => {
              onApiEndpointChange(e.target.value);
              setTestResult(null);
            }}
            className="w-full bg-slate-950/90 border border-slate-700/80 text-white placeholder-slate-500 rounded-xl px-3.5 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
          />
        </div>

        {/* 3. API Key, Save Button & Test Button */}
        <div>
          <div className="flex items-center justify-between mb-2">
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
              <span>Get Free Key</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="password"
              placeholder={activeModelId === 'tesseract-wasm' ? 'No key required' : 'sk-or-v1-...'}
              disabled={activeModelId === 'tesseract-wasm'}
              value={apiKey}
              onChange={(e) => {
                onApiKeyChange(e.target.value);
                setTestResult(null);
              }}
              className="w-full bg-slate-950/90 border border-slate-700/80 text-white placeholder-slate-500 rounded-xl px-3 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 disabled:opacity-50 transition-all"
            />

            {/* Save Key Button */}
            <button
              onClick={handleSave}
              className={`px-3 py-2.5 rounded-xl text-xs font-semibold text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md ${
                savedSuccess
                  ? 'bg-emerald-600 border border-emerald-400'
                  : 'bg-emerald-700 hover:bg-emerald-600'
              }`}
              title="Save Key to Local Storage"
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

            {/* Test Connection Button */}
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="whitespace-nowrap px-3 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/20 cursor-pointer"
            >
              {testing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
              ) : (
                <Zap className="w-3.5 h-3.5 text-amber-300" />
              )}
              <span>Test</span>
            </button>
          </div>
        </div>

      </div>

      {/* Test Result Feedback */}
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
