'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FlaskConical, Upload, BarChart2, Sparkles, Wand2, Download,
  CreditCard, ArrowLeft, CheckCircle2
} from 'lucide-react';
import ExcelUploader from '@/components/DataLab/ExcelUploader';
import EdaReportView from '@/components/DataLab/EdaReport';
import CleaningPanel from '@/components/DataLab/CleaningPanel';
import EnrichmentPanel from '@/components/DataLab/EnrichmentPanel';
import ExportPanel from '@/components/DataLab/ExportPanel';
import { RawRecord, generateEdaReport, cleanAllRecords, EdaReport, CleanedRecord } from '@/lib/eda-engine';
import { EnrichmentSuggestion } from '@/lib/enrichment-engine';

type Step = 'upload' | 'eda' | 'clean' | 'enrich' | 'export';

const STEPS: { id: Step; label: string; icon: React.ElementType; desc: string }[] = [
  { id: 'upload', label: 'Upload & Merge', icon: Upload,    desc: 'Import Excel/CSV files' },
  { id: 'eda',    label: 'EDA Report',    icon: BarChart2,  desc: 'Analyse data quality' },
  { id: 'clean',  label: 'Clean Data',    icon: Wand2,      desc: 'Normalize & validate' },
  { id: 'enrich', label: 'AI Enrich',     icon: Sparkles,   desc: 'Fill missing fields' },
  { id: 'export', label: 'GTM Export',    icon: Download,   desc: 'Freshsales-ready output' },
];

const STEP_ORDER: Step[] = ['upload', 'eda', 'clean', 'enrich', 'export'];

function StepIndicator({ current, completed }: { current: Step; completed: Step[] }) {
  return (
    <div className="flex items-center gap-0 w-full overflow-x-auto pb-1">
      {STEPS.map((step, idx) => {
        const isActive = step.id === current;
        const isDone = completed.includes(step.id);
        const Icon = step.icon;
        return (
          <React.Fragment key={step.id}>
            <div className={`flex flex-col items-center min-w-[80px] transition-all`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                isDone ? 'bg-emerald-600 border-emerald-500 text-white' :
                isActive ? 'bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-600/40' :
                'bg-slate-900 border-slate-700 text-slate-500'
              }`}>
                {isDone ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <p className={`text-[10px] font-semibold mt-1 text-center whitespace-nowrap ${
                isActive ? 'text-violet-300' : isDone ? 'text-emerald-400' : 'text-slate-600'
              }`}>{step.label}</p>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mb-5 rounded-full transition-all ${
                completed.includes(STEPS[idx + 1].id) || completed.includes(step.id) ? 'bg-emerald-600' : 'bg-slate-800'
              }`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function DataLabPage() {
  const [step, setStep] = useState<Step>('upload');
  const [completed, setCompleted] = useState<Step[]>([]);
  const [rawRecords, setRawRecords] = useState<RawRecord[]>([]);
  const [edaReport, setEdaReport] = useState<EdaReport | null>(null);
  const [cleanedRecords, setCleanedRecords] = useState<CleanedRecord[]>([]);
  const [finalSuggestions, setFinalSuggestions] = useState<EnrichmentSuggestion[]>([]);

  const advance = (from: Step, to: Step) => {
    setCompleted(prev => prev.includes(from) ? prev : [...prev, from]);
    setStep(to);
  };

  const handleMergeReady = (records: RawRecord[]) => {
    setRawRecords(records);
    const report = generateEdaReport(records);
    setEdaReport(report);
    advance('upload', 'eda');
  };

  const handleEdaProceed = () => {
    const cleaned = cleanAllRecords(rawRecords);
    setCleanedRecords(cleaned);
    advance('eda', 'clean');
  };

  const handleCleanProceed = (records: CleanedRecord[]) => {
    setCleanedRecords(records);
    advance('clean', 'enrich');
  };

  const handleEnrichProceed = (records: CleanedRecord[], suggestions: EnrichmentSuggestion[]) => {
    setCleanedRecords(records);
    setFinalSuggestions(suggestions);
    advance('enrich', 'export');
  };

  const goToStep = (s: Step) => {
    const targetIdx = STEP_ORDER.indexOf(s);
    const currentIdx = STEP_ORDER.indexOf(step);
    // Only allow going back or to completed steps
    if (targetIdx <= currentIdx || completed.includes(s)) setStep(s);
  };

  const stepTitles: Record<Step, string> = {
    upload: 'Upload & Merge Excel Files',
    eda:    'Exploratory Data Analysis Report',
    clean:  'Data Cleaning & Normalisation',
    enrich: 'AI Enrichment — Fill Missing Fields',
    export: 'GTM-Ready Export',
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-slate-950/85 border-b border-slate-800/80 px-4 lg:px-8 py-3 flex items-center gap-4">
        <Link href="/" className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-all flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs font-medium hidden sm:inline">Scanner</span>
        </Link>

        <div className="flex items-center gap-2">
          <div className="relative p-2 rounded-xl bg-gradient-to-tr from-violet-600 via-violet-500 to-indigo-400 text-white shadow-lg shadow-violet-500/20">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold font-mono tracking-wider bg-gradient-to-r from-white via-slate-100 to-violet-300 bg-clip-text text-transparent">
              DATA LAB
            </h1>
            <p className="text-[10px] text-slate-500 hidden sm:block">EDA · Clean · Enrich · GTM Export</p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
          {rawRecords.length > 0 && (
            <span className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-full font-mono">
              {rawRecords.length.toLocaleString()} records
            </span>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Step Indicator */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
          <StepIndicator current={step} completed={completed} />
        </div>

        {/* Step Title */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">{stepTitles[step]}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Step {STEP_ORDER.indexOf(step) + 1} of {STEPS.length}
            </p>
          </div>
          {/* Jump back */}
          {completed.length > 0 && step !== 'upload' && (
            <div className="flex gap-2">
              {STEP_ORDER.slice(0, STEP_ORDER.indexOf(step)).filter(s => completed.includes(s)).map(s => {
                const meta = STEPS.find(st => st.id === s)!;
                const Icon = meta.icon;
                return (
                  <button key={s} onClick={() => goToStep(s)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 text-xs cursor-pointer transition-all">
                    <Icon className="w-3.5 h-3.5" />{meta.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Step Content */}
        <div>
          {step === 'upload' && <ExcelUploader onMergeReady={handleMergeReady} />}
          {step === 'eda' && edaReport && <EdaReportView report={edaReport} onProceed={handleEdaProceed} />}
          {step === 'clean' && cleanedRecords.length > 0 && (
            <CleaningPanel records={cleanedRecords} onProceed={handleCleanProceed} />
          )}
          {step === 'enrich' && cleanedRecords.length > 0 && (
            <EnrichmentPanel records={cleanedRecords} onProceed={handleEnrichProceed} />
          )}
          {step === 'export' && cleanedRecords.length > 0 && (
            <ExportPanel records={cleanedRecords} suggestions={finalSuggestions} />
          )}
        </div>
      </main>
    </div>
  );
}
