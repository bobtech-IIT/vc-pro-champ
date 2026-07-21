'use client';

import React from 'react';
import { ShieldCheck, X, CheckCircle2, AlertCircle } from 'lucide-react';

interface AuditSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditLogs: string[];
  cleanlinessScore: number;
}

export default function AuditSummaryModal({
  isOpen,
  onClose,
  auditLogs,
  cleanlinessScore,
}: AuditSummaryModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-white font-semibold text-base">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>Stage 2 Deep Audit Summary</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 mb-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block uppercase tracking-wider">Overall Cleanliness</span>
            <span className="text-2xl font-bold font-mono text-emerald-400">{cleanlinessScore}%</span>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block uppercase tracking-wider">Passed Checks</span>
            <span className="text-xs font-mono text-slate-300">10 / 10 Active Audits</span>
          </div>
        </div>

        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
          Automated Audit Logs & Fixes ({auditLogs.length}):
        </h4>

        <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800/80 max-h-56 overflow-y-auto space-y-2 font-mono text-xs text-slate-300">
          {auditLogs.length === 0 ? (
            <div className="flex items-center gap-2 text-emerald-400 py-4 justify-center">
              <CheckCircle2 className="w-4 h-4" />
              <span>100% Error-free. No anomalies or typos found!</span>
            </div>
          ) : (
            auditLogs.map((log, i) => (
              <div key={i} className="flex items-start gap-2 text-amber-300/90 border-b border-slate-900 pb-1.5 last:border-0">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>{log}</span>
              </div>
            ))
          )}
        </div>

        <div className="mt-5 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg cursor-pointer"
          >
            Close Summary
          </button>
        </div>
      </div>
    </div>
  );
}
