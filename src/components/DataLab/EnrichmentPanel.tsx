'use client';

import React, { useState } from 'react';
import {
  EnrichmentSuggestion, EnrichmentResult, getEnrichmentUsed, INDUSTRY_CATEGORIES
} from '@/lib/enrichment-engine';
import { CleanedRecord } from '@/lib/eda-engine';
import {
  Sparkles, CheckCircle2, XCircle, ChevronDown, ChevronUp,
  ArrowRight, Loader2, Zap, AlertCircle, SkipForward
} from 'lucide-react';
import { getOpenRouterKey } from '@/lib/api-client';

interface EnrichmentPanelProps {
  records: CleanedRecord[];
  onProceed: (records: CleanedRecord[], suggestions: EnrichmentSuggestion[]) => void;
}

const CAP_OPTIONS = [5, 10, 20, 50];

const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300',
  medium: 'bg-amber-950/30 border-amber-500/20 text-amber-300',
  low: 'bg-slate-800 border-slate-700 text-slate-400',
};

export default function EnrichmentPanel({ records, onProceed }: EnrichmentPanelProps) {
  const [cap, setCap] = useState(20);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; current: string } | null>(null);
  const [result, setResult] = useState<EnrichmentResult | null>(null);
  const [suggestions, setSuggestions] = useState<EnrichmentSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);

  const usedSoFar = getEnrichmentUsed();
  const remaining = Math.max(0, cap - usedSoFar);
  const apiKey = getOpenRouterKey();

  const runEnrichment = async () => {
    if (!apiKey) { setError('OpenRouter API key required. Open Settings and add your key.'); return; }
    setError(null);
    setRunning(true);
    setProgress({ done: 0, total: 0, current: 'Starting...' });

    const { enrichRecords } = await import('@/lib/enrichment-engine');
    try {
      const res = await enrichRecords(records, cap, apiKey, (done, total, current) => {
        setProgress({ done, total, current });
      });
      setResult(res);
      setSuggestions(res.suggestions.map(s => ({ ...s, accepted: s.confidence === 'high' })));
    } catch (e: any) {
      setError(e.message || 'Enrichment failed');
    } finally {
      setRunning(false);
      setProgress(null);
    }
  };

  const toggle = (idx: number) => {
    setSuggestions(prev => prev.map((s, i) => i === idx ? { ...s, accepted: !s.accepted } : s));
  };

  const acceptAll = () => setSuggestions(prev => prev.map(s => ({ ...s, accepted: true })));
  const rejectAll = () => setSuggestions(prev => prev.map(s => ({ ...s, accepted: false })));

  const accepted = suggestions.filter(s => s.accepted);
  const fieldCounts: Record<string, number> = {};
  accepted.forEach(s => { fieldCounts[s.field] = (fieldCounts[s.field] || 0) + 1; });

  const handleProceed = () => {
    onProceed(records, suggestions);
  };

  return (
    <div className="space-y-6">
      {/* Configuration */}
      {!result && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <p className="text-sm font-semibold text-white">AI Enrichment Engine</p>
            <span className="ml-auto text-xs text-slate-500 font-mono">{usedSoFar} used today</span>
          </div>

          <p className="text-xs text-slate-400">
            AI will infer missing <strong className="text-slate-200">industry</strong>, <strong className="text-slate-200">country</strong>,
            <strong className="text-slate-200"> website</strong>, and <strong className="text-slate-200">email patterns</strong> from available data.
            Uses your OpenRouter key. Cerebras (if configured) is used for lightning-fast inference.
          </p>

          <div>
            <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide font-semibold">Daily Query Cap</p>
            <div className="flex gap-2">
              {CAP_OPTIONS.map(opt => (
                <button key={opt} onClick={() => setCap(opt)}
                  className={`flex-1 py-2 rounded-xl border text-sm font-bold cursor-pointer transition-all ${cap === opt ? 'bg-violet-600 border-violet-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                  {opt}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-600 mt-1">Remaining today: {remaining} queries</p>
          </div>

          {/* Cap Progress Bar */}
          <div>
            <div className="flex justify-between text-[10px] text-slate-500 mb-1">
              <span>Usage</span><span>{usedSoFar}/{cap}</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5">
              <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${Math.min(100, (usedSoFar / cap) * 100)}%` }} />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={runEnrichment} disabled={running || remaining === 0}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-violet-600/30 transition-all">
              {running ? (
                <><Loader2 className="w-4 h-4 animate-spin" />
                  {progress ? `${progress.current} (${progress.done}/${progress.total})` : 'Running...'}</>
              ) : (
                <><Zap className="w-4 h-4 text-amber-300" />Run AI Enrichment ({Math.min(remaining, records.filter(r => !r.industry || !r.website || !r.country || !r.email).length)} records)</>
              )}
            </button>
            <button onClick={handleProceed}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-semibold flex items-center gap-1.5 cursor-pointer">
              <SkipForward className="w-4 h-4" />Skip
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Suggestions', value: result.suggestions.length, color: 'text-violet-400' },
              { label: 'AI Queries Used', value: result.usedCount, color: 'text-amber-400' },
              { label: 'Accepted', value: accepted.length, color: 'text-emerald-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-[10px] text-slate-500">{label}</p>
              </div>
            ))}
          </div>

          {/* Field breakdown */}
          {Object.entries(fieldCounts).length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {Object.entries(fieldCounts).map(([field, count]) => (
                <span key={field} className="px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-medium">
                  {field}: {count}
                </span>
              ))}
            </div>
          )}

          {/* Suggestion List */}
          {suggestions.length > 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-slate-800">
                <p className="text-xs font-semibold text-white uppercase tracking-wide">Review Suggestions</p>
                <div className="flex gap-2">
                  <button onClick={acceptAll} className="text-xs text-emerald-400 hover:underline cursor-pointer">Accept All</button>
                  <span className="text-slate-600">·</span>
                  <button onClick={rejectAll} className="text-xs text-rose-400 hover:underline cursor-pointer">Reject All</button>
                </div>
              </div>

              <div className="divide-y divide-slate-800 max-h-96 overflow-y-auto">
                {suggestions.map((s, idx) => (
                  <div key={idx} className={`p-4 flex items-start gap-3 transition-colors ${s.accepted ? 'bg-emerald-950/10' : 'bg-transparent'}`}>
                    <button onClick={() => toggle(idx)} className="mt-0.5 cursor-pointer shrink-0">
                      {s.accepted
                        ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        : <XCircle className="w-5 h-5 text-slate-600 hover:text-rose-400" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold text-slate-300 capitalize">{s.field}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${CONFIDENCE_COLORS[s.confidence]}`}>
                          {s.confidence}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-white">{s.suggestedValue}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{s.reasoning}</p>
                    </div>
                    <div className="text-right text-xs text-slate-500 shrink-0">
                      <p className="font-mono text-slate-400 truncate max-w-[100px]">{records.find(r => r._id === s.recordId)?.name || s.recordId}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-slate-500 bg-slate-900 rounded-2xl border border-slate-800">
              <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No enrichment suggestions — your data is already well-filled!</p>
            </div>
          )}

          <button onClick={handleProceed}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-violet-600/30 transition-all">
            <span>Apply {accepted.length} Suggestions & Export</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
