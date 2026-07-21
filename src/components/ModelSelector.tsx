'use client';

import React, { useState } from 'react';
import { ModelProvider } from '@/lib/types';
import { testApiConnection } from '@/lib/api-client';
import { Key, Cpu, CheckCircle2, XCircle, Loader2, Zap } from 'lucide-react';

interface ModelSelectorProps {
  selectedModel: ModelProvider;
  onModelChange: (model: ModelProvider) => void;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
}

export default function ModelSelector({
  selectedModel,
  onModelChange,
  apiKey,
  onApiKeyChange,
}: ModelSelectorProps) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await testApiConnection(apiKey, selectedModel);
    setTestResult(result);
    setTesting(false);
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-xl">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        
        {/* Model Selection Dropdown */}
        <div className="w-full md:w-1/2">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <span>Select AI / OCR Engine</span>
          </label>
          <div className="relative">
            <select
              value={selectedModel}
              onChange={(e) => {
                onModelChange(e.target.value as ModelProvider);
                setTestResult(null);
              }}
              className="w-full bg-slate-950/90 border border-slate-700/80 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
            >
              <option value="openrouter/free">⚡ OpenRouter Free (openrouter/free) - Default</option>
              <option value="google/gemini-flash-1.5">✨ Gemini 1.5 Flash (Google Vision)</option>
              <option value="google/gemini-pro-1.5">🚀 Gemini 1.5 Pro (High Accuracy)</option>
              <option value="openai/gpt-4o-mini">🤖 GPT-4o Mini (OpenAI)</option>
              <option value="openai/gpt-4o">🧠 GPT-4o Premium (OpenAI)</option>
              <option value="anthropic/claude-3.5-sonnet">🎯 Claude 3.5 Sonnet (Anthropic)</option>
              <option value="meta-llama/llama-3-70b-instruct">🦙 Llama 3 70B (Groq / Open Source)</option>
              <option value="tesseract-wasm">⚙️ Tesseract WASM (C++ Engine - Offline)</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              ▼
            </div>
          </div>
        </div>

        {/* API Key Input & Test Connection Button */}
        <div className="w-full md:w-1/2 flex flex-col sm:flex-row items-end gap-2.5">
          <div className="w-full">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Key className="w-4 h-4 text-amber-400" />
              <span>API Key (BYOK / OpenRouter)</span>
            </label>
            <input
              type="password"
              placeholder={selectedModel === 'tesseract-wasm' ? 'No key required for WASM' : 'sk-or-v1-...'}
              disabled={selectedModel === 'tesseract-wasm'}
              value={apiKey}
              onChange={(e) => {
                onApiKeyChange(e.target.value);
                setTestResult(null);
              }}
              className="w-full bg-slate-950/90 border border-slate-700/80 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 disabled:opacity-50 transition-all font-mono"
            />
          </div>

          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="w-full sm:w-auto whitespace-nowrap px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer"
          >
            {testing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Testing...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-amber-300" />
                <span>Test Connection</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Test Result Indicator */}
      {testResult && (
        <div
          className={`mt-3.5 px-4 py-2.5 rounded-xl border text-xs font-mono flex items-center gap-2 transition-all ${
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
