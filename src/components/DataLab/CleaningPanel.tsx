'use client';

import React, { useState } from 'react';
import { CleanedRecord, CleanChange } from '@/lib/eda-engine';
import {
  CheckCircle2, XCircle, ChevronDown, ChevronUp, Sparkles,
  ArrowRight, AlertTriangle, Shield
} from 'lucide-react';

interface CleaningPanelProps {
  records: CleanedRecord[];
  onProceed: (records: CleanedRecord[]) => void;
}

interface RuleGroup {
  rule: string;
  count: number;
  examples: { name: string; field: string; before: string; after: string }[];
}

function groupByRule(records: CleanedRecord[]): RuleGroup[] {
  const map: Record<string, RuleGroup> = {};
  records.forEach(r => {
    (r._changes || []).forEach((c: CleanChange) => {
      if (!map[c.rule]) map[c.rule] = { rule: c.rule, count: 0, examples: [] };
      map[c.rule].count++;
      if (map[c.rule].examples.length < 3) {
        map[c.rule].examples.push({ name: r.name || r._id, field: c.field, before: c.before, after: c.after });
      }
    });
  });
  return Object.values(map).sort((a, b) => b.count - a.count);
}

export default function CleaningPanel({ records, onProceed }: CleaningPanelProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filterVerify, setFilterVerify] = useState(false);

  const totalChanges = records.reduce((s, r) => s + (r._changes?.length || 0), 0);
  const needsVerification = records.filter(r => r._needs_verification);
  const ruleGroups = groupByRule(records);
  const avgScore = Math.round(records.reduce((s, r) => s + r._lead_score, 0) / Math.max(records.length, 1));

  const displayRecords = filterVerify ? needsVerification : records;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Records Cleaned', value: records.length.toLocaleString(), color: 'text-violet-400' },
          { label: 'Total Changes', value: totalChanges.toLocaleString(), color: 'text-emerald-400' },
          { label: 'Needs Verification', value: needsVerification.length, color: 'text-amber-400' },
          { label: 'Avg Lead Score', value: `${avgScore}/100`, color: 'text-indigo-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Cleaning Rules Applied */}
      {ruleGroups.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <p className="text-xs font-semibold text-white uppercase tracking-wide">Cleaning Rules Applied</p>
            <span className="ml-auto text-xs text-slate-500">{ruleGroups.length} rules</span>
          </div>

          <div className="space-y-2">
            {ruleGroups.map(group => (
              <div key={group.rule} className="bg-slate-800/60 rounded-xl border border-slate-700/60 overflow-hidden">
                <button
                  onClick={() => setExpanded(expanded === group.rule ? null : group.rule)}
                  className="w-full flex items-center gap-3 p-3 cursor-pointer text-left"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-sm text-white font-medium flex-1">{group.rule}</span>
                  <span className="text-xs font-mono text-slate-400 px-2 py-0.5 bg-slate-700 rounded-full">{group.count} records</span>
                  {expanded === group.rule ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {expanded === group.rule && (
                  <div className="px-3 pb-3 space-y-1.5 border-t border-slate-700/60 pt-3">
                    {group.examples.map((ex, i) => (
                      <div key={i} className="grid grid-cols-[auto_1fr_auto_1fr] gap-2 items-center text-xs px-2 py-1.5 bg-slate-900 rounded-lg">
                        <span className="text-slate-500 capitalize w-14 truncate">{ex.field}</span>
                        <span className="text-rose-300 font-mono truncate">{ex.before || '(empty)'}</span>
                        <span className="text-slate-500">→</span>
                        <span className="text-emerald-300 font-mono truncate">{ex.after || '(empty)'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verification Queue */}
      {needsVerification.length > 0 && (
        <div className="bg-slate-900 border border-amber-500/20 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <p className="text-xs font-semibold text-white uppercase tracking-wide">
                Verification Queue ({needsVerification.length})
              </p>
            </div>
            <button
              onClick={() => setFilterVerify(!filterVerify)}
              className={`text-xs px-2.5 py-1 rounded-full border cursor-pointer transition-all ${filterVerify ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
            >
              {filterVerify ? 'Showing flagged' : 'Filter flagged'}
            </button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {(filterVerify ? needsVerification : needsVerification.slice(0, 8)).map(r => (
              <div key={r._id} className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/20">
                <p className="text-sm font-medium text-white">{r.name || '(no name)'} · <span className="text-slate-400 text-xs">{r.company}</span></p>
                <p className="text-xs text-amber-300 mt-0.5">{r._verification_reasons?.join(' · ')}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lead Score Distribution */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-indigo-400" />
          <p className="text-xs font-semibold text-white uppercase tracking-wide">Lead Score Distribution</p>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { label: '80–100', desc: 'Hot', count: records.filter(r => r._lead_score >= 80).length, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
            { label: '60–79', desc: 'Warm', count: records.filter(r => r._lead_score >= 60 && r._lead_score < 80).length, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
            { label: '40–59', desc: 'Cool', count: records.filter(r => r._lead_score >= 40 && r._lead_score < 60).length, color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
            { label: '0–39', desc: 'Cold', count: records.filter(r => r._lead_score < 40).length, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
          ].map(({ label, desc, count, color }) => (
            <div key={label} className={`rounded-xl border p-3 ${color}`}>
              <p className="text-xl font-bold">{count}</p>
              <p className="text-[10px] font-semibold">{desc}</p>
              <p className="text-[9px] opacity-70 font-mono">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <button onClick={() => onProceed(records)}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-violet-600/30 transition-all">
        <Sparkles className="w-4 h-4 text-amber-300" />
        <span>Proceed to AI Enrichment</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
