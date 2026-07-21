'use client';

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { FileSpreadsheet, ArrowRight, Check, X, Upload } from 'lucide-react';

interface TemplateMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyMapping: (customHeaders: string[], mapping: Record<string, string>) => void;
}

const STANDARD_FIELDS = [
  { key: 'name', label: 'Name' },
  { key: 'title', label: 'Title / Designation' },
  { key: 'company', label: 'Company Name' },
  { key: 'email', label: 'Email Address' },
  { key: 'mobile', label: 'Mobile Number' },
  { key: 'landline', label: 'Landline Number' },
  { key: 'website', label: 'Website URL' },
  { key: 'address', label: 'Full Address' },
  { key: 'city', label: 'City' },
  { key: 'country', label: 'Country' },
  { key: 'notes', label: 'Notes / Services' },
];

export default function TemplateMappingModal({
  isOpen,
  onClose,
  onApplyMapping,
}: TemplateMappingModalProps) {
  const [templateHeaders, setTemplateHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [fileName, setFileName] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsName = wb.SheetNames[0];
      const ws = wb.Sheets[wsName];
      const data = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });

      if (data && data.length > 0) {
        const headers = data[0].map(h => String(h).trim()).filter(Boolean);
        setTemplateHeaders(headers);

        // Auto-map matching names
        const autoMap: Record<string, string> = {};
        STANDARD_FIELDS.forEach(field => {
          const match = headers.find(h => 
            h.toLowerCase().includes(field.label.toLowerCase()) || 
            h.toLowerCase().includes(field.key)
          );
          if (match) {
            autoMap[field.key] = match;
          } else {
            autoMap[field.key] = headers[0] || '';
          }
        });
        setMapping(autoMap);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSave = () => {
    if (templateHeaders.length === 0) return;
    onApplyMapping(templateHeaders, mapping);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-white font-semibold text-base">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <span>Map Custom Excel Template</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {templateHeaders.length === 0 ? (
          <div className="border-2 border-dashed border-slate-800 bg-slate-950/50 rounded-2xl p-8 text-center">
            <Upload className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <h4 className="text-sm font-semibold text-white mb-1">
              Upload Predefined Excel Template
            </h4>
            <p className="text-xs text-slate-400 mb-4">
              Select an .xlsx or .csv file to extract custom column headers.
            </p>
            <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer shadow-lg shadow-emerald-600/20 transition-all">
              <span>Choose Excel File</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-3 bg-slate-950 py-2 px-3 rounded-lg border border-slate-800">
              <span>Template File: <strong className="text-white">{fileName}</strong></span>
              <span>{templateHeaders.length} Headers Found</span>
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {STANDARD_FIELDS.map((field) => (
                <div
                  key={field.key}
                  className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 text-xs"
                >
                  <span className="text-slate-300 font-medium">{field.label}</span>
                  <ArrowRight className="w-4 h-4 text-slate-500 shrink-0 mx-2" />
                  <select
                    value={mapping[field.key] || ''}
                    onChange={(e) =>
                      setMapping({ ...mapping, [field.key]: e.target.value })
                    }
                    className="bg-slate-900 border border-slate-700 text-emerald-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">-- Leave Unmapped --</option>
                    {templateHeaders.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                onClick={() => setTemplateHeaders([])}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Change File
              </button>
              <button
                onClick={handleSave}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 flex items-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Apply Template Mapping</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
