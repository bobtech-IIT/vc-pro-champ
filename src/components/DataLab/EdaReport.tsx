'use client';

import React, { useState } from 'react';
import { EdaReport, DuplicateGroup, Anomaly } from '@/lib/eda-engine';
import {
  BarChart2, AlertTriangle, Copy, CheckCircle2, ChevronDown, ChevronUp,
  ArrowRight, Users, Zap, TrendingUp
} from 'lucide-react';

interface EdaReportViewProps {
  report: EdaReport;
  onProceed: () => void;
}

function CompletenessBar({ field, pct }: { field: string; pct: number }) {
  const color = pct >= 90 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-500' : pct >= 40 ? 'bg-orange-500' : 'bg-rose-500';
  const textColor = pct >= 90 ? 'text-emerald-400' : pct >= 70 ? 'text-amber-400' : pct >= 40 ? 'text-orange-400' : 'text-rose-400';
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 text-xs text-slate-400 capitalize shrink-0">{field}</span>
      <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-bold font-mono w-10 text-right ${textColor}`}>{pct}%</span>
    </div>
  );
}

function QualityGauge({ score }: { score: number }) {
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : score >= 40 ? '#f97316' : '#ef4444';
  const label = score >= 80 ? 'High Quality' : score >= 60 ? 'Good' : score >= 40 ? 'Needs Work' : 'Poor Quality';
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="#1e293b" strokeWidth="10" />
        <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 50 50)" style={{ transition: 'stroke-dashoffset 1s ease' }} />
        <text x="50" y="50" textAnchor="middle" dy="0.35em" fill="white" fontSize="20" fontWeight="bold">{score}</text>
      </svg>
      <span className="text-xs font-semibold" style={{ color }}>{label}</span>
    </div>
  );
}

function TopDistribution({ title, data, limit = 5 }: { title: string; data: Record<string, number>; limit?: number }) {
  const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, limit);
  const max = sorted[0]?.[1] || 1;
  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">{title}</p>
      <div className="space-y-1.5">
        {sorted.map(([label, count]) => (
          <div key={label} className="flex items-center gap-2">
            <span className="text-xs text-slate-300 truncate w-32">{label}</span>
            <div className="flex-1 bg-slate-800 rounded-full h-1.5">
              <div className="h-full rounded-full bg-violet-500" style={{ width: `${(count / max) * 100}%` }} />
            </div>
            <span className="text-xs text-slate-500 font-mono w-6 text-right">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function EdaReportView({ report, onProceed }: EdaReportViewProps) {
  const [showAllAnomalies, setShowAllAnomalies] = useState(false);
  const [showAllDupes, setShowAllDupes] = useState(false);

  const visibleAnomalies = showAllAnomalies ? report.anomalies : report.anomalies.slice(0, 5);
  const visibleDupes = showAllDupes ? report.duplicateGroups : report.duplicateGroups.slice(0, 5);

  const severityColors: Record<string, string> = {
    high: 'text-rose-400 bg-rose-950/50 border-rose-500/30',
    medium: 'text-amber-400 bg-amber-950/50 border-amber-500/30',
    low: 'text-slate-400 bg-slate-800 border-slate-700',
  };

  return (
    <div className="space-y-6">
      {/* Hero Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Records', value: report.totalRecords.toLocaleString(), icon: Users, color: 'text-violet-400', bg: 'bg-violet-500/10' },
          { label: 'Quality Score', value: `${report.overallQualityScore}/100`, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Anomalies', value: report.anomalies.length, icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Duplicates', value: report.duplicateGroups.length, icon: Copy, color: 'text-rose-400', bg: 'bg-rose-500/10' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${bg} border border-white/5`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <p className="text-lg font-bold text-white">{value}</p>
              <p className="text-[10px] text-slate-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {/* Quality Gauge */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col items-center justify-center">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Overall Quality</p>
          <QualityGauge score={report.overallQualityScore} />
          <p className="text-xs text-slate-500 mt-3 text-center">Based on critical field completeness & duplicate density</p>
        </div>

        {/* Completeness Matrix */}
        <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-violet-400" />
            <p className="text-xs font-semibold text-white uppercase tracking-wide">Field Completeness</p>
          </div>
          <div className="space-y-2.5">
            {report.fields.map(field => (
              <CompletenessBar key={field} field={field} pct={report.completenessMatrix[field] ?? 0} />
            ))}
          </div>
        </div>
      </div>

      {/* Distributions */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <TopDistribution title="By Industry" data={report.distributions.industry} />
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <TopDistribution title="By Country" data={report.distributions.country} />
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <TopDistribution title="Top Companies" data={report.distributions.company} />
        </div>
      </div>

      {/* Anomalies */}
      {report.anomalies.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <p className="text-xs font-semibold text-white uppercase tracking-wide">
                Anomalies Found ({report.anomalies.length})
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {visibleAnomalies.map((a, i) => (
              <div key={i} className={`flex items-start gap-3 p-2.5 rounded-xl border text-xs ${severityColors[a.severity]}`}>
                <span className="font-bold capitalize shrink-0 w-12">{a.severity}</span>
                <span className="font-medium shrink-0 w-20 truncate">{a.field}</span>
                <span className="font-mono truncate">{a.recordName}</span>
                <span className="ml-auto shrink-0 text-slate-400">{a.issue}</span>
              </div>
            ))}
            {report.anomalies.length > 5 && (
              <button onClick={() => setShowAllAnomalies(!showAllAnomalies)}
                className="w-full text-xs text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1 py-2 cursor-pointer">
                {showAllAnomalies ? <><ChevronUp className="w-3 h-3" />Show Less</> : <><ChevronDown className="w-3 h-3" />Show All {report.anomalies.length}</>}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Duplicates */}
      {report.duplicateGroups.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Copy className="w-4 h-4 text-rose-400" />
            <p className="text-xs font-semibold text-white uppercase tracking-wide">
              Duplicate Groups ({report.duplicateGroups.length})
            </p>
          </div>
          <div className="space-y-2">
            {visibleDupes.map((d, i) => (
              <div key={i} className={`p-2.5 rounded-xl border text-xs ${d.confidence === 'definite' ? 'bg-rose-950/40 border-rose-500/30' : 'bg-amber-950/30 border-amber-500/20'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${d.confidence === 'definite' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'}`}>
                    {d.confidence}
                  </span>
                  <span className="text-slate-400">Match on: <strong className="text-slate-300">{d.matchField}</strong></span>
                </div>
                <p className="text-slate-300 truncate">{d.names.join(' · ')}</p>
              </div>
            ))}
            {report.duplicateGroups.length > 5 && (
              <button onClick={() => setShowAllDupes(!showAllDupes)}
                className="w-full text-xs text-slate-400 hover:text-slate-200 flex items-center justify-center gap-1 py-2 cursor-pointer">
                {showAllDupes ? <><ChevronUp className="w-3 h-3" />Show Less</> : <><ChevronDown className="w-3 h-3" />Show All {report.duplicateGroups.length}</>}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Proceed CTA */}
      <button onClick={onProceed}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-violet-600/30 transition-all">
        <Zap className="w-4 h-4 text-amber-300" />
        <span>Run Cleaning Pipeline ({report.totalRecords} Records)</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
