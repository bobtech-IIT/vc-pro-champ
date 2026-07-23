'use client';

import React, { useCallback, useRef, useState } from 'react';
import { UploadCloud, FileSpreadsheet, X, AlertCircle, Plus, ArrowRight } from 'lucide-react';
import { parseExcelBuffer, mergeRecords, RawRecord } from '@/lib/eda-engine';

interface UploadedFile { name: string; records: RawRecord[]; size: string; }

interface ExcelUploaderProps {
  onMergeReady: (records: RawRecord[], files: UploadedFile[]) => void;
}

export default function ExcelUploader({ onMergeReady }: ExcelUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(async (incoming: FileList | File[]) => {
    setError(null);
    setLoading(true);
    const newFiles: UploadedFile[] = [];

    for (let i = 0; i < incoming.length; i++) {
      const file = incoming[i];
      const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv');
      if (!isExcel) { setError(`"${file.name}" is not a valid Excel or CSV file.`); continue; }
      if (file.size > 20 * 1024 * 1024) { setError(`"${file.name}" exceeds 20MB limit.`); continue; }

      const buffer = await file.arrayBuffer();
      const records = parseExcelBuffer(buffer, file.name);
      const sizeLabel = file.size > 1024 * 1024
        ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
        : `${(file.size / 1024).toFixed(0)} KB`;

      newFiles.push({ name: file.name, records, size: sizeLabel });
    }

    setLoading(false);
    if (newFiles.length === 0) return;

    const updated = [...files, ...newFiles];
    setFiles(updated);
  }, [files]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files?.length) processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleMerge = () => {
    const merged = mergeRecords(files.map(f => f.records));
    onMergeReady(merged, files);
  };

  const totalRecords = files.reduce((s, f) => s + f.records.length, 0);

  return (
    <div className="space-y-5">
      {/* Drop Zone */}
      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
          isDragging ? 'border-violet-500 bg-violet-950/30 scale-[1.01]' : 'border-slate-700 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-900/60'
        }`}
      >
        <input ref={inputRef} type="file" multiple accept=".xlsx,.xls,.csv" className="hidden"
          onChange={e => e.target.files && processFiles(e.target.files)} />
        <div className="mx-auto w-14 h-14 mb-4 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
          <UploadCloud className="w-7 h-7" />
        </div>
        <h3 className="text-base font-semibold text-white mb-1">Drop Excel / CSV files here</h3>
        <p className="text-xs text-slate-400 mb-3">Upload one or multiple files — all rows will be merged into one dataset</p>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-300 font-mono">
          <span>Supported: .xlsx, .xls, .csv</span>
          <span className="text-slate-600">•</span>
          <span>Max 20MB each</span>
        </div>
        {loading && (
          <div className="absolute inset-0 bg-slate-900/80 rounded-2xl flex items-center justify-center">
            <div className="text-violet-300 text-sm font-semibold animate-pulse">Parsing files...</div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span>
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>{files.length} file{files.length > 1 ? 's' : ''} · <strong className="text-white">{totalRecords.toLocaleString()} records</strong> total</span>
            <button onClick={() => setFiles([])} className="text-rose-400 hover:underline cursor-pointer">Clear All</button>
          </div>

          <div className="space-y-2">
            {files.map((f, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20 shrink-0">
                  <FileSpreadsheet className="w-5 h-5 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{f.name}</p>
                  <p className="text-xs text-slate-400">{f.records.length.toLocaleString()} records · {f.size}</p>
                </div>
                <button onClick={() => removeFile(idx)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Add More */}
          <button onClick={() => inputRef.current?.click()}
            className="w-full py-2.5 rounded-xl border border-dashed border-slate-700 text-slate-400 hover:border-violet-500 hover:text-violet-300 text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-all">
            <Plus className="w-4 h-4" /> Add More Files
          </button>

          {/* Merge CTA */}
          <button onClick={handleMerge}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-violet-600/30 transition-all mt-2">
            <span>Merge & Run EDA Report</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
