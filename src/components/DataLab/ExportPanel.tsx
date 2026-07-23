'use client';

import React from 'react';
import { CleanedRecord, mapToFreshsales, exportToExcel, exportToCsv } from '@/lib/eda-engine';
import { EnrichmentSuggestion, applyEnrichmentSuggestions } from '@/lib/enrichment-engine';
import {
  Download, FileSpreadsheet, FileText, CheckCircle2, Sparkles,
  TrendingUp, Users, Shield, ExternalLink
} from 'lucide-react';

interface ExportPanelProps {
  records: CleanedRecord[];
  suggestions: EnrichmentSuggestion[];
}

export default function ExportPanel({ records, suggestions }: ExportPanelProps) {
  const finalRecords = applyEnrichmentSuggestions(records, suggestions);
  const freshsalesData = mapToFreshsales(finalRecords);

  const totalChanges = finalRecords.reduce((s, r) => s + (r._changes?.length || 0), 0);
  const accepted = suggestions.filter(s => s.accepted).length;
  const highScore = finalRecords.filter(r => r._lead_score >= 80).length;
  const avgScore = Math.round(finalRecords.reduce((s, r) => s + r._lead_score, 0) / Math.max(finalRecords.length, 1));
  const clean = finalRecords.filter(r => !r._needs_verification).length;

  const handleExcelCleaned = () => exportToExcel(finalRecords.map(r => {
    const { _changes, _needs_verification, _verification_reasons, _id, _row, ...clean } = r;
    return clean;
  }), `vc-pro-cleaned-${Date.now()}.xlsx`);

  const handleExcelFreshsales = () => exportToExcel(freshsalesData, `freshsales-import-${Date.now()}.xlsx`);
  const handleCsvFreshsales = () => exportToCsv(freshsalesData, `freshsales-import-${Date.now()}.csv`);

  const handleExcelHotLeads = () => {
    const hot = finalRecords.filter(r => r._lead_score >= 80);
    exportToExcel(mapToFreshsales(hot), `hot-leads-${Date.now()}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Final Quality Stats */}
      <div className="bg-gradient-to-br from-violet-950/40 via-slate-900 to-indigo-950/40 border border-violet-500/20 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
            <CheckCircle2 className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Data Ready for GTM Pipeline</h3>
            <p className="text-xs text-slate-400">All cleaning and enrichment applied — download your export</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Final Records', value: finalRecords.length, icon: Users, color: 'text-violet-400' },
            { label: 'Avg Lead Score', value: `${avgScore}/100`, icon: TrendingUp, color: 'text-emerald-400' },
            { label: 'Hot Leads (80+)', value: highScore, icon: Sparkles, color: 'text-amber-400' },
            { label: 'Clean Records', value: clean, icon: Shield, color: 'text-indigo-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
              <Icon className={`w-4 h-4 ${color} mb-1.5`} />
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-[10px] text-slate-500">{label}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
            {totalChanges} fields cleaned
          </span>
          <span className="px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300">
            {accepted} AI enrichments applied
          </span>
          <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
            Freshsales-ready format
          </span>
        </div>
      </div>

      {/* Export Options */}
      <div className="grid md:grid-cols-2 gap-4">

        {/* Cleaned Master Excel */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 shrink-0">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Cleaned Master Dataset</h4>
              <p className="text-xs text-slate-400 mt-0.5">All records with cleaned fields, lead scores, and verification flags</p>
            </div>
          </div>
          <div className="text-xs text-slate-500 space-y-0.5">
            <p>✓ E.164 phone numbers</p>
            <p>✓ Validated emails</p>
            <p>✓ Lead scores (0–100)</p>
            <p>✓ Verification flags</p>
          </div>
          <button onClick={handleExcelCleaned}
            className="w-full py-2.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 text-emerald-300 text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all">
            <Download className="w-4 h-4" /> Download Cleaned Excel
          </button>
        </div>

        {/* Freshsales CSV */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 shrink-0">
              <FileText className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Freshsales CRM Import</h4>
              <p className="text-xs text-slate-400 mt-0.5">Pre-mapped to Freshsales field names — import directly</p>
            </div>
          </div>
          <div className="text-xs text-slate-500 space-y-0.5">
            <p>✓ First Name / Last Name split</p>
            <p>✓ Account Name + Job Title</p>
            <p>✓ Mobile + Work Phone</p>
            <p>✓ Industry, Website, Address</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={handleCsvFreshsales}
              className="py-2.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/40 border border-violet-500/30 text-violet-300 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all">
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button onClick={handleExcelFreshsales}
              className="py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-300 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all">
              <Download className="w-3.5 h-3.5" /> Excel
            </button>
          </div>
        </div>

        {/* Hot Leads */}
        {highScore > 0 && (
          <div className="bg-slate-900 border border-amber-500/20 rounded-2xl p-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 shrink-0">
                <Sparkles className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Hot Leads Only (Score 80+)</h4>
                <p className="text-xs text-slate-400 mt-0.5">{highScore} records with complete data — ready for outreach</p>
              </div>
            </div>
            <button onClick={handleExcelHotLeads}
              className="w-full py-2.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/40 border border-amber-500/30 text-amber-300 text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all">
              <Download className="w-4 h-4" /> Download Hot Leads
            </button>
          </div>
        )}

        {/* Freshsales Docs */}
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-slate-700/60 shrink-0">
              <ExternalLink className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Import into Freshsales</h4>
              <p className="text-xs text-slate-400 mt-0.5">Step-by-step guide to import contacts</p>
            </div>
          </div>
          <div className="text-xs text-slate-500 space-y-1">
            <p>1. Open Freshsales → Contacts → Import</p>
            <p>2. Upload the CSV/Excel file above</p>
            <p>3. Column headers auto-map to Freshsales fields</p>
            <p>4. Review mapping → Confirm Import</p>
          </div>
          <a href="https://support.freshsales.io/en/support/solutions/articles/50000002746"
            target="_blank" rel="noopener noreferrer"
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all">
            <ExternalLink className="w-3.5 h-3.5" /> Freshsales Import Guide
          </a>
        </div>
      </div>
    </div>
  );
}
